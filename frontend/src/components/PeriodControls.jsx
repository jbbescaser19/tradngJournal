import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

export default function PeriodControls({ label, onPrevious, onNext, onToday, todayLabel = 'This period', children }) {
  return <div className="period-controls">
    <div className="period-stepper"><button className="icon-button" onClick={onPrevious} aria-label="Previous period"><ChevronLeft size={18} /></button>
      <div className="period-label"><CalendarDays size={16} /><strong>{label}</strong></div>
      <button className="icon-button" onClick={onNext} aria-label="Next period"><ChevronRight size={18} /></button>
    </div>
    <div className="period-actions">{children}<button className="button button-subtle button-small" onClick={onToday}>{todayLabel}</button></div>
  </div>;
}
