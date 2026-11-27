// A shareable report, drawn as an image with Canvas 2D: a clean white card in
// the spirit of a Strava share, with the Overlay mark, today's focus, the week,
// your streak and (when there is any) the AI tokens you used. It opens in a
// white sheet with Download (saves a PNG) and Copy image.
import overlayMark from './assets/overlay-mark.png';

const ipc: any = (() => { try { return (window as any).require('electron').ipcRenderer; } catch { return null; } })();
const invoke = (ch: string, ...a: any[]) => (ipc ? ipc.invoke(ch, ...a) : Promise.resolve(null));

const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hm = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}h ${m}m` : `${m}m`; };
const tokens = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(Math.round(n)));
const esc = (v: string) => String(v).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Card palette: white paper, near-black ink, the brand blue for today.
const INK = '#131316', MUTED = '#7a7a76', LINE = '#e9e9e6', TILE = '#f6f6f4', BLUE = '#0027c4', BAR = '#d8d8d3';

function load(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = src; });
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
  g.closePath();
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
  await document.fonts.ready;
  const W = 1080, H = 1350, P = 88;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const font = (w: number, px: number) => `${w} ${px}px 'Instrument Sans Variable', 'Instrument Sans', system-ui, sans-serif`;
  const track = (px: number) => { try { (g as any).letterSpacing = `${px}px`; } catch {} };
  const text = (s: string, x: number, y: number, f: string, color: string, align: CanvasTextAlign = 'left', ls = 0) => {
    g.font = f; g.fillStyle = color; g.textAlign = align; track(ls); g.fillText(s, x, y); track(0);
  };

  // Paper
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);

  // Header: the mark on a blue tile, the name, the date on the right.
  const mark = await load(overlayMark);
  g.fillStyle = BLUE; roundRect(g, P, P, 64, 64, 18); g.fill();
  const mw = 40, mh = (40 * mark.height) / mark.width;
  g.drawImage(mark, P + (64 - mw) / 2, P + (64 - mh) / 2, mw, mh);
  text('Overlay', P + 84, P + 43, font(600, 32), INK, 'left', -0.5);
  const now = new Date();
  text(now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }), W - P, P + 43, font(500, 26), MUTED, 'right');

  // Headline: today's focus, big.
  const first = r.name.trim().split(/\s+/)[0] || '';
  text(first ? `${first}'s focus today` : 'Focus today', P, 300, font(500, 30), MUTED);
  text(r.today ? hm(r.today) : '0m', P - 6, 470, font(600, 188), INK, 'left', -8);
  text(r.today ? 'Locked in with Overlay' : 'A fresh start. Lock In from the notch.', P, 530, font(500, 28), MUTED);

  // Three stat tiles.
  const third: [string, string] = r.ai > 0 ? ['AI tokens today', tokens(r.ai)] : r.best.secs > 0 ? ['Best day', r.best.day] : ['Best day', 'Still to come'];
  const cells: [string, string][] = [['This week', r.week ? hm(r.week) : '0m'], ['Streak', `${r.streak} ${r.streak === 1 ? 'day' : 'days'}`], third];
  const gap = 20, tw = (W - P * 2 - gap * 2) / 3, ty = 610, th = 176;
  cells.forEach(([label, value], i) => {
    const x = P + i * (tw + gap);
    g.fillStyle = TILE; roundRect(g, x, ty, tw, th, 26); g.fill();
    g.strokeStyle = LINE; g.lineWidth = 2; roundRect(g, x + 1, ty + 1, tw - 2, th - 2, 25); g.stroke();
    text(label, x + 30, ty + 60, font(500, 24), MUTED);
    let size = 58; g.font = font(600, size);
    while (g.measureText(value).width > tw - 60 && size > 30) { size -= 2; g.font = font(600, size); }
    text(value, x + 28, ty + 134, font(600, size), INK, 'left', -1.5);
  });

  // The week, one bar a day, today in blue.
  const cy = 826, ch = 380;
  g.fillStyle = TILE; roundRect(g, P, cy, W - P * 2, ch, 26); g.fill();
  g.strokeStyle = LINE; g.lineWidth = 2; roundRect(g, P + 1, cy + 1, W - P * 2 - 2, ch - 2, 25); g.stroke();
  text('Last 7 days', P + 30, cy + 58, font(500, 24), MUTED);
  text(r.week ? `${hm(r.week)} in total` : 'No focus yet this week', W - P - 30, cy + 58, font(600, 24), INK, 'right');
  const max = Math.max(1, ...r.days.map((d) => d.secs));
  const left = P + 30, right = W - P - 30, base = cy + ch - 70, bh = 200, col = (right - left) / 7;
  r.days.forEach((d, i) => {
    const w = col * 0.5, x = left + i * col + (col - w) / 2;
    const h = d.secs ? Math.max(14, (d.secs / max) * bh) : 10;
    g.fillStyle = i === 6 ? BLUE : d.secs ? BAR : '#ebebe7';
    roundRect(g, x, base - h, w, h, Math.min(12, w / 2)); g.fill();
    text(d.label, x + w / 2, base + 42, font(i === 6 ? 600 : 500, 22), i === 6 ? INK : MUTED, 'center');
  });

  // Footer
  g.strokeStyle = LINE; g.lineWidth = 2; g.beginPath(); g.moveTo(P, H - 120); g.lineTo(W - P, H - 120); g.stroke();
  text('Made with Overlay for Windows', P, H - 70, font(500, 24), MUTED);
  text('overlay', W - P, H - 70, font(600, 26), INK, 'right', -0.5);
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
      <p>A card with today's focus, your week and your streak. Download it as a picture or copy it straight into a post or chat.</p>
      <dl class="ds-share-facts">
        <div><dt>Focus today</dt><dd>${r.today ? hm(r.today) : 'None yet'}</dd></div>
        <div><dt>This week</dt><dd>${r.week ? hm(r.week) : 'None yet'}</dd></div>
        <div><dt>Streak</dt><dd>${r.streak} ${r.streak === 1 ? 'day' : 'days'}</dd></div>
      </dl>
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
