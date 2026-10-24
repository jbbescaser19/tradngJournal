import { useState } from 'react';
import { Menu, Plus, Search } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';

const pageNames = {
  '/': 'Dashboard', '/trades/new': 'Add trade', '/history': 'Trade history',
  '/weekly': 'Weekly review', '/monthly': 'Monthly review', '/yearly': 'Yearly review'
};

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const pageName = location.pathname.startsWith('/trade/') ? 'Trade review'
    : location.pathname.startsWith('/trades/') ? 'Edit trade'
    : pageNames[location.pathname] || 'TradeLog';

  return <div className="app-shell">
    <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
    <div className="main-shell">
      <header className="topbar">
        <button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={21} /></button>
        <div className="breadcrumbs"><span>Workspace</span><span className="crumb-separator">/</span><strong>{pageName}</strong></div>
        <div className="topbar-actions">
          <span className="local-indicator"><span /> Journal active</span>
          <Link className="button button-primary button-small" to="/trades/new"><Plus size={16} /> <span>Add trade</span></Link>
        </div>
      </header>
      <main className="main-content">{children}</main>
      <footer className="app-footer"><span>TradeLog <span className="footer-dot">·</span> Your personal trading journal</span><span>Review consistently. Improve deliberately.</span></footer>
    </div>
  </div>;
}
