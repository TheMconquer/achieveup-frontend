import { useEffect } from 'react';

/**
 * Asks search engines not to list the current page (or follow its links) while
 * it is mounted. The page still works for anyone who has the URL.
 *
 * On Netlify the same instruction is also sent as an X-Robots-Tag header (see
 * netlify.toml), which crawlers see before any JavaScript runs; this tag covers
 * any other host.
 */
export function useNoIndex(): void {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}
