// POST /api/visit — adds one to today's visit counter for a page. Only totals are kept: the page,
// the country Vercel reports, the device type and the referring site. Nothing personal.
import { country, jsonBody, sbRpc } from './_lib.js';

const PAGES = new Set(['/', '/features', '/pricing', '/changelog', '/privacy', '/terms', '/sponsor', '/sponsors']);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).end();
  const b = (await jsonBody(req)) || {};
  const path = PAGES.has(b.path) ? b.path : '/';
  const ua = String(req.headers['user-agent'] || '');
  if (/bot|crawl|spider|preview|headless/i.test(ua)) return res.status(204).end();
  const device = /ipad|tablet/i.test(ua) ? 'tablet' : /mobi|android|iphone/i.test(ua) ? 'mobile' : 'desktop';
  let referrer = '';
  try { const r = new URL(String(b.referrer || '')); if (r.host !== req.headers.host) referrer = r.hostname.replace(/^www\./, ''); } catch { /* direct */ }
  await sbRpc('overlay_track_visit', { p_path: path, p_country: country(req), p_device: device, p_referrer: referrer });
  return res.status(204).end();
}
