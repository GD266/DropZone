import { Link, useLocation } from 'react-router-dom';
import { Cloud, HardDrive, Plus, Zap } from 'lucide-react';
import { getStorageMode } from '../lib/storage';

export function Header() {
  const storageMode = getStorageMode();
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-surface-0/80 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-accent/10 group-hover:bg-accent/20 transition-colors">
            <Zap size={14} className="text-accent" />
          </div>
          <span className="text-sm font-semibold text-text-primary">DropZone</span>
        </Link>

        <div className="flex items-center gap-2">
          <span
            className={`hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] ${
              storageMode === 'cloud'
                ? 'border-success/20 bg-success/5 text-success'
                : 'border-amber-400/20 bg-amber-400/5 text-amber-400'
            }`}
            title={storageMode === 'cloud' ? 'Files are stored in Supabase' : 'Files are stored in this browser'}
          >
            {storageMode === 'cloud' ? <Cloud size={11} /> : <HardDrive size={11} />}
            {storageMode === 'cloud' ? 'Cloud' : 'Local'}
          </span>

          {!isHome && (
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors rounded-md hover:bg-surface-2"
            >
              <Plus size={14} />
              New transfer
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
