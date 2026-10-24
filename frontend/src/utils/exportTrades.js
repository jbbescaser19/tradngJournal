import { dateKey } from './dateStats.js';

const columns = [
  ['id', '_id'], ['tradeDate', 'tradeDate'], ['createdAt', 'createdAt'], ['symbol', 'symbol'],
  ['direction', 'direction'], ['result', 'result'], ['entryPrice', 'entryPrice'],
  ['takeProfit', 'takeProfit'], ['stopLoss', 'stopLoss'], ['riskReward', 'riskReward'],
  ['pnl', 'pnl'], ['session', 'session'], ['strategy', 'strategy'], ['notes', 'notes'],
  ['review', 'review'], ['aiReview', 'aiReview'], ['screenshotPath', 'screenshot']
];

function escapeCsv(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function exportTradesCsv(trades) {
  const rows = [columns.map(([heading]) => escapeCsv(heading)).join(',')];
  trades.forEach((trade) => rows.push(columns.map(([, key]) => escapeCsv(trade[key])).join(',')));
  const blob = new Blob([`\uFEFF${rows.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `tradelog-trades-${dateKey(new Date())}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
