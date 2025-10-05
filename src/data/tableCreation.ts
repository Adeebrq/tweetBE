import pool from "../config/db.js";

const TableCreation = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        wallet_address VARCHAR(100) UNIQUE NOT NULL,
        username VARCHAR(100),
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tweets (
        tweet_id VARCHAR(50) PRIMARY KEY,
        mint_address VARCHAR(100) UNIQUE NOT NULL,
        owner_wallet VARCHAR(100) NOT NULL,
        mint_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata_uri TEXT NOT NULL,
        price_sol NUMERIC(10,4),
        likes INTEGER,
        retweets INTEGER,
        replies INTEGER,
        views INTEGER
      );

      CREATE TABLE IF NOT EXISTS mints (
        mint_id SERIAL PRIMARY KEY,
        tweet_id VARCHAR(50) REFERENCES tweets(tweet_id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
        tx_signature VARCHAR(100) UNIQUE,
        mint_status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS payments (
        payment_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
        mint_id INTEGER REFERENCES mints(mint_id) ON DELETE CASCADE,
        amount_sol NUMERIC(10,4) NOT NULL,
        tx_signature VARCHAR(100) UNIQUE,
        payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Tables created or already exist.");
  } catch (err) {
    console.error("Error creating tables:", err);
  }
};

export default TableCreation;
