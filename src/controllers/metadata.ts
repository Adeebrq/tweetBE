import { Request, Response } from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import pool from '../config/db.js';

dotenv.config();

if (!process.env.PINATA_JWT) {
  console.error('ERROR: PINATA_JWT environment variable is not set!');
  process.exit(1);
}

interface MetadataRequestBody {
  metadata?: {
    name?: string;
    description?: string;
    image?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
    properties?: {
      category?: string;
      external_url?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  tweetId?: string;
  walletAddress?: string;
  tweetData?: {
    tweet_id?: string;
    likes?: number;
    retweets?: number;
    replies?: number;
    view_count?: number;
  };
}

export const uploadMetadata = async (
  req: Request<{}, {}, MetadataRequestBody>,
  res: Response
): Promise<Response> => {
  const client = await pool.connect();
  
  try {
    const { metadata, tweetId, walletAddress, tweetData } = req.body;

    if (!metadata) {
      return res.status(400).json({
        success: false,
        error: 'Metadata is required',
      });
    }

    if (!metadata.name || !metadata.description) {
      return res.status(400).json({
        success: false,
        error: 'Metadata must include name and description',
      });
    }

    // Extract tweet ID from metadata or request body
    const extractedTweetId = 
      tweetId || 
      tweetData?.tweet_id ||
      metadata.attributes?.find((attr: any) => attr.trait_type === 'Tweet ID')?.value;

    if (!extractedTweetId) {
      return res.status(400).json({
        success: false,
        error: 'Tweet ID is required',
      });
    }

    console.log('📝 Checking if tweet already exists:', extractedTweetId);

    // Check if tweet already exists
    const existingTweet = await client.query(
      'SELECT tweet_id, mint_address, metadata_uri FROM tweets WHERE tweet_id = $1',
      [extractedTweetId]
    );

    if (existingTweet.rows.length > 0) {
      console.log('⚠️ Tweet already minted:', existingTweet.rows[0]);
      return res.status(409).json({
        success: false,
        error: 'Tweet already minted as NFT',
        data: {
          tweetId: existingTweet.rows[0].tweet_id,
          mintAddress: existingTweet.rows[0].mint_address,
          metadataUri: existingTweet.rows[0].metadata_uri,
        },
      });
    }

    console.log('✅ Tweet not minted yet. Uploading metadata to Pinata IPFS...');

    // Upload to Pinata
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      metadata,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.PINATA_JWT}`,
        },
      }
    );

    const ipfsHash = response.data.IpfsHash;
    const timestamp = response.data.Timestamp;
    const gateway = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';
    const uri = `https://${gateway}/ipfs/${ipfsHash}`;

    console.log('✅ Metadata uploaded successfully:', uri);

    return res.status(200).json({
      success: true,
      uri,
      ipfsHash,
      timestamp,
      tweetId: extractedTweetId,
    });

  } catch (error: any) {
    console.error('❌ Error uploading metadata:', error?.response?.data || error?.message);
    
    return res.status(500).json({
      success: false,
      error: error?.response?.data?.error?.details || error?.message || 'Failed to upload metadata to IPFS',
    });
  } finally {
    client.release();
  }
};

// New endpoint to save mint data after NFT is created
export const saveMint = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      tweetId,
      mintAddress,
      ownerWallet,
      metadataUri,
      priceSol,
      txSignature,
      tweetData,
    } = req.body;

    // Validate required fields
    if (!tweetId || !mintAddress || !ownerWallet || !metadataUri) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tweetId, mintAddress, ownerWallet, metadataUri',
      });
    }

    console.log('💾 Saving mint data to database...');

    // Check if tweet already exists
    const existingTweet = await client.query(
      'SELECT tweet_id FROM tweets WHERE tweet_id = $1',
      [tweetId]
    );

    if (existingTweet.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: 'Tweet already minted',
      });
    }

    // Check/Create user
    let userId: number | null = null;
    const existingUser = await client.query(
      'SELECT user_id FROM users WHERE wallet_address = $1',
      [ownerWallet]
    );

    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].user_id;
    } else {
      const newUser = await client.query(
        'INSERT INTO users (wallet_address) VALUES ($1) RETURNING user_id',
        [ownerWallet]
      );
      userId = newUser.rows[0].user_id;
      console.log('✅ New user created:', userId);
    }

    // Insert tweet
    await client.query(
      `INSERT INTO tweets (
        tweet_id, mint_address, owner_wallet, metadata_uri, 
        price_sol, likes, retweets, replies, views
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        tweetId,
        mintAddress,
        ownerWallet,
        metadataUri,
        priceSol || null,
        tweetData?.likes || 0,
        tweetData?.retweets || 0,
        tweetData?.replies || 0,
        tweetData?.view_count || 0,
      ]
    );

    console.log('✅ Tweet record created');

    // Insert mint record
    const mintResult = await client.query(
      `INSERT INTO mints (
        tweet_id, user_id, tx_signature, mint_status
      ) VALUES ($1, $2, $3, $4) RETURNING mint_id`,
      [tweetId, userId, txSignature || null, 'completed']
    );

    const mintId = mintResult.rows[0].mint_id;
    console.log('✅ Mint record created:', mintId);

    // If price is provided, create payment record
    if (priceSol && txSignature) {
      await client.query(
        `INSERT INTO payments (
          user_id, mint_id, amount_sol, tx_signature, payment_status
        ) VALUES ($1, $2, $3, $4, $5)`,
        [userId, mintId, priceSol, txSignature, 'completed']
      );
      console.log('✅ Payment record created');
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Mint data saved successfully',
      data: {
        mintId,
        tweetId,
        mintAddress,
        userId,
      },
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Error saving mint data:', error);
    
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to save mint data',
    });
  } finally {
    client.release();
  }
};

export default { uploadMetadata, saveMint };
