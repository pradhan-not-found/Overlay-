// POST /api/razorpay/webhook — payment events from Razorpay, server to server. This marks a sponsor
// paid even if they close the tab before the page confirms it. Every call is checked against
// RAZORPAY_WEBHOOK_SECRET, and only Overlay's own rows can change.
import { PAID, rawBody, sbPatch, signatureOk } from '../_lib.js';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ error: 'Webhook secret is not set.' });
  const raw = await rawBody(req);
  if (!signatureOk(secret, raw, req.headers['x-razorpay-signature'])) return res.status(401).json({ error: 'Bad signature.' });

  let event;
  try { event = JSON.parse(raw); } catch { return res.status(400).json({ error: 'Bad body.' }); }
  const payment = event.payload?.payment?.entity, order = event.payload?.order?.entity, refund = event.payload?.refund?.entity;
  const orderId = encodeURIComponent(payment?.order_id || order?.id || '');

  switch (event.event) {
    case 'payment.captured':
    case 'order.paid':
      if (orderId && payment?.id) await sbPatch('overlay_sponsors', `razorpay_order_id=eq.${orderId}&status=in.(created,failed)`, {
        ...PAID(), razorpay_payment_id: payment.id, ...(payment.amount ? { amount: payment.amount } : {}), ...(payment.currency ? { currency: payment.currency } : {}),
      });
      break;
    case 'qr_code.credited': {
      const qrId = encodeURIComponent(event.payload?.qr_code?.entity?.id || '');
      if (qrId && payment?.id) await sbPatch('overlay_sponsors', `razorpay_order_id=eq.${qrId}&status=in.(created,failed)`, { ...PAID(), razorpay_payment_id: payment.id, ...(payment.amount ? { amount: payment.amount } : {}) });
      break;
    }
    case 'payment.failed':
      if (orderId) await sbPatch('overlay_sponsors', `razorpay_order_id=eq.${orderId}&status=eq.created`, { status: 'failed' });
      break;
    case 'refund.processed':
    case 'payment.refunded': {
      const pid = encodeURIComponent(refund?.payment_id || payment?.id || '');
      if (pid) await sbPatch('overlay_sponsors', `razorpay_payment_id=eq.${pid}`, { status: 'refunded', featured: false });
      break;
    }
  }
  // always acknowledge, so the gateway does not retry events that are not ours
  return res.status(200).json({ ok: true });
}
