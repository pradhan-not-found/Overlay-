// UPI on Overlay's own page: POST makes a single-use QR for the exact amount;
// GET ?id=qr_… asks the gateway whether it has been paid.
import { gatewayAuth, jsonBody, markPaid, readSponsor, sameOrigin, saveCheckout } from '../_lib.js';

const API = 'https://api.razorpay.com/v1/payments/qr_codes';

export default async function handler(req, res) {
  const auth = gatewayAuth();
  if (req.method === 'GET') {
    const id = String(req.query?.id || '');
    if (!auth || !/^qr_[A-Za-z0-9]+$/.test(id)) return res.status(400).json({ paid: false });
    const r = await fetch(`${API}/${id}/payments`, { headers: { Authorization: auth.header } });
    const list = await r.json().catch(() => null);
    const paid = list?.items?.find((p) => p.status === 'captured');
    if (paid) { await markPaid(id, paid.id, { amount: paid.amount }); return res.status(200).json({ paid: true, paymentId: paid.id }); }
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ paid: false });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Blocked.' });
  if (!auth) return res.status(503).json({ error: 'Payments are not set up yet.' });

  const sponsor = readSponsor(await jsonBody(req), 'upi');
  if (sponsor.error) return res.status(400).json({ error: sponsor.error });
  const closeBy = Math.floor(Date.now() / 1000) + 15 * 60;
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth.header },
    body: JSON.stringify({
      type: 'upi_qr', name: 'Overlay', usage: 'single_use', fixed_amount: true, payment_amount: sponsor.amount,
      description: `Overlay sponsor · ${sponsor.product}`.slice(0, 80), close_by: closeBy,
      notes: { purpose: 'Overlay sponsor', product: sponsor.product, email: sponsor.email, name: sponsor.name },
    }),
  });
  const qr = await r.json().catch(() => null);
  if (!r.ok || !qr?.id || !qr.image_url) {
    const off = r.status === 404 || /not (enabled|activated|allowed)|url was not found/i.test(qr?.error?.description || '');
    return res.status(off ? 409 : 502).json({ error: off ? "UPI isn't available yet. Please pay by card for now." : qr?.error?.description || "Couldn't make the QR code. Please try again." });
  }
  await saveCheckout(sponsor, qr.id);
  return res.status(200).json({ id: qr.id, image: qr.image_url, closeBy, amount: sponsor.amount });
}
