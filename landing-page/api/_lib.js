// Shared server helpers for the website's functions. Files starting with "_"
// are not exposed as routes by Vercel.
import { createHmac, timingSafeEqual } from 'node:crypto';

// ── Supabase over REST, with the secret key (server only) ──────────────────
const sbUrl = () => (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const sbKey = () => process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const supabaseReady = () => Boolean(sbUrl() && sbKey());
const sbHeaders = (extra = {}) => ({ apikey: sbKey(), Authorization: `Bearer ${sbKey()}`, 'Content-Type': 'application/json', ...extra });

export async function sbInsert(table, row) {
  if (!supabaseReady()) return false;
  try {
    const r = await fetch(`${sbUrl()}/rest/v1/${table}`, { method: 'POST', headers: sbHeaders({ Prefer: 'return=minimal' }), body: JSON.stringify(row) });
    if (!r.ok) console.error('supabase insert failed', table, r.status, await r.text());
    return r.ok;
  } catch (e) { console.error('supabase insert error', table, e); return false; }
}

/** Updates rows matching a PostgREST filter; returns how many changed, or null on error. */
export async function sbPatch(table, filter, patch) {
  if (!supabaseReady()) return null;
  try {
    const r = await fetch(`${sbUrl()}/rest/v1/${table}?${filter}`, { method: 'PATCH', headers: sbHeaders({ Prefer: 'return=representation' }), body: JSON.stringify(patch) });
    if (!r.ok) { console.error('supabase patch failed', table, r.status, await r.text()); return null; }
    return (await r.json()).length;
  } catch (e) { console.error('supabase patch error', table, e); return null; }
}

export async function sbSelect(table, query) {
  if (!supabaseReady()) return [];
  try {
    const r = await fetch(`${sbUrl()}/rest/v1/${table}?${query}`, { headers: sbHeaders() });
    return r.ok ? await r.json() : [];
  } catch { return []; }
}

export async function sbRpc(name, args) {
  if (!supabaseReady()) return;
  try { await fetch(`${sbUrl()}/rest/v1/rpc/${name}`, { method: 'POST', headers: sbHeaders(), body: JSON.stringify(args) }); } catch { /* counting never blocks a page */ }
}

// ── Razorpay ───────────────────────────────────────────────────────────────
export const gatewayAuth = () => {
  const id = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;
  return id && secret ? { keyId: id, header: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64') } : null;
};
export function signatureOk(secret, payload, given) {
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(String(given || ''));
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── Prices, fixed on the server ────────────────────────────────────────────
export const PRICES = { card: { amount: 4999, currency: 'USD' }, upi: { amount: 419900, currency: 'INR' } };
// Razorpay's own smallest payment: 10 cents, or one rupee
export const MIN = { card: 10, upi: 100 };
// no ceiling of our own: the sponsor gives what they like; Razorpay and the bank apply their limits
export const MAX = { card: Number.MAX_SAFE_INTEGER, upi: Number.MAX_SAFE_INTEGER };

const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Reads and checks the sponsor form. The amount is decided here, never trusted from the page. */
export function readSponsor(body, method) {
  const price = PRICES[method];
  const s = {
    method, product: clean(body?.product, 80), link: clean(body?.link, 200), description: clean(body?.description, 200),
    email: clean(body?.email, 160), name: clean(body?.name, 80), phone: clean(body?.phone, 24),
    country: clean(body?.country, 60), address: clean(body?.address, 200), leadId: clean(body?.leadId, 36),
  };
  if (!s.product) return { error: 'Add your product name.' };
  if (!/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(s.link)) return { error: 'Add a valid link, like example.com.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) return { error: 'Add a valid email so we can reach you.' };
  if (!s.name) return { error: 'Add your full name.' };
  if (!s.address) return { error: 'Add your billing address.' };
  const asked = Number(body?.amount);
  // the sponsor picks the amount; anything outside the range is refused, never silently changed
  if (body?.amount === undefined || body?.amount === null || body?.amount === '') s.amount = price.amount;
  else if (Number.isInteger(asked) && asked >= MIN[method] && asked <= MAX[method]) s.amount = asked;
  else return { error: method === 'card' ? "Razorpay's smallest card payment is $0.10." : "Razorpay's smallest UPI payment is ₹1." };
  s.currency = price.currency;
  return s;
}

/** Records the checkout against the gateway reference, on the row saved when the form was filled. */
export async function saveCheckout(s, reference) {
  const row = {
    product: s.product, link: /^https?:\/\//i.test(s.link) ? s.link : `https://${s.link}`, description: s.description, email: s.email,
    name: s.name, phone: s.phone || null, country: s.country, address: s.address,
    amount: s.amount, currency: s.currency, razorpay_order_id: reference, status: 'created',
    note: `Method: ${s.method === 'upi' ? 'UPI' : 'card'}`,
  };
  const linked = /^[0-9a-f-]{36}$/i.test(s.leadId) ? await sbPatch('overlay_sponsors', `id=eq.${s.leadId}&status=eq.created`, row) : 0;
  if (!linked) await sbInsert('overlay_sponsors', row);
}

/** A paid sponsor goes straight onto the site; the dashboard can still take it off or reject it. */
export const PAID = () => ({ status: 'featured', featured: true, paid_at: new Date().toISOString() });

export const markPaid = (reference, paymentId, extra = {}) =>
  sbPatch('overlay_sponsors', `razorpay_order_id=eq.${encodeURIComponent(reference)}&status=in.(created,failed)`, { ...PAID(), razorpay_payment_id: paymentId, ...extra });

// ── Requests ───────────────────────────────────────────────────────────────
export async function jsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(typeof req.body === 'string' ? req.body : await rawBody(req)); } catch { return null; }
}
export function rawBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}
/** Only this site's own pages may start a checkout. */
export function sameOrigin(req) {
  const origin = req.headers.origin, host = req.headers.host;
  if (!origin || !host) return true;
  try { return new URL(origin).host === host; } catch { return false; }
}
export const country = (req) => String(req.headers['x-vercel-ip-country'] || '').toUpperCase();
