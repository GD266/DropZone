import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-surface-0/80 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-accent/10 group-hover:bg-accent/20 transition-colors">
            <Zap size={14} className="text-accent" />
          </div>
          <span className="text-sm font-semibold text-text-primary">DropZone</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            to="/"
            className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors rounded-md hover:bg-surface-2"
          >
            Upload
          </Link>
        </nav>
      </div>
    </header>
  );
}
