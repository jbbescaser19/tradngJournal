import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import AddTradePage from './pages/AddTradePage.jsx';
import TradeHistoryPage from './pages/TradeHistoryPage.jsx';
import TradeDetailPage from './pages/TradeDetailPage.jsx';
import WeeklyPage from './pages/WeeklyPage.jsx';
import MonthlyPage from './pages/MonthlyPage.jsx';
import YearlyPage from './pages/YearlyPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
  return <Layout>
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/trades/new" element={<AddTradePage />} />
      <Route path="/trades/:id/edit" element={<AddTradePage />} />
      <Route path="/trade/:id" element={<TradeDetailPage />} />
      <Route path="/history" element={<TradeHistoryPage />} />
      <Route path="/weekly" element={<WeeklyPage />} />
      <Route path="/monthly" element={<MonthlyPage />} />
      <Route path="/yearly" element={<YearlyPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </Layout>;
}
