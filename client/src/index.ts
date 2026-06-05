import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.listen(5000, () => console.log('Server running on port 5000'));