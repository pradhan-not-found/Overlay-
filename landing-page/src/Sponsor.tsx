import './sponsor.css';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

/* ── Shared: the current sponsors, name and link only ─────────────────── */
export type PublicSponsor = { name: string; link: string; host: string };
let cache: Promise<PublicSponsor[]> | null = null;
export function loadSponsors(): Promise<PublicSponsor[]> {
  cache ||= fetch('/api/sponsors').then((r) => (r.ok ? r.json() : { sponsors: [] })).then((d) => d.sponsors || []).catch(() => []);
  return cache;
}
export function useSponsors() {
  const [list, setList] = useState<PublicSponsor[]>([]);
  useEffect(() => { let live = true; void loadSponsors().then((s) => live && setList(s)); return () => { live = false; }; }, []);
  return list;
}
const icon = (host: string) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;

/* ── Hero: overlapping sponsor circles and a "+" that leads to /sponsor ── */
export function SponsorStrip({ onOpen }: { onOpen: (e: React.MouseEvent) => void }) {
  const sponsors = useSponsors();
  const shown = sponsors.slice(0, 4);
  return (
    <a className="sp-strip" href="/sponsor" onClick={onOpen} aria-label="Become a sponsor of Overlay">
      <span className="sp-stack">
        {shown.length
          ? shown.map((s, i) => <span className="sp-dot" key={s.name + i} style={{ zIndex: 10 - i }} title={s.name}>{s.host ? <img src={icon(s.host)} alt="" /> : <b>{s.name.charAt(0)}</b>}</span>)
          : [0, 1, 2].map((i) => <span className={`sp-dot ghost g${i}`} key={i} style={{ zIndex: 10 - i }} />)}
        <span className="sp-dot sp-plus" style={{ zIndex: 1 }}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v12M6 12h12" /></svg>
        </span>
      </span>
      <span className="sp-label">{shown.length ? `${sponsors.length} sponsor${sponsors.length === 1 ? '' : 's'} · ` : ''}Be our sponsor</span>
      <span className="sp-tip" role="tooltip">Put your product in front of everyone who uses Overlay</span>
    </a>
  );
}

/* ── The /sponsor checkout ─────────────────────────────────────────────── */
type Method = 'card' | 'upi';
const AMOUNTS: Record<Method, number[]> = { card: [4999, 9900, 19900], upi: [419900, 829900, 1659900] };
const money = (minor: number, m: Method) => new Intl.NumberFormat(m === 'upi' ? 'en-IN' : 'en-US', { style: 'currency', currency: m === 'upi' ? 'INR' : 'USD', minimumFractionDigits: m === 'upi' || minor % 100 === 0 ? 0 : 2 }).format(minor / 100);
const KEY = 'overlay-sponsor';

type RzpInstance = { open: () => void; on: (e: string, fn: (d: { error?: { description?: string } }) => void) => void };
declare global { interface Window { Razorpay?: new (o: Record<string, unknown>) => RzpInstance } }
let rzp: Promise<boolean> | null = null;
const unlockScroll = () => { for (const el of [document.body, document.documentElement]) { el.style.overflow = ''; el.style.position = ''; el.style.top = ''; el.style.height = ''; } };
const loadRazorpay = () => (rzp ||= new Promise<boolean>((resolve) => {
  const s = document.createElement('script');
  s.src = 'https://checkout.razorpay.com/v1/checkout.js';
  s.onload = () => resolve(true);
  s.onerror = () => { rzp = null; resolve(false); };
  document.body.appendChild(s);
}));

type Details = { product: string; link: string; description: string; email: string; name: string; phone: string; country: string; address: string; leadId: string };
const empty: Details = { product: '', link: '', description: '', email: '', name: '', phone: '', country: '', address: '', leadId: '' };

