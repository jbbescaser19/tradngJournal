import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { uploadDirectory } from './config/paths.js';
import tradeRoutes from './routes/tradeRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: clientUrl, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(uploadDirectory, { maxAge: '1d', immutable: false }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'trading-journal-api' }));
app.use('/api/trades', tradeRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
