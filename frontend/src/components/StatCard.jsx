export default function StatCard({ label, value, helper, icon: Icon, tone = 'neutral' }) {
  return <div className={`stat-card stat-${tone}`}>
    <div className="stat-top"><span>{label}</span>{Icon && <span className="stat-icon"><Icon size={17} /></span>}</div>
    <div className="stat-value">{value}</div>
    {helper && <div className="stat-helper">{helper}</div>}
  </div>;
}
