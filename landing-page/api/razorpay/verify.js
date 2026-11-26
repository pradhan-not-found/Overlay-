// POST /api/razorpay/verify — confirms a card payment really came from Razorpay by its signature.
import { jsonBody, PAID, sameOrigin, sbPatch, signatureOk } from '../_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ verified: false });
  if (!sameOrigin(req)) return res.status(403).json({ verified: false });
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return res.status(503).json({ verified: false });
  const b = await jsonBody(req);
  const orderId = b?.razorpay_order_id, paymentId = b?.razorpay_payment_id, signature = b?.razorpay_signature;
  if (!orderId || !paymentId || !signature) return res.status(400).json({ verified: false });
  const verified = signatureOk(secret, `${orderId}|${paymentId}`, signature);
  // the webhook may have recorded it already; only rows still waiting move
  if (verified) await sbPatch('overlay_sponsors', `razorpay_order_id=eq.${encodeURIComponent(orderId)}&status=in.(created,failed)`, { ...PAID(), razorpay_payment_id: paymentId });
  return res.status(verified ? 200 : 400).json({ verified, paymentId: verified ? paymentId : undefined });
}
