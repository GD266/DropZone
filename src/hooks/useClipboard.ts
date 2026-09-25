import { useState, useCallback, useRef } from 'react';

export function useClipboard() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copyToClipboard = useCallback(async (text: string, id?: string): Promise<boolean> => {
    const copyId = id || 'default';
    
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(copyId);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        setCopiedId(null);
      }, 2000);
      
      return true;
    } catch {
      // Fallback for older browsers or when clipboard API fails
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopiedId(copyId);
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          setCopiedId(null);
        }, 2000);
        
        return true;
      } catch {
        return false;
      }
    }
  }, []);

  const isCopied = useCallback((id?: string): boolean => {
    const checkId = id || 'default';
    return copiedId === checkId;
  }, [copiedId]);

  return { copiedId, copyToClipboard, isCopied };
}
