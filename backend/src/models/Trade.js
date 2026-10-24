import { pool } from '../config/db.js';

const ALLOWED_RESULTS = new Set(['TP', 'SL', 'BE', 'OPEN']);
const ALLOWED_DIRECTIONS = new Set(['LONG', 'SHORT']);

function sqlDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 23).replace('T', ' ');
}

function isoDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const text = String(value);
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(text)
    ? text.replace(' ', 'T') + (text.includes('Z') || /[+-]\d{2}:?\d{2}$/.test(text) ? '' : 'Z')
    : text;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeTrade(row) {
  if (!row) return null;
  return {
    _id: String(row.id),
    id: String(row.id),
    symbol: row.symbol,
    direction: row.direction,
    result: row.result,
    tradeDate: isoDate(row.trade_date),
    screenshot: row.screenshot,
    entryPrice: numberOrNull(row.entry_price),
    takeProfit: numberOrNull(row.take_profit),
    stopLoss: numberOrNull(row.stop_loss),
    riskReward: numberOrNull(row.risk_reward),
    pnl: numberOrNull(row.pnl),
    strategy: row.strategy || '',
    session: row.session || '',
    notes: row.notes || '',
    review: row.review || '',
    aiReview: row.ai_review || '',
    aiReviewModel: row.ai_review_model || '',
    aiReviewGeneratedAt: isoDate(row.ai_review_generated_at),
    createdAt: isoDate(row.created_at),
    updatedAt: isoDate(row.updated_at)
  };
}

function validId(value) {
  const id = String(value ?? '');
  return /^\d+$/.test(id) && Number(id) > 0 && Number.isSafeInteger(Number(id)) ? Number(id) : null;
}

export function isValidTradeId(value) {
  return validId(value) !== null;
}

export async function listTrades(filters = {}, limit = 2000) {
  const conditions = [];
  const values = [];

  if (filters.result && ALLOWED_RESULTS.has(filters.result)) {
    conditions.push('result = ?');
    values.push(filters.result);
  }
  if (filters.symbol) {
    conditions.push('symbol = ?');
    values.push(String(filters.symbol).trim().toUpperCase());
  }
  if (filters.direction && ALLOWED_DIRECTIONS.has(filters.direction)) {
    conditions.push('direction = ?');
    values.push(filters.direction);
  }
  if (filters.from) {
    conditions.push('trade_date >= ?');
    values.push(sqlDate(filters.from));
  }
  if (filters.to) {
    conditions.push('trade_date <= ?');
    values.push(sqlDate(filters.to));
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 2000, 1), 5000);
  const [rows] = await pool.execute(
    `SELECT * FROM trades ${where} ORDER BY trade_date DESC, created_at DESC LIMIT ${safeLimit}`,
    values
  );
  return rows.map(normalizeTrade);
}

export async function findTradeById(value) {
  const id = validId(value);
  if (!id) return null;
  const [rows] = await pool.execute('SELECT * FROM trades WHERE id = ? LIMIT 1', [id]);
  return normalizeTrade(rows[0]);
}

export async function createTrade(data) {
  const [result] = await pool.execute(
    `INSERT INTO trades
      (symbol, direction, result, trade_date, screenshot, entry_price, take_profit, stop_loss,
       risk_reward, pnl, strategy, session, notes, review)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.symbol,
      data.direction,
      data.result,
      sqlDate(data.tradeDate),
      data.screenshot,
      data.entryPrice,
      data.takeProfit,
      data.stopLoss,
      data.riskReward,
      data.pnl,
      data.strategy,
      data.session,
      data.notes,
      data.review
    ]
  );
  return findTradeById(result.insertId);
}

export async function updateTradeRecord(value, data) {
  const id = validId(value);
  if (!id) return null;
  await pool.execute(
    `UPDATE trades SET
      symbol = ?, direction = ?, result = ?, trade_date = ?, screenshot = ?,
      entry_price = ?, take_profit = ?, stop_loss = ?, risk_reward = ?, pnl = ?,
      strategy = ?, session = ?, notes = ?, review = ?, ai_review = ?,
      ai_review_model = ?, ai_review_generated_at = ?
     WHERE id = ?`,
    [
      data.symbol,
      data.direction,
      data.result,
      sqlDate(data.tradeDate),
      data.screenshot,
      data.entryPrice,
      data.takeProfit,
      data.stopLoss,
      data.riskReward,
      data.pnl,
      data.strategy,
      data.session,
      data.notes,
      data.review,
      data.aiReview || '',
      data.aiReviewModel || '',
      sqlDate(data.aiReviewGeneratedAt),
      id
    ]
  );
  return findTradeById(id);
}

export async function saveAiReview(value, result) {
  const id = validId(value);
  if (!id) return null;
  await pool.execute(
    'UPDATE trades SET ai_review = ?, ai_review_model = ?, ai_review_generated_at = UTC_TIMESTAMP(3) WHERE id = ?',
    [result.text, result.model, id]
  );
  return findTradeById(id);
}

export async function deleteTradeRecord(value) {
  const id = validId(value);
  if (!id) return false;
  const [result] = await pool.execute('DELETE FROM trades WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
