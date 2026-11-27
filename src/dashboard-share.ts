// A shareable report, drawn as an image with Canvas 2D: a dark, full-bleed card
// in the spirit of a Strava activity share. A huge focus time up top, a clean
// stats row, the last seven days as rounded bars with today lit in your accent
// colour, and the Overlay mark as the only branding. It opens in a sheet with
// Download (saves a PNG) and Copy image.
import overlayMark from './assets/overlay-mark.png';

const ipc: any = (() => { try { return (window as any).require('electron').ipcRenderer; } catch { return null; } })();
const invoke = (ch: string, ...a: any[]) => (ipc ? ipc.invoke(ch, ...a) : Promise.resolve(null));

const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hm = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}h ${m}m` : `${m}m`; };
const tokens = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(Math.round(n)));
const esc = (v: string) => String(v).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const FAMILY = `'Instrument Sans Variable', 'Instrument Sans', 'Segoe UI', system-ui, sans-serif`;
type RGB = [number, number, number];

function load(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = src; });
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// The user's accent (the Dashboard keeps it in --blue), as RGB.
function accent(): RGB {
  let v = '';
  try { v = getComputedStyle(document.documentElement).getPropertyValue('--blue').trim(); } catch {}
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(v);
  let hex = m ? m[1] : '3d6bff';
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
}
const mix = (a: RGB, b: RGB, t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t)) as RGB;
const rgba = (c: RGB, a = 1) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;
// Keep the accent bright enough to glow on near-black, whatever colour was picked.
function vivid(c: RGB): RGB {
  const lum = (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
  // on the white card a very light accent (white, yellow) would vanish, so it falls back to Overlay blue
  return lum > 0.72 ? [61, 107, 255] : c;
}

type Report = { today: number; week: number; streak: number; best: { day: string; secs: number }; days: { label: string; secs: number }[]; ai: number; name: string };

function report(stats: any, streak: number, name: string, ai: number): Report {
  const now = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - (6 - i));
    return { label: i === 6 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }), secs: stats[key(d)]?.totalSecs || 0, long: d.toLocaleDateString('en-US', { weekday: 'long' }) };
  });
  const best = days.reduce((a, b) => (b.secs > a.secs ? b : a), days[0]);
  return { today: days[6].secs, week: days.reduce((n, x) => n + x.secs, 0), streak, best: { day: best.long, secs: best.secs }, days, ai, name };
}

async function draw(r: Report): Promise<HTMLCanvasElement> {
  try { await Promise.all([500, 600, 700].map((w) => document.fonts.load(`${w} 40px 'Instrument Sans Variable'`))); } catch {}
  await document.fonts.ready;
  const W = 1080, H = 1350, P = 84;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const font = (w: number, px: number) => `${w} ${px}px ${FAMILY}`;
  const track = (px: number) => { try { (g as any).letterSpacing = `${px}px`; } catch {} };
  const tabular = (on: boolean) => { try { (g as any).fontVariantNumeric = on ? 'tabular-nums' : 'normal'; } catch {} };
  const text = (s: string, x: number, y: number, f: string, color: string, align: CanvasTextAlign = 'left', ls = 0) => {
    g.font = f; g.fillStyle = color; g.textAlign = align; track(ls); g.fillText(s, x, y); track(0);
  };
  const width = (s: string, f: string, ls = 0) => { g.font = f; track(ls); const w = g.measureText(s).width; track(0); return w; };

  const A = vivid(accent());
  // a white card: dark ink, the accent as a soft wash
  const WHITE = '#0d0f16', SOFT = 'rgba(13, 15, 22, 0.55)', FAINT = 'rgba(13, 15, 22, 0.42)', RULE = 'rgba(13, 15, 22, 0.08)';

  // Background: white, washed with the accent from the top-right corner.
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
  let glow = g.createRadialGradient(W * 0.95, -80, 40, W * 0.95, -80, 1150);
  glow.addColorStop(0, rgba(A, 0.22)); glow.addColorStop(0.45, rgba(A, 0.07)); glow.addColorStop(1, rgba(A, 0));
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  glow = g.createRadialGradient(-160, H + 120, 40, -160, H + 120, 950);
  glow.addColorStop(0, rgba(A, 0.1)); glow.addColorStop(1, rgba(A, 0));
  g.fillStyle = glow; g.fillRect(0, 0, W, H);

  // Header: the mark and wordmark, quiet, and the date on the right.
  const now = new Date();
  const mark = await load(overlayMark);
  const mw = 46, mh = (mw * mark.height) / mark.width, mid = P + mh / 2;
  // the mark is drawn white; turn it ink-dark on the white card
  g.save(); g.filter = 'invert(1) brightness(0.1)'; g.drawImage(mark, P, P, mw, mh); g.restore();
  text('Overlay', P + mw + 16, mid + 11, font(600, 30), WHITE, 'left', -0.6);
  tabular(true);
  text(now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), W - P, mid + 10, font(500, 26), SOFT, 'right');
  tabular(false);

  // Who and when.
  const first = r.name.trim().split(/\s+/)[0] || '';
  const when = `${now.toLocaleDateString('en-US', { weekday: 'long' })} · ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  text(first ? `${first}'s focus` : 'Focus time', P, 238, font(600, 38), WHITE, 'left', -0.6);
  text(when, P, 284, font(500, 26), FAINT);

  // Hero: the focus time, huge, with the units set smaller like a sports app.
  const heroY = 528;
  const parts: [string, boolean][] = [];
  const hh = Math.floor(r.today / 3600), mm = Math.floor((r.today % 3600) / 60);
  if (hh) parts.push([String(hh), true], ['h', false], [' ', false]);
  parts.push([String(mm), true], ['m', false]);
  const big = font(650, 256), unit = font(600, 108);
  tabular(true);
  let x = P - 10;
  for (const [s, isNum] of parts) {
    if (s === ' ') { x += 36; continue; }
    const f = isNum ? big : unit, ls = isNum ? -12 : -2;
    text(s, x, heroY, f, isNum ? WHITE : SOFT, 'left', ls);
    x += width(s, f, ls) + (isNum ? 6 : 0);
  }
  tabular(false);
  // a short accent bar and a one-line caption
  const capY = heroY + 72;
  const ul = g.createLinearGradient(P, 0, P + 56, 0);
  ul.addColorStop(0, rgba(mix(A, [255, 255, 255], 0.3))); ul.addColorStop(1, rgba(A));
  g.fillStyle = ul; roundRect(g, P, capY - 15, 48, 8, 4); g.fill();
  text(r.today ? 'Locked in today' : 'Ready to lock in', P + 66, capY - 3, font(600, 28), SOFT, 'left', -0.2);

  // Stats row: only the numbers worth showing.
  const stats: [string, string][] = [];
  if (r.week) stats.push(['This week', hm(r.week)]);
  if (r.streak > 0) stats.push(['Streak', `${r.streak} ${r.streak === 1 ? 'day' : 'days'}`]);
  if (r.ai > 0) stats.push(['AI tokens', tokens(r.ai)]);
  else if (r.best.secs > 0 && r.best.secs > r.today) stats.push(['Best day', r.best.day]);
  const rowY = 690, rowH = 164;
  if (stats.length) {
    g.fillStyle = RULE; g.fillRect(P, rowY, W - P * 2, 2); g.fillRect(P, rowY + rowH, W - P * 2, 2);
    const cw = (W - P * 2) / 3;
    stats.forEach(([label, value], i) => {
      const cx = P + i * cw + (i ? 40 : 0);
      if (i) { g.fillStyle = RULE; g.fillRect(P + i * cw, rowY + 36, 2, rowH - 72); }
      text(label.toUpperCase(), cx, rowY + 60, font(600, 21), FAINT, 'left', 2.4);
      let size = 60; const room = cw - (i ? 56 : 20);
      while (width(value, font(650, size), -1.5) > room && size > 34) size -= 2;
      tabular(true); text(value, cx, rowY + 128, font(650, size), WHITE, 'left', -1.5); tabular(false);
    });
  }

  // The week: seven rounded bars, today lit in the accent.
  const chartTop = stats.length ? rowY + rowH + 76 : rowY + 20;
  text('LAST 7 DAYS', P, chartTop, font(600, 21), FAINT, 'left', 2.4);
  if (r.week) { tabular(true); text(`${hm(r.week)} total`, W - P, chartTop, font(600, 24), SOFT, 'right'); tabular(false); }
  const base = H - P - 52, bh = base - (chartTop + 84);
  const max = Math.max(1, ...r.days.map((d) => d.secs));
  const col = (W - P * 2) / 7, bw = Math.min(80, col * 0.6);
  g.fillStyle = 'rgba(13, 15, 22, 0.05)';
  g.fillRect(P, base + 1, W - P * 2, 2);
  if (!r.week) {
    const cy = chartTop + 84 + bh / 2;
    text('A clean slate', W / 2, cy - 10, font(650, 52), WHITE, 'center', -1.2);
    text('Start a Lock In from the notch and this week fills in.', W / 2, cy + 44, font(500, 26), FAINT, 'center');
  }
  r.days.forEach((d, i) => {
    const bx = P + i * col + (col - bw) / 2, isToday = i === 6;
    const h = d.secs ? Math.max(bw * 0.45, (d.secs / max) * bh) : 10;
    if (isToday && d.secs) {
      const grad = g.createLinearGradient(0, base - h, 0, base);
      grad.addColorStop(0, rgba(mix(A, [255, 255, 255], 0.28))); grad.addColorStop(1, rgba(A));
      g.save(); g.shadowColor = rgba(A, 0.35); g.shadowBlur = 36;
      g.fillStyle = grad; roundRect(g, bx, base - h, bw, h, 16); g.fill(); g.restore();
      tabular(true); text(hm(d.secs), bx + bw / 2, base - h - 18, font(650, 25), WHITE, 'center', -0.4); tabular(false);
    } else {
      g.fillStyle = d.secs ? 'rgba(13, 15, 22, 0.14)' : isToday ? rgba(A, 0.6) : 'rgba(13, 15, 22, 0.07)';
      roundRect(g, bx, base - h, bw, h, d.secs ? 16 : 5); g.fill();
    }
    text(d.label, bx + bw / 2, base + 48, font(isToday ? 650 : 500, 23), isToday ? WHITE : FAINT, 'center');
  });
  return c;
}

