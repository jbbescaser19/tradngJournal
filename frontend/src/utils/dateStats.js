export const RESULT_LABELS = { TP: 'Take profit', SL: 'Stop loss', BE: 'Break even', OPEN: 'Open' };

export function dateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function localDateTimeParts(value = new Date()) {
  const date = new Date(value);
  return {
    date: dateKey(date),
    time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  };
}

export function localDateTime(date, time) {
  return new Date(`${date}T${time || '00:00'}:00`).toISOString();
}

export function formatDate(value, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, options);
}

export function formatTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '—';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(value));
}

export function getPeriodTrades(trades, start, end) {
  const startTime = start.getTime();
  const endTime = end.getTime();
  return trades.filter((trade) => {
    const time = new Date(trade.tradeDate).getTime();
    return time >= startTime && time < endTime;
  });
}

export function getStats(trades) {
  const counts = { TP: 0, SL: 0, BE: 0, OPEN: 0 };
  trades.forEach((trade) => { if (counts[trade.result] !== undefined) counts[trade.result] += 1; });
  const completed = counts.TP + counts.SL;
  const outcomes = sortTrades(trades, 'asc').filter((trade) => trade.result === 'TP' || trade.result === 'SL');
  let currentStreak = null;
  if (outcomes.length) {
    const lastResult = outcomes[outcomes.length - 1].result;
    let count = 0;
    for (let index = outcomes.length - 1; index >= 0 && outcomes[index].result === lastResult; index -= 1) count += 1;
    currentStreak = { result: lastResult, count };
  }
  let bestWinStreak = 0;
  let worstLossStreak = 0;
  let runResult = null;
  let runCount = 0;
  outcomes.forEach((trade) => {
    if (trade.result === runResult) runCount += 1;
    else { runResult = trade.result; runCount = 1; }
    if (runResult === 'TP') bestWinStreak = Math.max(bestWinStreak, runCount);
    if (runResult === 'SL') worstLossStreak = Math.max(worstLossStreak, runCount);
  });
  return {
    ...counts,
    total: trades.length,
    completed,
    winRate: completed ? (counts.TP / completed) * 100 : null,
    lossRate: completed ? (counts.SL / completed) * 100 : null,
    currentStreak,
    bestWinStreak,
    worstLossStreak,
    pnl: trades.reduce((sum, trade) => sum + (trade.pnl !== null && trade.pnl !== undefined && trade.pnl !== '' && Number.isFinite(Number(trade.pnl)) ? Number(trade.pnl) : 0), 0),
    pnlTrades: trades.filter((trade) => trade.pnl !== null && trade.pnl !== undefined && trade.pnl !== '').length
  };
}

export function startOfWeek(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return date;
}

export function addDays(value, amount) {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

export function startOfMonth(value) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

export function startOfYear(value) {
  return new Date(value.getFullYear(), 0, 1);
}

export function sortTrades(trades, direction = 'desc') {
  return [...trades].sort((a, b) => {
    const diff = new Date(a.tradeDate) - new Date(b.tradeDate);
    return direction === 'asc' ? diff : -diff;
  });
}

export function groupTradesByDay(trades) {
  const groups = new Map();
  sortTrades(trades, 'asc').forEach((trade) => {
    const key = dateKey(trade.tradeDate);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(trade);
  });
  return groups;
}

export function rateLabel(stats) {
  return stats.winRate === null ? '—' : `${stats.winRate.toFixed(2)}%`;
}
