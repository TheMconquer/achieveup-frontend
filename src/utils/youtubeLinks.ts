// Appends a YouTube start-time param to a video link. Handles both watch?v=... and
// youtu.be/... link shapes since URLSearchParams manages the ?/& joining either way.
export function withTimestamp(link: string, seconds?: number | null): string {
  if (seconds == null) return link;
  try {
    const url = new URL(link);
    url.searchParams.set('t', `${seconds}s`);
    return url.toString();
  } catch {
    return link;
  }
}

const YOUTUBE_HOST = /^(youtu\.be|(.+\.)?youtube\.com|(.+\.)?youtube-nocookie\.com)$/;

function parseWebUrl(value: unknown): URL | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

// Returns the video link as an http(s) URL on a YouTube domain, or null for
// anything else (a javascript: link, another site), so only YouTube links
// become clickable. It only checks the scheme and domain: the backend's
// normalize_youtube_link is stricter and rebuilds new links from the video ID,
// so this mainly guards links saved before it did. Like the backend, it adds
// https:// to a link saved without it.
export function youTubeUrl(link: unknown): string | null {
  if (typeof link !== 'string') return null;
  const trimmed = link.trim();
  const url = parseWebUrl(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
  return url !== null && YOUTUBE_HOST.test(url.hostname) ? url.toString() : null;
}

// True for an http(s) URL, so a thumbnail is only shown when it's a real image link.
export function isWebUrl(value: unknown): value is string {
  return parseWebUrl(value) !== null;
}

export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
