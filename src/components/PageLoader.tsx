export function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3" role="status" aria-label="Loading">
        <div className="w-8 h-8 rounded-full border-2 border-border border-t-accent animate-spin" />
        <p className="text-xs text-text-muted">Loading DropZone...</p>
      </div>
    </div>
  );
}
