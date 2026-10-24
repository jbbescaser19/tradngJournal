import { useMemo, useState } from 'react';
import { ArrowUpDown, CalendarDays, ChevronDown, Layers3 } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import PeriodControls from '../components/PeriodControls.jsx';
import StatCard from '../components/StatCard.jsx';
import TradeCard from '../components/TradeCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useTrades } from '../context/TradesContext.jsx';
import { addDays, dateKey, formatDate, getStats, rateLabel, sortTrades, startOfWeek } from '../utils/dateStats.js';

export default function WeeklyPage() {
  const { trades, loading } = useTrades();
  const [anchor, setAnchor] = useState(() => new Date());
  const [sort, setSort] = useState('desc');
  const start = startOfWeek(anchor);
  const end = addDays(start, 7);
  const periodTrades = sortTrades(trades.filter((trade) => new Date(trade.tradeDate) >= start && new Date(trade.tradeDate) < end), sort);
  const stats = getStats(periodTrades);
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    return { date, key: dateKey(date), trades: periodTrades.filter((trade) => dateKey(trade.tradeDate) === dateKey(date)) };
  }), [start.getTime(), trades, sort]);
  const [collapsedDays, setCollapsedDays] = useState([]);
  const allCollapsed = days.every((day) => collapsedDays.includes(day.key));
  function toggleDay(key) { setCollapsedDays((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]); }

  return <div className="page-stack">
    <PageHeader eyebrow="MONDAY – SUNDAY" title="Weekly review" description="Browse this week’s screenshots by day. Open any trade to inspect the full chart and notes." />
    <section className="period-panel panel"><PeriodControls label={`${formatDate(start, { month: 'short', day: 'numeric' })} – ${formatDate(addDays(start, 6), { month: 'short', day: 'numeric', year: 'numeric' })}`} onPrevious={() => setAnchor(addDays(anchor, -7))} onNext={() => setAnchor(addDays(anchor, 7))} onToday={() => setAnchor(new Date())}>
      <label className="inline-select"><ArrowUpDown size={14} /><select aria-label="Sort trades" value={sort} onChange={(event) => setSort(event.target.value)}><option value="desc">Newest first</option><option value="asc">Oldest first</option></select></label>
    </PeriodControls>
    <div className="period-stats-grid"><StatCard label="Win rate" value={rateLabel(stats)} helper={stats.completed ? `${stats.TP} TP out of ${stats.completed} wins/losses` : 'No completed trades'} tone="positive" /><StatCard label="Take profit" value={stats.TP} helper="Wins this week" tone="positive" /><StatCard label="Stop loss" value={stats.SL} helper="Losses this week" tone="negative" /><StatCard label="Total trades" value={stats.total} helper={`${stats.BE} BE · ${stats.OPEN} open`} /></div></section>

    <div className="gallery-toolbar"><div><h2>Screenshot gallery</h2><p>{periodTrades.length ? `${periodTrades.length} ${periodTrades.length === 1 ? 'trade' : 'trades'} across ${days.filter((day) => day.trades.length).length} active days` : 'Your trades will appear here as you log them'}</p></div><button className="button button-outline button-small" onClick={() => setCollapsedDays(allCollapsed ? [] : days.map((day) => day.key))}>{allCollapsed ? 'Expand days' : 'Collapse days'} <ChevronDown size={15} className={allCollapsed ? '' : 'chevron-up'} /></button></div>
    {loading && !trades.length ? <div className="loading-block"><span className="spinner" /> Loading trades…</div> : periodTrades.length ? <div className="day-gallery-list">{days.map((day) => <section className={`day-gallery-section ${day.trades.length ? '' : 'day-empty'}`} key={day.key}>
      <button className="day-section-heading" onClick={() => toggleDay(day.key)}><span className="day-date-mark"><strong>{day.date.toLocaleDateString(undefined, { day: '2-digit' })}</strong><small>{day.date.toLocaleDateString(undefined, { weekday: 'short' })}</small></span><span className="day-heading-copy"><strong>{day.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</strong><small>{day.trades.length ? `${getStats(day.trades).TP} TP · ${getStats(day.trades).SL} SL · ${day.trades.length} total` : 'No trades recorded'}</small></span><span className="day-trade-count">{day.trades.length} {day.trades.length === 1 ? 'trade' : 'trades'}</span><ChevronDown size={17} className={collapsedDays.includes(day.key) ? 'chevron-sideways' : ''} /></button>
      {!collapsedDays.includes(day.key) && (day.trades.length ? <div className="trade-grid trade-grid-four day-trades-grid">{day.trades.map((trade) => <TradeCard key={trade._id} trade={trade} />)}</div> : <div className="no-trades-day"><CalendarDays size={16} /> No trades logged for this day.</div>)}
    </section>)}</div> : <EmptyState title="No trades for this week" description="You can add a trade for today or select a historical date in Add Trade." />}
    <div className="period-footer-note"><Layers3 size={16} /><span>Reporting uses your selected trade date and time. Trades entered later still appear in the correct week.</span></div>
  </div>;
}
