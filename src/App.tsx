import { HashRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { SharePage } from './pages/SharePage';

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-surface-0">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/share/:shareId" element={<SharePage />} />
          <Route path="/share/:shareId/file/:fileId" element={<SharePage />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
