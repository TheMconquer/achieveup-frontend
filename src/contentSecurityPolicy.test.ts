// The Content-Security-Policy in netlify.toml only runs scripts served from
// the site itself, so an inline script in index.html would silently stop
// working in production while still running locally. These tests also check
// that the policy still allows what the app needs (API, fonts, images), since
// a policy that is too strict only shows up as a broken site in production.
import { existsSync, readFileSync } from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const indexHtml = readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const netlifyToml = readFileSync(path.join(root, 'netlify.toml'), 'utf8');

// Must match REACT_APP_API_URL in the Netlify environment.
const API_ORIGIN = 'https://gen-ai-prime-3ddeabb35bd7.herokuapp.com';

function sitePolicy(): Record<string, string[]> {
  // The policy lives in the [[headers]] block that applies to every path.
  const block = netlifyToml
    .split('[[headers]]')
    .find((section) => /^\s*for = "\/\*"/.test(section));
  if (!block) throw new Error('No [[headers]] block for "/*" in netlify.toml');
  const match = block.match(/Content-Security-Policy = "([^"]+)"/);
  if (!match) throw new Error('No Content-Security-Policy in the "/*" headers block');
  return Object.fromEntries(
    match[1].split(';').map((directive) => {
      const [name, ...sources] = directive.trim().split(/\s+/);
      return [name, sources];
    })
  );
}

// index.html loads Google Fonts, so the policy has to allow the stylesheet's
// host (style-src) and the host the font files come from (font-src).
function googleFontsOrigins() {
  const stylesheet = indexHtml.match(/<link[^>]*rel="stylesheet"[^>]*href="(https:\/\/[^/"]+)/);
  const fontFiles = indexHtml.match(/<link[^>]*rel="preconnect"[^>]*href="(https:\/\/[^/"]+)"[^>]*crossorigin/);
  if (!stylesheet || !fontFiles) throw new Error('Google Fonts links not found in index.html');
  return { stylesheet: stylesheet[1], fontFiles: fontFiles[1] };
}

test('index.html has no inline scripts', () => {
  const scripts = indexHtml.match(/<script\b[^>]*>/g) ?? [];
  expect(scripts.length).toBeGreaterThan(0);
  scripts.forEach((tag) => expect(tag).toMatch(/\ssrc=["']%PUBLIC_URL%\//));
});

test('the dark-mode init script exists and index.html loads it', () => {
  expect(existsSync(path.join(root, 'public', 'theme-init.js'))).toBe(true);
  expect(indexHtml).toMatch(/<script\s[^>]*src=["']%PUBLIC_URL%\/theme-init\.js["']/);
});

test('the policy only runs scripts from the site itself', () => {
  const policy = sitePolicy();
  expect(policy['script-src']).toEqual(["'self'"]);
  expect(policy['object-src']).toEqual(["'none'"]);
  expect(policy['frame-ancestors']).toEqual(["'none'"]);
  expect(policy['base-uri']).toEqual(["'self'"]);
});

test('anything not listed falls back to the site itself', () => {
  expect(sitePolicy()['default-src']).toEqual(["'self'"]);
});

test('the app can still reach its backend API', () => {
  const connectSrc = sitePolicy()['connect-src'];
  expect(connectSrc).toContain("'self'");
  expect(connectSrc).toContain(API_ORIGIN);
});

test('the Google Fonts that index.html loads are allowed', () => {
  const policy = sitePolicy();
  const { stylesheet, fontFiles } = googleFontsOrigins();
  expect(policy['style-src']).toContain(stylesheet);
  expect(policy['font-src']).toContain(fontFiles);
});

test('images can come from any https host (YouTube thumbnails, Canvas images)', () => {
  expect(sitePolicy()['img-src']).toContain('https:');
});
