import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { uploadDirectory } from '../config/paths.js';
import { analyzeTradeScreenshot, createTrade, deleteTrade, getTrade, listTrades, updateTrade } from '../controllers/tradeController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${randomUUID()}${extension}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 10) * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) return callback(Object.assign(new Error('Upload a JPG, PNG, WEBP, or GIF image.'), { status: 400 }));
    callback(null, true);
  }
});

router.get('/', asyncHandler(listTrades));
router.get('/:id', asyncHandler(getTrade));
router.post('/:id/analyze', asyncHandler(analyzeTradeScreenshot));
router.post('/', upload.single('screenshot'), asyncHandler(createTrade));
router.patch('/:id', upload.single('screenshot'), asyncHandler(updateTrade));
router.delete('/:id', asyncHandler(deleteTrade));

export default router;
