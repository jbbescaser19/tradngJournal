import fs from 'node:fs/promises';
import path from 'node:path';
import { uploadDirectory } from '../config/paths.js';
import {
  createTrade as insertTrade,
  deleteTradeRecord,
  findTradeById,
  isValidTradeId,
  listTrades as queryTrades,
  saveAiReview,
  updateTradeRecord
} from '../models/Trade.js';
import { analyzeScreenshot } from '../services/aiReviewService.js';

const RESULTS = new Set(['TP', 'SL', 'BE', 'OPEN']);
const DIRECTIONS = new Set(['LONG', 'SHORT']);

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function nullableNumber(value, label) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw badRequest(`${label} must be a valid number.`);
  return parsed;
}

function parseTradeDate(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw badRequest('A valid trade date and time are required.');
  return date;
}

function getInput(body, existing = {}) {
  const pick = (key, fallback = '') => body[key] !== undefined ? body[key] : (existing[key] ?? fallback);
  const symbol = String(pick('symbol', '')).trim().toUpperCase();
  const direction = String(pick('direction', 'LONG')).toUpperCase();
  const result = String(pick('result', 'OPEN')).toUpperCase();
  if (symbol.length > 30) throw badRequest('Trading pair or instrument must be 30 characters or fewer.');
  if (!DIRECTIONS.has(direction)) throw badRequest('Direction must be LONG or SHORT.');
  if (!RESULTS.has(result)) throw badRequest('Result must be TP, SL, BE, or OPEN.');

  return {
    symbol,
    direction,
    result,
    tradeDate: parseTradeDate(pick('tradeDate', existing.tradeDate)),
    entryPrice: nullableNumber(pick('entryPrice', existing.entryPrice), 'Entry price'),
    takeProfit: nullableNumber(pick('takeProfit', existing.takeProfit), 'Take Profit'),
    stopLoss: nullableNumber(pick('stopLoss', existing.stopLoss), 'Stop Loss'),
    riskReward: nullableNumber(pick('riskReward', existing.riskReward), 'Risk-to-reward'),
    pnl: nullableNumber(pick('pnl', existing.pnl), 'Profit/loss'),
    strategy: String(pick('strategy', '')).trim(),
    session: String(pick('session', '')).trim(),
    notes: String(pick('notes', '')).trim(),
    review: String(pick('review', '')).trim()
  };
}

function imagePath(file) {
  return file ? `/uploads/${file.filename}` : null;
}

async function removeImage(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('/uploads/')) return;
  const fullPath = path.join(uploadDirectory, path.basename(imageUrl));
  try {
    await fs.unlink(fullPath);
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Could not remove old screenshot:', error.message);
  }
}

function contextForReview(trade) {
  return JSON.stringify({
    result: trade.result,
    symbol: trade.symbol,
    direction: trade.direction,
    tradeDate: trade.tradeDate,
    entryPrice: trade.entryPrice,
    takeProfit: trade.takeProfit,
    stopLoss: trade.stopLoss,
    riskReward: trade.riskReward,
    strategy: trade.strategy,
    session: trade.session,
    notes: trade.notes,
    screenshot: trade.screenshot
  });
}

export async function listTrades(req, res) {
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 5000) : 2000;
  const trades = await queryTrades({
    result: req.query.result,
    symbol: req.query.symbol,
    direction: req.query.direction,
    from: req.query.from,
    to: req.query.to
  }, limit);
  res.json({ trades, count: trades.length });
}

export async function getTrade(req, res) {
  if (!isValidTradeId(req.params.id)) return res.status(400).json({ message: 'Invalid trade ID.' });
  const trade = await findTradeById(req.params.id);
  if (!trade) return res.status(404).json({ message: 'Trade not found.' });
  res.json({ trade });
}

export async function createTrade(req, res) {
  let data;
  try {
    data = getInput(req.body);
  } catch (error) {
    if (req.file) await removeImage(imagePath(req.file));
    throw error;
  }
  if (!data.symbol) {
    if (req.file) await removeImage(imagePath(req.file));
    return res.status(400).json({ message: 'Trading pair or instrument is required.' });
  }
  if (!req.file) return res.status(400).json({ message: 'Please upload a screenshot for this trade.' });

  try {
    const trade = await insertTrade({ ...data, screenshot: imagePath(req.file) });
    res.status(201).json({ trade });
  } catch (error) {
    await removeImage(imagePath(req.file));
    throw error;
  }
}

export async function updateTrade(req, res) {
  if (!isValidTradeId(req.params.id)) {
    if (req.file) await removeImage(imagePath(req.file));
    return res.status(400).json({ message: 'Invalid trade ID.' });
  }

  const currentTrade = await findTradeById(req.params.id);
  if (!currentTrade) {
    if (req.file) await removeImage(imagePath(req.file));
    return res.status(404).json({ message: 'Trade not found.' });
  }

  let data;
  try {
    data = getInput(req.body, currentTrade);
  } catch (error) {
    if (req.file) await removeImage(imagePath(req.file));
    throw error;
  }
  if (!data.symbol) {
    if (req.file) await removeImage(imagePath(req.file));
    return res.status(400).json({ message: 'Trading pair or instrument is required.' });
  }

  const oldImage = req.file ? currentTrade.screenshot : null;
  const screenshot = req.file ? imagePath(req.file) : currentTrade.screenshot;
  const nextContext = { ...currentTrade, ...data, screenshot };
  const contextChanged = contextForReview(currentTrade) !== contextForReview(nextContext);
  const updatedData = {
    ...currentTrade,
    ...data,
    screenshot,
    aiReview: contextChanged ? '' : currentTrade.aiReview,
    aiReviewModel: contextChanged ? '' : currentTrade.aiReviewModel,
    aiReviewGeneratedAt: contextChanged ? null : currentTrade.aiReviewGeneratedAt
  };

  try {
    const trade = await updateTradeRecord(req.params.id, updatedData);
    if (!trade) {
      if (req.file) await removeImage(imagePath(req.file));
      return res.status(404).json({ message: 'Trade not found.' });
    }
    if (oldImage) await removeImage(oldImage);
    res.json({ trade });
  } catch (error) {
    if (req.file) await removeImage(imagePath(req.file));
    throw error;
  }
}

export async function analyzeTradeScreenshot(req, res) {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ message: 'AI chart review is not configured. Add OPENAI_API_KEY to backend/.env and restart the backend.' });
  }
  const trade = await findTradeById(req.params.id);
  if (!trade) return res.status(404).json({ message: 'Trade not found.' });
  if (!trade.screenshot) return res.status(400).json({ message: 'This trade does not have a screenshot to analyze.' });

  const result = await analyzeScreenshot(trade);
  const updatedTrade = await saveAiReview(req.params.id, result);
  res.json({ trade: updatedTrade });
}

export async function deleteTrade(req, res) {
  if (!isValidTradeId(req.params.id)) return res.status(400).json({ message: 'Invalid trade ID.' });
  const trade = await findTradeById(req.params.id);
  if (!trade) return res.status(404).json({ message: 'Trade not found.' });
  await deleteTradeRecord(req.params.id);
  await removeImage(trade.screenshot);
  res.json({ message: 'Trade deleted successfully.' });
}
