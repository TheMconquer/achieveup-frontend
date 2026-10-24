// The Content-Security-Policy in netlify.toml only runs scripts served from
// the site itself, so an inline script in index.html would silently stop
// working in production while still running locally.
import { readFileSync } from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const indexHtml = readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const netlifyToml = readFileSync(path.join(root, 'netlify.toml'), 'utf8');

function sitePolicy(): Record<string, string[]> {
  const match = netlifyToml.match(/Content-Security-Policy = "([^"]+)"/);
  if (!match) throw new Error('No Content-Security-Policy in netlify.toml');
  return Object.fromEntries(
    match[1].split(';').map((directive) => {
      const [name, ...sources] = directive.trim().split(/\s+/);
      return [name, sources];
    })
  );
}

test('index.html has no inline scripts', () => {
  const scripts = indexHtml.match(/<script\b[^>]*>/g) ?? [];
  expect(scripts.length).toBeGreaterThan(0);
  scripts.forEach((tag) => expect(tag).toMatch(/\ssrc="%PUBLIC_URL%\//));
});

test('the policy only runs scripts from the site itself', () => {
  const policy = sitePolicy();
  expect(policy['script-src']).toEqual(["'self'"]);
  expect(policy['object-src']).toEqual(["'none'"]);
  expect(policy['frame-ancestors']).toEqual(["'none'"]);
  expect(policy['base-uri']).toEqual(["'self'"]);
});
