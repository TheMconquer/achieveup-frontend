// These tests feed in javascript: links on purpose, to check they're never rendered.
/* eslint-disable no-script-url */
import { isWebUrl, youTubeUrl, withTimestamp } from './youtubeLinks';

const VIDEO_ID = 'dQw4w9WgXcQ';

describe('youTubeUrl', () => {
  // Every shape the backend saves (normalize_youtube_link and the AI search
  // both store https://www.youtube.com/watch?v=...) plus links typed before that.
  test.each([
    `https://www.youtube.com/watch?v=${VIDEO_ID}`,
    `https://www.youtube.com/watch?v=${VIDEO_ID}&t=90s`,
    `http://youtube.com/watch?v=${VIDEO_ID}`,
    `https://m.youtube.com/watch?v=${VIDEO_ID}`,
    `https://music.youtube.com/watch?v=${VIDEO_ID}`,
    `https://youtu.be/${VIDEO_ID}?si=abc`,
    `https://www.youtube.com/shorts/${VIDEO_ID}`,
    `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`,
  ])('keeps %s', (link) => {
    expect(youTubeUrl(link)).toBe(link);
  });

  test.each([
    [`www.youtube.com/watch?v=${VIDEO_ID}`, `https://www.youtube.com/watch?v=${VIDEO_ID}`],
    [`youtu.be/${VIDEO_ID}`, `https://youtu.be/${VIDEO_ID}`],
    [`  https://youtu.be/${VIDEO_ID}  `, `https://youtu.be/${VIDEO_ID}`],
    [`HTTPS://WWW.YOUTUBE.COM/watch?v=${VIDEO_ID}`, `https://www.youtube.com/watch?v=${VIDEO_ID}`],
  ])('fixes up %s', (link, expected) => {
    expect(youTubeUrl(link)).toBe(expected);
  });

  test.each([
    'javascript:alert(document.cookie)',
    'JavaScript:alert(1)',
    ' javascript:alert(1)',
    'javascript://www.youtube.com/%0aalert(1)',
    'javascript:youtube.com',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    `https://evil.com/watch?v=${VIDEO_ID}`,
    `https://notyoutube.com/watch?v=${VIDEO_ID}`,
    `https://youtube.com.evil.com/watch?v=${VIDEO_ID}`,
    `https://evil.com/#https://www.youtube.com/watch?v=${VIDEO_ID}`,
    `evil.com/watch?v=${VIDEO_ID}`,
    `ftp://youtube.com/${VIDEO_ID}`,
    '',
  ])('rejects %s', (link) => {
    expect(youTubeUrl(link)).toBeNull();
  });

  test('rejects values that are not text', () => {
    expect(youTubeUrl(undefined)).toBeNull();
    expect(youTubeUrl(null)).toBeNull();
    expect(youTubeUrl({ href: `https://youtu.be/${VIDEO_ID}` })).toBeNull();
  });
});

describe('isWebUrl', () => {
  test.each([
    ['https://i.ytimg.com/vi/x/hqdefault.jpg', true],
    ['http://i.ytimg.com/vi/x/hqdefault.jpg', true],
    ['javascript:alert(1)', false],
    ['data:image/svg+xml,<svg></svg>', false],
    ['No Thumbnail Found', false],
    ['', false],
  ])('%s -> %s', (value, expected) => {
    expect(isWebUrl(value)).toBe(expected);
  });

  test('rejects values that are not text', () => {
    expect(isWebUrl(undefined)).toBe(false);
  });
});

describe('withTimestamp', () => {
  test('adds the start time to a YouTube link', () => {
    expect(withTimestamp(`https://www.youtube.com/watch?v=${VIDEO_ID}`, 90)).toBe(
      `https://www.youtube.com/watch?v=${VIDEO_ID}&t=90s`
    );
  });

  test('leaves the link alone without a start time', () => {
    const link = `https://youtu.be/${VIDEO_ID}`;
    expect(withTimestamp(link, null)).toBe(link);
  });
});
