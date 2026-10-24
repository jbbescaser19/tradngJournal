import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';

export default function NotFoundPage() {
  return <div className="not-found"><div className="empty-icon"><Compass size={25} /></div><h1>Page not found</h1><p>This page may have moved or does not exist.</p><Link to="/" className="button button-primary"><ArrowLeft size={16} /> Back to dashboard</Link></div>;
}
