import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import StatCard from '../components/StatCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useTrades } from '../context/TradesContext.jsx';
import { imageUrl } from '../api/trades.js';
import { formatDate, getStats, rateLabel, sortTrades } from '../utils/dateStats.js';

export default function YearlyPage() {
  const { trades, loading } = useTrades();
  const [year, setYear] = useState(new Date().getFullYear());
  const months = useMemo(() => Array.from({ length: 12 }, (_, index) => {
    const start = new Date(year, index, 1);
    const end = new Date(year, index + 1, 1);
    const monthTrades = sortTrades(trades.filter((trade) => new Date(trade.tradeDate) >= start && new Date(trade.tradeDate) < end));
    return { index, label: start.toLocaleDateString(undefined, { month: 'long' }), short: start.toLocaleDateString(undefined, { month: 'short' }), trades: monthTrades, stats: getStats(monthTrades) };
  }), [trades, year]);
  const yearTrades = months.flatMap((month) => month.trades);
  const stats = getStats(yearTrades);
  const activeMonths = months.filter((month) => month.trades.length > 0).length;

  return <div className="page-stack">
    <PageHeader eyebrow="LONG-TERM PROGRESS" title="Yearly review" description="Compare monthly results and open any month to browse its calendar and screenshots." />
    <section className="panel period-panel"><div className="month-period-head"><div className="period-stepper"><button className="icon-button" onClick={() => setYear((value) => value - 1)} aria-label="Previous year"><ChevronLeft size={18} /></button><div className="period-label"><CalendarDays size={16} /><strong>{year}</strong></div><button className="icon-button" onClick={() => setYear((value) => value + 1)} aria-label="Next year"><ChevronRight size={18} /></button></div><button className="button button-subtle button-small" onClick={() => setYear(new Date().getFullYear())}>This year</button></div>
      <div className="period-stats-grid"><StatCard label="Yearly win rate" value={rateLabel(stats)} helper={stats.completed ? `${stats.TP} wins / ${stats.SL} losses` : 'No completed trades'} tone="positive" /><StatCard label="Take profit" value={stats.TP} helper="Wins this year" tone="positive" /><StatCard label="Stop loss" value={stats.SL} helper="Losses this year" tone="negative" /><StatCard label="Active months" value={`${activeMonths} / 12`} helper={`${stats.total} total trades`} /></div>
    </section>
    <div className="section-heading"><div><h2>Monthly breakdown</h2><p>Each month is calculated from its own trades. Select one to see the calendar and gallery.</p></div><span className="section-subtle">{year}</span></div>
    {loading && !trades.length ? <div className="loading-block"><span className="spinner" /> Loading yearly statistics…</div> : <div className="month-card-grid">{months.map((month) => {
      const previewTrade = month.trades[0];
      return <Link to={`/monthly?year=${year}&month=${month.index}`} className={`month-card ${month.trades.length ? 'month-card-active' : ''}`} key={month.index}>
        <div className="month-card-image">{previewTrade?.screenshot ? <img src={imageUrl(previewTrade.screenshot)} alt={`${month.label} trade preview`} loading="lazy" /> : <div className="month-placeholder"><CalendarDays size={22} /><span>No screenshot yet</span></div>}
          <span className={`month-rate-tag ${month.stats.winRate === null ? 'month-rate-none' : month.stats.winRate >= 50 ? 'month-rate-good' : 'month-rate-low'}`}>{rateLabel(month.stats)}</span>
        </div>
        <div className="month-card-content"><div className="month-card-heading"><strong>{month.label}</strong><span>{month.trades.length} trades</span></div><div className="month-card-results"><span><i className="legend-dot dot-win" /> {month.stats.TP} TP</span><span><i className="legend-dot dot-loss" /> {month.stats.SL} SL</span><ArrowRight size={15} /></div>
          <div className="month-progress"><span style={{ width: `${month.stats.winRate ?? 0}%` }} /></div>
        </div>
      </Link>;
    })}</div>}
    {!stats.total && <div className="year-empty-hint"><TrendingUp size={17} /><span>Once you start recording trades, your yearly comparison will show how each month performed.</span></div>}
    <div className="period-footer-note"><TrendingUp size={16} /><span>Yearly win rate uses all TP and SL trades dated within {year}. It is not the average of monthly win rates.</span></div>
  </div>;
}
