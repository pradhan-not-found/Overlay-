// POST /api/razorpay/order — starts a card (or UPI) payment for a sponsor spot. The secret key never leaves the server.
import { gatewayAuth, jsonBody, readSponsor, sameOrigin, saveCheckout } from '../_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Blocked.' });
  const auth = gatewayAuth();
  if (!auth) return res.status(503).json({ error: 'Payments are not set up yet.' });

  const body = await jsonBody(req);
  // card in USD, or UPI in INR through the same payment window
  const sponsor = readSponsor(body, body?.method === 'upi' ? 'upi' : 'card');
  if (sponsor.error) return res.status(400).json({ error: sponsor.error });

  const r = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth.header },
    body: JSON.stringify({
      amount: sponsor.amount, currency: sponsor.currency, receipt: 'overlay_' + Date.now(),
      notes: { purpose: 'Overlay sponsor', product: sponsor.product, link: sponsor.link, email: sponsor.email, name: sponsor.name },
    }),
  });
  const order = await r.json().catch(() => null);
  if (!r.ok || !order?.id) return res.status(502).json({ error: order?.error?.description || 'Could not start the payment.' });

  await saveCheckout(sponsor, order.id);
  return res.status(200).json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: auth.keyId });
}
