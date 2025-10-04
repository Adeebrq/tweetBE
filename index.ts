import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3003;

app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Hello from Express backend!');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
