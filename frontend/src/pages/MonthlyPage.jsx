import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Grid2X2, Images, X } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { imageUrl } from '../api/trades.js';
import StatCard from '../components/StatCard.jsx';
import TradeCard from '../components/TradeCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useTrades } from '../context/TradesContext.jsx';
import { dateKey, formatDate, getStats, groupTradesByDay, rateLabel, sortTrades, startOfMonth } from '../utils/dateStats.js';

const monthName = (date, options = { month: 'long', year: 'numeric' }) => date.toLocaleDateString(undefined, options);

export default function MonthlyPage() {
  const { trades, loading } = useTrades();
  const [params] = useSearchParams();
  const queryYear = Number(params.get('year'));
  const queryMonth = Number(params.get('month'));
  const [monthDate, setMonthDate] = useState(() => Number.isFinite(queryYear) && params.has('year') ? new Date(queryYear, Number.isFinite(queryMonth) ? queryMonth : 0, 1) : new Date());
  const [view, setView] = useState('calendar');
  const [selectedDay, setSelectedDay] = useState('');
  const monthStart = startOfMonth(monthDate);
  const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
  const monthTrades = sortTrades(trades.filter((trade) => new Date(trade.tradeDate) >= monthStart && new Date(trade.tradeDate) < nextMonth));
  const stats = getStats(monthTrades);
  const galleryGroups = [...groupTradesByDay(monthTrades).entries()].reverse();
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const leadingBlanks = (monthStart.getDay() + 6) % 7;
  const calendarCells = useMemo(() => [
    ...Array.from({ length: leadingBlanks }, (_, i) => ({ key: `blank-${i}`, blank: true })),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), i + 1);
      const key = dateKey(date);
      const dayTrades = monthTrades.filter((trade) => dateKey(trade.tradeDate) === key);
      return { key, date, trades: dayTrades, stats: getStats(dayTrades) };
    })
  ], [monthStart.getFullYear(), monthStart.getMonth(), monthTrades.length, trades]);
  const selectedTrades = selectedDay ? monthTrades.filter((trade) => dateKey(trade.tradeDate) === selectedDay) : [];

  function changeMonth(amount) {
    setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + amount, 1));
    setSelectedDay('');
  }

  return <div className="page-stack">
    <PageHeader eyebrow="CALENDAR + GALLERY" title="Monthly review" description="Find a trading day in the calendar or browse all chart screenshots for the month." />
    <section className="panel period-panel"><div className="month-period-head"><div className="period-stepper"><button className="icon-button" onClick={() => changeMonth(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button><div className="period-label"><CalendarDays size={16} /><strong>{monthName(monthStart)}</strong></div><button className="icon-button" onClick={() => changeMonth(1)} aria-label="Next month"><ChevronRight size={18} /></button></div><button className="button button-subtle button-small" onClick={() => { setMonthDate(new Date()); setSelectedDay(''); }}>This month</button></div>
      <div className="period-stats-grid"><StatCard label="Win rate" value={rateLabel(stats)} helper={stats.completed ? `${stats.TP} TP / ${stats.SL} SL` : 'No completed trades'} tone="positive" /><StatCard label="Take profit" value={stats.TP} helper="Monthly wins" tone="positive" /><StatCard label="Stop loss" value={stats.SL} helper="Monthly losses" tone="negative" /><StatCard label="Total trades" value={stats.total} helper={`${stats.BE} BE · ${stats.OPEN} open`} /></div>
    </section>
    <div className="view-switcher-row"><div className="segmented-control"><button className={view === 'calendar' ? 'selected' : ''} onClick={() => setView('calendar')}><Grid2X2 size={15} /> Calendar</button><button className={view === 'gallery' ? 'selected' : ''} onClick={() => { setView('gallery'); setSelectedDay(''); }}><Images size={15} /> Gallery view</button></div><span className="section-subtle">{monthTrades.length} recorded {monthTrades.length === 1 ? 'trade' : 'trades'}</span></div>

    {view === 'calendar' && <section className="panel calendar-panel">
      <div className="calendar-weekdays">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="month-calendar-grid">{calendarCells.map((cell) => cell.blank ? <div key={cell.key} className="calendar-cell calendar-blank" /> : <button key={cell.key} onClick={() => setSelectedDay(cell.key === selectedDay ? '' : cell.key)} className={`calendar-cell ${cell.trades.length ? 'has-trades' : ''} ${cell.key === dateKey(new Date()) ? 'calendar-today' : ''} ${cell.key === selectedDay ? 'calendar-selected' : ''}`}>
        <span className="calendar-day-number">{cell.date.getDate()}</span>
        {cell.trades[0] && <img className="calendar-thumbnail" src={cell.trades[0].screenshot ? imageUrl(cell.trades[0].screenshot) : ''} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
        {cell.trades.length > 0 ? <><span className="calendar-trade-count">{cell.trades.length} {cell.trades.length === 1 ? 'trade' : 'trades'}</span><span className="calendar-result-dots">{cell.stats.TP > 0 && <i className="dot-win" />}{cell.stats.SL > 0 && <i className="dot-loss" />}{cell.stats.BE > 0 && <i className="dot-be" />}{cell.stats.OPEN > 0 && <i className="dot-open" />}</span></> : <span className="calendar-no-trades">—</span>}
      </button>)}</div>
      <div className="calendar-legend"><span><i className="legend-dot dot-win" /> TP</span><span><i className="legend-dot dot-loss" /> SL</span><span><i className="legend-dot dot-be" /> BE</span><span><i className="legend-dot dot-open" /> Open</span><span className="calendar-tip">Select a day to view its screenshots.</span></div>
    </section>}

    {view === 'gallery' && <div className="gallery-date-groups">{galleryGroups.length ? galleryGroups.map(([day, dayTrades]) => <section className="gallery-date-group" key={day}><div className="gallery-date-heading"><div><strong>{formatDate(`${day}T12:00:00`, { weekday: 'long', month: 'long', day: 'numeric' })}</strong><small>{dayTrades.length} {dayTrades.length === 1 ? 'trade' : 'trades'}</small></div><span>{getStats(dayTrades).TP} TP · {getStats(dayTrades).SL} SL</span></div><div className="trade-grid trade-grid-three">{sortTrades(dayTrades).map((trade) => <TradeCard key={trade._id} trade={trade} />)}</div></section>) : <EmptyState title="No screenshots this month" description="Trades you record for this month will appear in this gallery." />}</div>}

    {view === 'calendar' && selectedDay && <section className="selected-day-panel panel"><div className="panel-heading"><div><div className="eyebrow">DAY REVIEW</div><h2>{formatDate(`${selectedDay}T12:00:00`, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h2><p>{selectedTrades.length} {selectedTrades.length === 1 ? 'trade' : 'trades'} recorded</p></div><button className="icon-button" onClick={() => setSelectedDay('')} aria-label="Close selected day"><X size={17} /></button></div>{selectedTrades.length ? <div className="trade-grid trade-grid-three">{selectedTrades.map((trade) => <TradeCard key={trade._id} trade={trade} />)}</div> : <div className="no-trades-day">No trades were logged for this day. You can add one using this historical date.</div>}</section>}

    <div className="period-footer-note"><CalendarDays size={16} /><span>Monthly win rate is calculated from all TP and SL trades in {monthName(monthStart)}, not by averaging the weekly percentages.</span></div>
  </div>;
}
