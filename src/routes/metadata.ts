import express from 'express';
const router = express.Router();
import { uploadMetadata, saveMint } from '../controllers/metadata.js';

/**
 * @route   POST /v1/metadata/upload
 * @desc    Upload NFT metadata to IPFS via Pinata
 * @access  Public
 */
router.post('/upload', uploadMetadata);

/**
 * @route   POST /v1/metadata/save-mint
 * @desc    Save mint data to database after NFT creation
 * @access  Public
 */
router.post('/save-mint', saveMint);

export default router;
