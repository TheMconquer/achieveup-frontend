import { useCallback, useEffect, useRef, useState } from 'react';

const CONFIRMATION_MS = 2000;

interface UseCopyToClipboardResult {
  // True for CONFIRMATION_MS after a successful copy, for a "Copied!" state.
  copied: boolean;
  copy: (text: string) => void;
}

// Shared by every "copy this link" button so the clipboard-availability
// check and the copied-confirmation timing live in one place.
export function useCopyToClipboard(): UseCopyToClipboardResult {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const copy = useCallback((text: string) => {
    // navigator.clipboard is undefined outside a secure context (plain
    // http, or some embedded/older browsers) — calling .writeText on it
    // would throw synchronously, before any Promise exists to .catch.
    if (!navigator.clipboard) {
      console.error('Clipboard API is not available in this browser/context.');
      return;
    }

    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        clearTimeout(resetTimer.current);
        resetTimer.current = setTimeout(() => setCopied(false), CONFIRMATION_MS);
      })
      .catch((err) => console.error('Failed to copy to clipboard:', err));
  }, []);

  return { copied, copy };
}
