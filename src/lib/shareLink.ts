export function getShareUrl(shareId: string): string {
  const base = window.location.origin + window.location.pathname;
  return `${base}#/share/${shareId}`;
}

export function extractShareId(hash: string): string | null {
  const match = hash.match(/#\/share\/([a-zA-Z0-9-]+)/);
  return match ? match[1] : null;
}
