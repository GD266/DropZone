import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { Header } from './components/Header';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageLoader } from './components/PageLoader';
import { useOnlineStatus } from './hooks/useOnlineStatus';

const HomePage = lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })));
const SharePage = lazy(() => import('./pages/SharePage').then(module => ({ default: module.SharePage })));

export default function App() {
  const isOnline = useOnlineStatus();

  return (
    <ErrorBoundary>
      <HashRouter>
        <div className="min-h-screen bg-surface-0">
          <Header />

          {!isOnline && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-2 rounded-lg border border-amber-400/25 bg-surface-1/95 backdrop-blur px-4 py-2.5 shadow-xl">
              <WifiOff size={14} className="text-amber-400" />
              <p className="text-xs text-text-secondary">You're offline. Cloud uploads will fail until you reconnect.</p>
            </div>
          )}

          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/share/:shareId" element={<SharePage />} />
              <Route path="/share/:shareId/file/:fileId" element={<SharePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </HashRouter>
    </ErrorBoundary>
  );
}