export function SponsorPage({ onHome }: { onHome: () => void }) {
  const sponsors = useSponsors();
  const [d, setD] = useState<Details>(() => { try { return { ...empty, ...JSON.parse(sessionStorage.getItem(KEY) || '{}') }; } catch { return empty; } });
  const [step, setStep] = useState<'details' | 'pay' | 'done'>('details');
  const [method, setMethod] = useState<Method>('card');
  const [amount, setAmount] = useState<number>(AMOUNTS.card[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [qr, setQr] = useState<{ id: string; image: string; closeBy: number } | null>(null);
  const poll = useRef(0);

  useEffect(() => { setAmount(AMOUNTS[method][0]); setQr(null); setError(''); }, [method]);
  useEffect(() => () => window.clearInterval(poll.current), []);
  const set = (k: keyof Details) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setD((x) => ({ ...x, [k]: e.target.value }));

  const toPay = (e: FormEvent) => {
    e.preventDefault();
    const leadId = d.leadId || crypto.randomUUID();
    const next = { ...d, leadId };
    setD(next);
    try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode */ }
    void fetch('/api/sponsor/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next), keepalive: true }).catch(() => {});
    setStep('pay');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const done = () => { window.clearInterval(poll.current); try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } setStep('done'); };

  const payCard = async () => {
    setBusy(true); setError('');
    try {
      const [ok, r] = await Promise.all([loadRazorpay(), fetch('/api/razorpay/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...d, amount, method: 'card' }) })]);
      const order = await r.json();
      if (!r.ok) throw new Error(order.error || "Couldn't start the payment.");
      if (!ok || !window.Razorpay) throw new Error("The payment window couldn't load. Check your connection.");
      const pay = new window.Razorpay({
        key: order.keyId, order_id: order.orderId, amount: order.amount, currency: order.currency,
        // Overlay's own name, logo and colour at the top of the payment window
        name: 'Overlay', description: `Sponsor · ${d.product}`, image: `${location.origin}/logo.png`,
        // reuse what the sponsor already typed, so the window asks only for the card
        prefill: { name: d.name, email: d.email, ...(d.phone.trim() ? { contact: d.phone.replace(/\s/g, '') } : {}) },
        readonly: { email: true, ...(d.phone.trim() ? { contact: true } : {}) },
        hidden: { email: true, ...(d.phone.trim() ? { contact: true } : {}) },
        remember_customer: false,
        notes: { product: d.product },
        theme: { color: '#0027c4', backdrop_color: 'rgba(244, 245, 248, 0.92)' },
        config: { display: { blocks: { card: { name: 'Pay by card', instruments: [{ method: 'card' }] } }, sequence: ['block.card'], preferences: { show_default_blocks: false } } },
        handler: async (res: Record<string, string>) => {
          unlockScroll();
          const v = await fetch('/api/razorpay/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(res) });
          if (v.ok) done(); else setError('We could not confirm the payment. If you were charged, it will be confirmed by email shortly.');
        },
        modal: { ondismiss: () => { unlockScroll(); setBusy(false); } },
      });
      pay.on('payment.failed', (x) => { unlockScroll(); setError(x.error?.description || 'The payment did not go through.'); setBusy(false); });
      pay.open();
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); setBusy(false); }
  };

  const payUpi = async () => {
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/razorpay/upi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...d, amount, method: 'upi' }) });
      const q = await r.json();
      if (!r.ok) throw new Error(q.error || "Couldn't make the QR code.");
      setQr(q);
      window.clearInterval(poll.current);
      poll.current = window.setInterval(async () => {
        if (Date.now() / 1000 > q.closeBy) { window.clearInterval(poll.current); setQr(null); setError('That QR code expired. Make a new one.'); return; }
        const c = await fetch(`/api/razorpay/upi?id=${q.id}`).then((x) => x.json()).catch(() => null);
        if (c?.paid) done();
      }, 3000);
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); }
    setBusy(false);
  };

  return (
    <section className="page sp-page">
      <div className="sp-grid">
        <div className="sp-pitch">
          <span className="sp-kicker">Sponsor Overlay</span>
          <h2>Put your product at the top of every screen.</h2>
          <p>Overlay lives above people's work all day. Sponsors are shown on our website with their logo and a link, for as long as Overlay is around.</p>
          <ul className="sp-gets">
            <li><b>Your logo and link</b> on the Overlay website, in the sponsor row under the download.</li>
            <li><b>A thank-you</b> in the changelog and on our socials.</li>
            <li><b>Lifetime</b> placement, from a single payment.</li>
          </ul>
          <div className="sp-price"><b>{money(AMOUNTS.card[0], 'card')}</b><span>once · or {money(AMOUNTS.upi[0], 'upi')} by UPI</span></div>
          {sponsors.length > 0 && (
            <div className="sp-current">
              <span>Our sponsors</span>
              <div>{sponsors.map((s) => <a key={s.name} href={s.link || undefined} target="_blank" rel="noopener sponsored">{s.host && <img src={icon(s.host)} alt="" />}{s.name}</a>)}</div>
            </div>
          )}
        </div>

        <div className="sp-box">
          {step === 'details' && (
            <form onSubmit={toPay} className="sp-form">
              <div className="sp-steps"><b className="on">1 · Your product</b><b>2 · Payment</b></div>
              <label><span>Product name</span><input required maxLength={80} value={d.product} onChange={set('product')} placeholder="Acme Studio" /></label>
              <label><span>Link</span><input required maxLength={200} value={d.link} onChange={set('link')} placeholder="acme.com" inputMode="url" /></label>
              <label><span>Short description <em>{d.description.length}/200</em></span><textarea maxLength={200} rows={2} value={d.description} onChange={set('description')} placeholder="What your product does, in a sentence." /></label>
              <label><span>Email</span><input required type="email" maxLength={160} value={d.email} onChange={set('email')} placeholder="you@acme.com" /></label>
              <div className="sp-two">
                <label><span>Full name</span><input required maxLength={80} value={d.name} onChange={set('name')} placeholder="Your name" /></label>
                <label><span>Phone <em>optional</em></span><input maxLength={24} value={d.phone} onChange={set('phone')} placeholder="+91 98765 43210" inputMode="tel" /></label>
              </div>
              <div className="sp-two">
                <label><span>Country</span><input required maxLength={60} value={d.country} onChange={set('country')} placeholder="India" /></label>
                <label><span>Billing address</span><input required maxLength={200} value={d.address} onChange={set('address')} placeholder="Street, city, postcode" /></label>
              </div>
              <button type="submit" className="sp-go">Continue to payment</button>
            </form>
          )}

          {step === 'pay' && (
            <div className="sp-pay">
              <div className="sp-steps"><b>1 · Your product</b><b className="on">2 · Payment</b></div>
              <div className="sp-summary"><span>{d.product}</span><button type="button" onClick={() => setStep('details')}>Edit</button></div>
              <div className="sp-methods" role="radiogroup" aria-label="Payment method">
                <button type="button" role="radio" aria-checked={method === 'card'} className={method === 'card' ? 'on' : ''} onClick={() => setMethod('card')}><b>Card</b><small>USD · any country</small></button>
                <button type="button" role="radio" aria-checked={method === 'upi'} className={method === 'upi' ? 'on' : ''} onClick={() => setMethod('upi')}><b>UPI</b><small>INR · India</small></button>
              </div>
              <div className="sp-amounts">
                {AMOUNTS[method].map((a) => <button type="button" key={a} className={amount === a ? 'on' : ''} onClick={() => { setAmount(a); setQr(null); }}>{money(a, method)}</button>)}
              </div>
              {qr ? (
                <div className="sp-qr"><img src={qr.image} alt="UPI QR code" /><p>Scan with any UPI app. This page updates by itself when the payment arrives.</p></div>
              ) : (
                <button type="button" className="sp-go" disabled={busy} onClick={method === 'card' ? payCard : payUpi}>
                  {busy ? 'Starting…' : method === 'card' ? `Pay ${money(amount, 'card')}` : `Show UPI QR for ${money(amount, 'upi')}`}
                </button>
              )}
              {error && <p className="sp-error">{error}</p>}
              <p className="sp-secure">Payments are handled by Razorpay. Overlay never sees your card details.</p>
            </div>
          )}

          {step === 'done' && (
            <div className="sp-done">
              <span className="sp-check"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg></span>
              <h3>Thank you for sponsoring Overlay</h3>
              <p>Your payment is confirmed and {d.product || 'your product'} is now on the site. We'll be in touch at {d.email || 'your email'}.</p>
              <button type="button" className="sp-go" onClick={onHome}>Back to Overlay</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
