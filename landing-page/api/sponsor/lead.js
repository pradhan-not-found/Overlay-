// POST /api/sponsor/lead — saves a sponsor as soon as they fill in the form, so the dashboard shows
// people who started checking out, not only those who paid. Only rows still "created" can change.
import { jsonBody, PRICES, sameOrigin, sbInsert, sbPatch } from '../_lib.js';

const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Blocked.' });
  const b = await jsonBody(req);
  const id = clean(b?.leadId, 36), product = clean(b?.product, 80), link = clean(b?.link, 200), description = clean(b?.description, 200), email = clean(b?.email, 160);
  if (!uuid.test(id) || !product || !link || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Missing details.' });
  const fields = { product, link: /^https?:\/\//i.test(link) ? link : `https://${link}`, description, email };
  const changed = await sbPatch('overlay_sponsors', `id=eq.${id}&status=eq.created`, fields);
  if (changed === 0) await sbInsert('overlay_sponsors', { id, ...fields, amount: PRICES.card.amount, currency: PRICES.card.currency, razorpay_order_id: `lead_${id}`, status: 'created' });
  return res.status(200).json({ ok: true });
}
