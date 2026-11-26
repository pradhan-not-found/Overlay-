// Keeps the public overlay-releases repository presentable and easy to find:
//   node public-repo.mjs readme   → publishes .github/public/README.md and the logo (only when changed)
//   node public-repo.mjs notes <version> <out>  → writes release notes for this build
// Uses RELEASES_TOKEN (Contents: read and write on overlay-releases) and SITE_URL.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const REPO = 'pradhan-not-found/overlay-releases';
const token = process.env.RELEASES_TOKEN || '';
// The website, if set as the repository variable SITE_URL; links to its pages are left out without it.
const site = (process.env.SITE_URL || '').replace(/\/+$/, '');
const api = (path, init = {}) => fetch(`https://api.github.com/repos/${REPO}/${path}`, {
  ...init,
  headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'overlay-release', ...(init.headers || {}) },
});

async function put(path, bytes, message) {
  const current = await api(`contents/${path}`);
  const existing = current.ok ? await current.json() : null;
  const next = Buffer.from(bytes).toString('base64');
  if (existing && existing.content && existing.content.replace(/\n/g, '') === next) return console.log(`${path}: unchanged`);
  const res = await api(`contents/${path}`, { method: 'PUT', body: JSON.stringify({ message, content: next, ...(existing ? { sha: existing.sha } : {}) }) });
  console.log(`${path}: ${res.ok ? 'published' : `failed (${res.status})`}`);
}

const [mode, version, out] = process.argv.slice(2);

if (mode === 'readme') {
  if (!token) { console.log('No RELEASES_TOKEN; skipping.'); process.exit(0); }
  let readme = readFileSync('.github/public/README.md', 'utf8');
  if (!site) {
    readme = readme
      .replace(' · [Website](__SITE__)', '')
      .replace(/^Want your product.*__SITE__\/sponsor.*$/m, 'Want your product in front of everyone who uses Overlay? Sponsorships open soon.')
      .replace(/ · <a href="__SITE__[^"]*">[^<]*<\/a>/g, '');
  }
  readme = readme.replaceAll('__SITE__', site);
  await put('README.md', readme, 'Update README');
  await put('.github/logo.png', readFileSync('applogo.png'), 'Update logo');
}

if (mode === 'notes') {
  // The commit that triggered this build, written for people, not for us.
  let message = '';
  try { message = execFileSync('git', ['log', '-1', '--pretty=%B'], { encoding: 'utf8' }); } catch { /* shallow or missing */ }
  const lines = message.split('\n').map((l) => l.trimEnd());
  const title = (lines[0] || 'Improvements and fixes').replace(/^(website|app|overlay|build)\s*:\s*/i, '');
  const internal = /co-authored|github|workflow|powershell|vercel|electron-builder|\bnpm\b|\.cjs|\.ts\b|\.md\b|typescript|signature|webhook|token/i;
  const points = [];
  let cur = '';
  for (const line of lines.slice(1)) {
    if (/^\s*-\s+/.test(line)) { if (cur) points.push(cur); cur = line.replace(/^\s*-\s+/, ''); }
    else if (cur && line.trim()) cur += ' ' + line.trim();
  }
  if (cur) points.push(cur);
  const kept = points.filter((p) => !internal.test(p)).slice(0, 8);
  const notes = `## Overlay ${version}

**${title.charAt(0).toUpperCase() + title.slice(1)}**

${kept.length ? kept.map((p) => `- ${p}`).join('\n') : '- Improvements and fixes.'}

### Download

**[Overlay-Setup.exe](https://github.com/${REPO}/releases/download/v${version}/Overlay-Setup.exe)** · Windows 10 and 11, 64-bit

Already installed? Overlay updates itself in the background.

${site ? `[Website](${site}) · [Changelog](${site}/changelog) · [Become a sponsor](${site}/sponsor)
` : ''}`;
  writeFileSync(out, notes);
  console.log(notes);
}
