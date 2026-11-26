// GET /api/sponsors — the sponsors shown on the site: paid and featured only, and only their name
// and link. No email, phone, address or payment detail ever leaves the server.
import { sbSelect } from './_lib.js';

export default async function handler(req, res) {
  const rows = await sbSelect('overlay_sponsors', 'select=product,link&featured=eq.true&status=eq.featured&order=paid_at.asc&limit=24');
  const sponsors = rows.flatMap((r) => {
    const name = String(r.product || '').trim().slice(0, 60);
    let link = '';
    try { const u = new URL(String(r.link || '')); if (u.protocol === 'https:' || u.protocol === 'http:') link = u.href; } catch { /* no link */ }
    return name ? [{ name, link, host: link ? new URL(link).hostname : '' }] : [];
  });
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
  return res.status(200).json({ sponsors });
}