const X = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>`;
const DOWN = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14"/></svg>`;
const COPY = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/></svg>`;

export async function openShare(stats: any, streak: number) {
  const [auth, snap]: any[] = await Promise.all([invoke('auth:state').catch(() => null), invoke('count:snapshot').catch(() => null)]);
  const r = report(stats, streak, auth?.name || '', snap?.today || 0);
  const canvas = await draw(r);
  const url = canvas.toDataURL('image/png');
  const file = `overlay-focus-${key(new Date())}.png`;

  document.getElementById('ds-share')?.remove();
  const box = document.createElement('div');
  box.id = 'ds-share';
  box.innerHTML = `<div class="ds-share-sheet" role="dialog" aria-label="Share your day">
    <img class="ds-share-img" src="${url}" alt="Your Overlay focus card"/>
    <div class="ds-share-side">
      <button type="button" class="ds-share-x" data-share="close" title="Close">${X}</button>
      <h2>Share your day</h2>
      <p>Today's focus, your week and your streak on one card, sized for Instagram, X and LinkedIn. Download it, or copy it straight into a post or chat.</p>
      <div class="ds-share-actions">
        <button type="button" class="ds-share-btn primary" data-share="save">${DOWN}<span>Download PNG</span></button>
        <button type="button" class="ds-share-btn" data-share="copy">${COPY}<span>Copy image</span></button>
        <span class="ds-share-note" data-share-note>${esc(file)}</span>
      </div>
    </div>
  </div>`;
  document.body.appendChild(box);
  const close = () => { box.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  box.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    const act = t.closest<HTMLElement>('[data-share]')?.dataset.share;
    const note = box.querySelector('[data-share-note]')!;
    if (act === 'close' || t === box) close();
    if (act === 'save') {
      canvas.toBlob((blob) => {
        if (!blob) { note.textContent = 'Could not make the picture.'; return; }
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href; a.download = file; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(href), 10_000);
        note.textContent = `Downloading ${file}`;
      }, 'image/png');
    }
    if (act === 'copy') {
      canvas.toBlob(async (blob) => {
        try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob! })]); note.textContent = 'Copied. Paste it anywhere.'; }
        catch { note.textContent = 'Could not copy. Download it instead.'; }
      }, 'image/png');
    }
  });
}
