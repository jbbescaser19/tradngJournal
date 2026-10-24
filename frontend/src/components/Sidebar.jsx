import { NavLink } from 'react-router-dom';
import { Activity, CalendarDays, BarChart3, Clock3, LayoutDashboard, Plus, Search, TrendingUp } from 'lucide-react';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/trades/new', label: 'Add trade', icon: Plus },
  { to: '/history', label: 'Trade history', icon: Search },
  { to: '/weekly', label: 'Weekly review', icon: CalendarDays },
  { to: '/monthly', label: 'Monthly review', icon: BarChart3 },
  { to: '/yearly', label: 'Yearly review', icon: TrendingUp }
];

export default function Sidebar({ open, onClose }) {
  return <>
    {open && <button className="mobile-scrim" aria-label="Close navigation" onClick={onClose} />}
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <NavLink to="/" className="brand" onClick={onClose}>
        <span className="brand-mark"><Activity size={21} strokeWidth={2.5} /></span>
        <span className="brand-copy"><strong>TradeLog</strong><small>PERSONAL JOURNAL</small></span>
      </NavLink>
      <div className="nav-label">WORKSPACE</div>
      <nav className="side-nav">
        {links.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={onClose} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{label === 'Add trade' && <span className="nav-plus">+</span>}
        </NavLink>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-tip-icon"><Clock3 size={17} /></div>
        <strong>One trade at a time.</strong>
        <p>Review the process, not just the outcome.</p>
      </div>
      <div className="sidebar-version">TRADELOG · LOCAL JOURNAL</div>
    </aside>
  </>;
}
