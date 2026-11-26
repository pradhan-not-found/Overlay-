// GET /api/download — sends the visitor straight to the newest Overlay installer.
//
// 1. The public overlay-releases repository, if it has a release.
// 2. Otherwise this project's private repository, read with GITHUB_TOKEN (a
//    fine-grained token with Contents: read on that repository, set in the
//    Vercel project's environment variables). GitHub answers with a short-lived
//    file link that anyone can download from, so the repository stays private
//    and the visitor never needs a GitHub account.
const OWNER = 'pradhan-not-found';
const PUBLIC_REPO = 'overlay-releases';
const PRIVATE_REPO = 'Overlay-';

async function latestExe(repo, token) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'overlay-download' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${repo}/releases/latest`, { headers });
  if (!res.ok) return null;
  const release = await res.json();
  const asset = (release.assets || []).find((a) => /\.exe$/i.test(a.name));
  return asset ? { asset, version: String(release.tag_name || '') } : null;
}

export default async function handler(req, res) {
  const token = process.env.GITHUB_TOKEN || '';
  try {
    // Public first: a plain, cacheable link.
    const pub = await latestExe(PUBLIC_REPO, token);
    if (pub) {
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      res.setHeader('Location', pub.asset.browser_download_url);
      return res.status(302).end();
    }
    // Private: ask GitHub for the file itself; it replies with a temporary link.
    if (token) {
      const priv = await latestExe(PRIVATE_REPO, token);
      if (priv) {
        const file = await fetch(priv.asset.url, {
          headers: { Accept: 'application/octet-stream', Authorization: `Bearer ${token}`, 'User-Agent': 'overlay-download' },
          redirect: 'manual',
        });
        const link = file.headers.get('location');
        if (link) {
          // The link expires after a few minutes, so it is never cached.
          res.setHeader('Cache-Control', 'no-store');
          res.setHeader('Location', link);
          return res.status(302).end();
        }
      }
    }
  } catch {
    // Fall through to the friendly page below.
  }
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(503).send(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Overlay download</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f5f8;font-family:system-ui,sans-serif;color:#0d0f16">
<div style="text-align:center;max-width:380px;padding:24px"><h1 style="font-size:22px;margin:0 0 8px">The download is almost ready</h1>
<p style="color:#555a68;line-height:1.5;margin:0 0 20px">The newest Windows build is being published. Please try again in a few minutes.</p>
<a href="/" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#0d0f16;color:#fff;text-decoration:none;font-weight:600">Back to Overlay</a></div></body>`);
}
