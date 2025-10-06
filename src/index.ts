import express from 'express';
import cors from 'cors';
import apiRoutes from '../scrapper.js';
import scrapeRouter from "./routes/scrape.js"
import priceRouter from "./routes/pricing.js"
import metadataRouter from "./routes/metadata.js"
import pool from "./config/db.js"
import TableCreation from './data/tableCreation.js';


const app = express();

app.use(cors());
app.use(express.json());
app.use(apiRoutes);
app.use('/v1',scrapeRouter);
app.use('/v1', priceRouter);
app.use('/v1', metadataRouter);

TableCreation();

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// trigger an initial DB connection so the pool emits the connect event
pool.connect()
  .then((client) => {
    client.release();
  })
  
  .catch((err) => {
    console.error("DB connection error", err);
  });
