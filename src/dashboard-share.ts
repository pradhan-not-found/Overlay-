// A shareable report, drawn as an image: the Overlay mark, today's focus, the
// week, your streak and the AI tokens you used. Copy it or save it as a PNG.
import overlayMark from './assets/overlay-mark.png';

const ipc: any = (() => { try { return (window as any).require('electron').ipcRenderer; } catch { return null; } })();
const invoke = (ch: string, ...a: any[]) => (ipc ? ipc.invoke(ch, ...a) : Promise.resolve(null));

const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hm = (s: number) => { const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h ? `${h}h ${m}m` : `${m}m`; };
const tokens = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(Math.round(n)));

function load(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = src; });
}

async function draw(stats: any, streak: number, name: string): Promise<HTMLCanvasElement> {
  await document.fonts.ready;
  const W = 1080, H = 1350, S = 1;
  const c = document.createElement('canvas');
  c.width = W * S; c.height = H * S;
  const g = c.getContext('2d')!;
  const font = (w: number, px: number) => `${w} ${px}px 'Instrument Sans Variable', 'Instrument Sans', system-ui, sans-serif`;

  // Background: deep blue to black, like the brand panel.
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0027c4'); bg.addColorStop(0.55, '#06123f'); bg.addColorStop(1, '#030308');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W * 0.85, H * 0.12, 0, W * 0.85, H * 0.12, 520);
  glow.addColorStop(0, 'rgba(120,150,255,0.35)'); glow.addColorStop(1, 'rgba(120,150,255,0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);

  // Header: mark, name, date
  const mark = await load(overlayMark);
  g.drawImage(mark, 80, 84, 56, 56 * mark.height / mark.width);
  g.fillStyle = '#fff'; g.font = font(600, 34); g.fillText('Overlay', 152, 124);
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.font = font(500, 26);
  const today = new Date();
  g.textAlign = 'right';
  g.fillText(today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }), W - 80, 122);
  g.textAlign = 'left';

  // Headline
  const tk = key(today);
  const todaySecs = stats[tk]?.totalSecs || 0;
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.font = font(600, 24);
  g.fillText('FOCUSED TODAY', 80, 300);
  g.fillStyle = '#fff'; g.font = font(600, 150);
  g.fillText(hm(todaySecs), 72, 450);
  g.fillStyle = 'rgba(255,255,255,0.7)'; g.font = font(500, 30);
  g.fillText(name ? `${name.split(' ')[0]}'s day, at the top of the screen.` : 'A day at the top of the screen.', 80, 510);

  // Week bars
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() - (6 - i)); return { d, s: stats[key(d)]?.totalSecs || 0 }; });
  const max = Math.max(1, ...days.map((x) => x.s));
  const bx = 80, by = 900, bw = (W - 160) / 7, bh = 280;
  days.forEach((x, i) => {
    const h = Math.max(8, (x.s / max) * bh);
    const left = bx + i * bw + bw * 0.2, w = bw * 0.6;
    g.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(g, left, by - bh, w, bh, 14); g.fill();
    g.fillStyle = i === 6 ? '#ffffff' : 'rgba(255,255,255,0.42)';
    roundRect(g, left, by - h, w, h, 14); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.font = font(600, 22); g.textAlign = 'center';
    g.fillText(x.d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(), left + w / 2, by + 42);
  });
  g.textAlign = 'left';

  // Stat row
  const snap: any = await invoke('count:snapshot').catch(() => null);
  const weekSecs = days.reduce((n, x) => n + x.s, 0);
  const cells: [string, string][] = [
    ['This week', hm(weekSecs)],
    ['Streak', `${streak} ${streak === 1 ? 'day' : 'days'}`],
    ['AI tokens today', snap ? tokens(snap.today || 0) : '—'],
  ];
  const cy = 1080, cw = (W - 160) / 3;
  g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(80, cy - 40); g.lineTo(W - 80, cy - 40); g.stroke();
  cells.forEach(([label, value], i) => {
    const x = 80 + i * cw;
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.font = font(600, 22); g.fillText(label.toUpperCase(), x, cy + 8);
    g.fillStyle = '#fff'; g.font = font(600, 54); g.fillText(value, x, cy + 78);
  });

  // Footer
  g.fillStyle = 'rgba(255,255,255,0.45)'; g.font = font(500, 22);
  const top = snap?.models?.[0]?.model;
  g.fillText(top ? `Most used model: ${top}` : 'Made with Overlay for Windows', 80, H - 80);
  g.textAlign = 'right'; g.fillText('overlay', W - 80, H - 80); g.textAlign = 'left';
  return c;
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export async function openShare(stats: any, streak: number) {
  const auth: any = (await invoke('auth:state')) || {};
  const canvas = await draw(stats, streak, auth.name || '');
  const url = canvas.toDataURL('image/png');
  document.getElementById('ds-share')?.remove();
  const box = document.createElement('div');
  box.id = 'ds-share';
  box.innerHTML = `<div class="ds-share-card">
    <img src="${url}" alt="Your Overlay report"/>
    <div class="ds-share-actions">
      <button type="button" class="ds-btn ghost" data-share="close">Close</button>
      <span class="ds-share-note" data-share-note></span>
      <button type="button" class="ds-btn" data-share="copy">Copy image</button>
      <button type="button" class="ds-btn primary" data-share="save">Save PNG</button>
    </div>
  </div>`;
  document.body.appendChild(box);
  box.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    const act = t.closest<HTMLElement>('[data-share]')?.dataset.share;
    const note = box.querySelector('[data-share-note]')!;
    if (act === 'close' || t === box) box.remove();
    if (act === 'save') {
      const a = document.createElement('a');
      a.href = url; a.download = `overlay-report-${key(new Date())}.png`; a.click();
      note.textContent = 'Saved.';
    }
    if (act === 'copy') {
      canvas.toBlob(async (blob) => {
        try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob! })]); note.textContent = 'Copied. Paste it anywhere.'; }
        catch { note.textContent = 'Could not copy. Save it instead.'; }
      }, 'image/png');
    }
  });
}
