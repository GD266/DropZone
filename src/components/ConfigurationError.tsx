import { AlertCircle } from 'lucide-react';
import { getConfigurationError } from '../lib/supabase';

export function ConfigurationError() {
  const error = getConfigurationError();
  
  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="border border-border rounded-lg bg-surface-1 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-error/10 shrink-0">
              <AlertCircle size={20} className="text-error" />
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-text-primary mb-2">
                DropZone configuration error
              </h1>
              <p className="text-sm text-text-secondary mb-4">
                Supabase is not configured for this deployment.
              </p>
              
              <div className="bg-surface-2 border border-border rounded-md p-4 mb-4">
                <p className="text-xs text-text-muted mb-2 font-medium uppercase tracking-wider">
                  Missing configuration
                </p>
                <p className="text-sm text-error font-mono">
                  {error}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-text-muted mb-1 font-medium">
                    Required environment variables:
                  </p>
                  <div className="bg-surface-2 border border-border rounded-md p-3 font-mono text-xs space-y-1">
                    <div className="text-text-secondary">
                      <span className="text-accent">VITE_SUPABASE_URL</span>=
                      <span className="text-text-muted">your-project-url.supabase.co</span>
                    </div>
                    <div className="text-text-secondary">
                      <span className="text-accent">VITE_SUPABASE_ANON_KEY</span>=
                      <span className="text-text-muted">your-anon-key</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-text-muted mb-1 font-medium">
                    Setup instructions:
                  </p>
                  <ol className="text-xs text-text-secondary space-y-1 list-decimal list-inside">
                    <li>Create a .env file in the project root</li>
                    <li>Add the required variables above</li>
                    <li>Get values from Supabase Dashboard → Settings → API</li>
                    <li>Restart the development server</li>
                  </ol>
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-text-muted">
                    For deployment (Vercel, Netlify, etc.), configure these variables in your platform's environment settings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
