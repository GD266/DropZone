export function getShareUrl(shareId: string): string {
  const base = window.location.origin + window.location.pathname;
  return `${base}#/share/${shareId}`;
}

export function getFileUrl(shareId: string, fileId: string): string {
  const base = window.location.origin + window.location.pathname;
  return `${base}#/share/${shareId}/file/${fileId}`;
}

export function parseShareRoute(hash: string): { shareId: string; fileId?: string } | null {
  // Match /share/[shareId]/file/[fileId]
  const fileMatch = hash.match(/#\/share\/([a-zA-Z0-9-]+)\/file\/([a-zA-Z0-9-]+)/);
  if (fileMatch) {
    return { shareId: fileMatch[1], fileId: fileMatch[2] };
  }
  
  // Match /share/[shareId]
  const shareMatch = hash.match(/#\/share\/([a-zA-Z0-9-]+)/);
  if (shareMatch) {
    return { shareId: shareMatch[1] };
  }
  
  return null;
}
