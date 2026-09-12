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

export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
