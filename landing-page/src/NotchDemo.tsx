import { useEffect, useRef, useState } from 'react';
import { CLAUDE, GCAL, GITHUB, OPENAI } from './brand/marks';

/**
 * The Overlay notch as it looks after you install it, in the app's own pixel
 * sizes on a 1000px-wide screen. Click it to open; the dock switches tools,
 * just like the app.
 *
 * Music plays with nothing else on screen. If /song.mp3 exists (a track you
 * have the rights to), that plays from 0:18 as "Just a Boy". Otherwise a short
 * ambient loop is generated in the browser and labelled as such.
 */

const SONG = {
  file: '/song.mp3',
  start: 18,
  title: 'Just a Boy',
  artist: 'DrINsaNE',
  art: 'https://i.ytimg.com/vi/q8bP3DW8EpY/hqdefault.jpg',
};
const LOOP = { start: 18, length: 205, title: 'Night Drive', artist: 'Overlay Sessions' };

/** A gentle four-chord pad, scheduled ahead in the Web Audio clock. */
function createPad() {
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1400;
  filter.Q.value = 0.4;
  master.connect(filter).connect(ctx.destination);
  const chords = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 52, 55, 60], [55, 59, 62, 67]];
  const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
  const BAR = 2.4;
  let next = ctx.currentTime + 0.05;
  let step = 0;
  const schedule = () => {
    while (next < ctx.currentTime + 1.2) {
      const chord = chords[step % chords.length];
      chord.forEach((note, k) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = k === 0 ? 'triangle' : 'sine';
        osc.frequency.value = hz(k === 0 ? note - 12 : note);
        g.gain.setValueAtTime(0, next);
        g.gain.linearRampToValueAtTime(k === 0 ? 0.12 : 0.06, next + 0.35);
        g.gain.linearRampToValueAtTime(0.0001, next + BAR + 0.6);
        osc.connect(g).connect(master);
        osc.start(next);
        osc.stop(next + BAR + 0.7);
      });
      // A soft pluck on the off-beat keeps it moving.
      [0.6, 1.8].forEach((off, k) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = hz(chord[(k + step) % 4] + 12);
        g.gain.setValueAtTime(0.05, next + off);
        g.gain.exponentialRampToValueAtTime(0.0001, next + off + 0.5);
        osc.connect(g).connect(master);
        osc.start(next + off);
        osc.stop(next + off + 0.55);
      });
      next += BAR;
      step += 1;
    }
  };
  const timer = window.setInterval(schedule, 250);
  schedule();
  let volume = 0.62;
  return {
    setVolume(v: number) { volume = v; if (ctx.state === 'running') { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.linearRampToValueAtTime(1.4 * v, ctx.currentTime + 0.08); } },
    play() { void ctx.resume(); master.gain.cancelScheduledValues(ctx.currentTime); master.gain.linearRampToValueAtTime(1.4 * volume, ctx.currentTime + 0.4); },
    pause() { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25); window.setTimeout(() => void ctx.suspend(), 300); },
    close() { window.clearInterval(timer); void ctx.close(); },
  };
}

export type Space = 'overview' | 'media' | 'focus' | 'today' | 'ai' | 'todos' | 'note' | 'clipboard' | 'hardware' | 'weather' | 'clocks' | 'calc' | 'shelf' | 'colour' | 'launcher' | 'github' | 'settings';

const I = (d: string, fill = false) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...(fill ? { fill: 'currentColor' } : { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const })}>
    <path d={d} />
  </svg>
);
const PLAY = 'M7 5.6v12.8a1.3 1.3 0 0 0 1.98 1.1l10.2-6.4a1.3 1.3 0 0 0 0-2.2L8.98 4.5A1.3 1.3 0 0 0 7 5.6Z';
const PAUSE = 'M7.4 4.5h1.4A1.4 1.4 0 0 1 10.2 5.9v12.2a1.4 1.4 0 0 1-1.4 1.4H7.4A1.4 1.4 0 0 1 6 18.1V5.9a1.4 1.4 0 0 1 1.4-1.4Zm7.8 0h1.4A1.4 1.4 0 0 1 18 5.9v12.2a1.4 1.4 0 0 1-1.4 1.4h-1.4a1.4 1.4 0 0 1-1.4-1.4V5.9a1.4 1.4 0 0 1 1.4-1.4Z';
const PREV = 'M19 6.3v11.4a1.2 1.2 0 0 1-1.84 1.02l-8.6-5.7a1.2 1.2 0 0 1 0-2.04l8.6-5.7A1.2 1.2 0 0 1 19 6.3ZM5.7 5a1.3 1.3 0 0 1 1.3 1.3v11.4a1.3 1.3 0 0 1-2.6 0V6.3A1.3 1.3 0 0 1 5.7 5Z';
const NEXT = 'M5 6.3v11.4a1.2 1.2 0 0 0 1.84 1.02l8.6-5.7a1.2 1.2 0 0 0 0-2.04l-8.6-5.7A1.2 1.2 0 0 0 5 6.3ZM18.3 5a1.3 1.3 0 0 1 1.3 1.3v11.4a1.3 1.3 0 0 1-2.6 0V6.3A1.3 1.3 0 0 1 18.3 5Z';
const GEAR = 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z';

const DOCK: { id: Space; title: string; tint: string; d: string; fill?: boolean }[] = [
  { id: 'overview', title: 'Overview', tint: '#5b8cff', d: 'M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z' },
  { id: 'media', title: 'Now Playing', tint: '#ff5f8f', d: 'M9 17.5V6.2a1 1 0 0 1 .78-.98l9-2a1 1 0 0 1 1.22.98V15.5M9 17.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM20 15.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z' },
  { id: 'focus', title: 'Focus', tint: '#ff9f43', d: 'M12 21a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15ZM12 9.5v4l2.5 1.5M9.5 2.75h5' },
  { id: 'today', title: 'Today', tint: '#3ddc97', d: 'M6.5 4.5h11a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3v-10a3 3 0 0 1 3-3ZM8 2.75v3.5M16 2.75v3.5M3.5 9.5h17' },
  { id: 'ai', title: 'AI Usage', tint: '#7b95ff', d: 'M12 2.5 14 10l7.5 2-7.5 2-2 7.5-2-7.5-7.5-2 7.5-2Z', fill: true },
  { id: 'todos', title: 'To-Dos', tint: '#34d399', d: 'M12 20.25a8.25 8.25 0 1 0 0-16.5 8.25 8.25 0 0 0 0 16.5ZM8.5 12.25l2.4 2.4 4.6-4.9' },
  { id: 'note', title: 'Note', tint: '#fbbf24', d: 'M14.5 4.5H7A2.5 2.5 0 0 0 4.5 7v10A2.5 2.5 0 0 0 7 19.5h10a2.5 2.5 0 0 0 2.5-2.5V9.5M18 3.5l2.5 2.5-7.5 7.5-3.25.75.75-3.25Z' },
  { id: 'clipboard', title: 'Clipboard', tint: '#2dd4bf', d: 'M8.5 4.5h7a2.5 2.5 0 0 1 2.5 2.5v11a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 6 18V7a2.5 2.5 0 0 1 2.5-2.5ZM9.5 10h5M9.5 13.5h5M9.5 17h3' },
  { id: 'hardware', title: 'Hardware', tint: '#60a5fa', d: 'M8.5 6.5h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2ZM9.5 3.5v3M14.5 3.5v3M9.5 17.5v3M14.5 17.5v3M3.5 9.5h3M3.5 14.5h3M17.5 9.5h3M17.5 14.5h3' },
  { id: 'weather', title: 'Weather', tint: '#38bdf8', d: 'M9 5.25V4M4.6 7.1l-.9-.9M3.25 11.5H2M13.4 7.1l.9-.9M5.3 13.7a4 4 0 1 1 7.1-3.6M9.25 19.5h8.5a3.5 3.5 0 0 0 .4-6.98 5 5 0 0 0-9.6 1.35A2.85 2.85 0 0 0 9.25 19.5Z' },
  { id: 'clocks', title: 'Clocks', tint: '#f472b6', d: 'M12 20.25a8.25 8.25 0 1 0 0-16.5 8.25 8.25 0 0 0 0 16.5ZM3.75 12h16.5M12 3.75c2.3 2.3 3.4 5 3.4 8.25S14.3 17.95 12 20.25M12 3.75C9.7 6.05 8.6 8.75 8.6 12s1.1 5.95 3.4 8.25' },
  { id: 'calc', title: 'Calc', tint: '#a3e635', d: 'M7.5 3.5h9a2.5 2.5 0 0 1 2.5 2.5v12a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18V6a2.5 2.5 0 0 1 2.5-2.5ZM8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01' },
  { id: 'shelf', title: 'Shelf', tint: '#fb923c', d: 'M4 13.5 6.5 6a2 2 0 0 1 1.9-1.4h7.2A2 2 0 0 1 17.5 6l2.5 7.5M4 13.5h4.5l1.5 2.5h4l1.5-2.5H20V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z' },
  { id: 'colour', title: 'Colour', tint: '#e879f9', d: 'M16 3.5a2.1 2.1 0 0 1 3 0l1.5 1.5a2.1 2.1 0 0 1 0 3L19 9.5 14.5 5ZM14.5 5l4.5 4.5-9.5 9.5H5v-4.5Z' },
  { id: 'launcher', title: 'Launcher', tint: '#f87171', d: 'M11 17.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM20 20l-4.4-4.4' },
  { id: 'github', title: 'GitHub', tint: '#e5e7eb', d: GITHUB.d, fill: true },
];

const APPS = ['Google Chrome', 'Visual Studio Code', 'Spotify', 'Figma', 'Discord', 'Windows Terminal', 'Notion', 'Slack', 'File Explorer', 'Photoshop', 'OBS Studio', 'Microsoft Teams'];
const ZONES: [string, string][] = [['Local', Intl.DateTimeFormat().resolvedOptions().timeZone], ['London', 'Europe/London'], ['New York', 'America/New_York'], ['Tokyo', 'Asia/Tokyo']];

/** A small calculator parser, so nothing is passed to eval. */
function calculate(src: string): number | null {
  const s = src.replace(/×/g, '*').replace(/÷/g, '/').replace(/\s+/g, '');
  if (!s) return null;
  let i = 0;
  const num = (): number => {
    if (s[i] === '(') { i++; const v = add(); if (s[i++] !== ')') throw new Error('('); return v; }
    if (s[i] === '-') { i++; return -num(); }
    const m = /^\d+\.?\d*|^\.\d+/.exec(s.slice(i));
    if (!m) throw new Error('n');
    i += m[0].length;
    let v = parseFloat(m[0]);
    while (s[i] === '%') { i++; v /= 100; }
    return v;
  };
  const pow = (): number => { const b = num(); if (s[i] === '^') { i++; return Math.pow(b, pow()); } return b; };
  const mul = (): number => { let v = pow(); while (s[i] === '*' || s[i] === '/') { const o = s[i++]; const r = pow(); v = o === '*' ? v * r : v / r; } return v; };
  const add = (): number => { let v = mul(); while (s[i] === '+' || s[i] === '-') { const o = s[i++]; const r = mul(); v = o === '+' ? v + r : v - r; } return v; };
  try { const v = add(); return i === s.length && Number.isFinite(v) ? v : null; } catch { return null; }
}

function Dial({ tz, now }: { tz: string; now: Date }) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === 'hour')?.value || 0);
  const m = Number(parts.find((p) => p.type === 'minute')?.value || 0);
  const day = h >= 7 && h < 19;
  const hand = (a: number, len: number, w: number) => {
    const r = ((a - 90) * Math.PI) / 180;
    return <line x1="20" y1="20" x2={20 + Math.cos(r) * len} y2={20 + Math.sin(r) * len} stroke={day ? '#000' : '#fff'} strokeWidth={w} strokeLinecap="round" />;
  };
  return (
    <svg viewBox="0 0 40 40" className="ov-dial">
      <circle cx="20" cy="20" r="19.5" fill={day ? '#f2f2f5' : '#1c1c21'} />
      {hand(((h % 12) + m / 60) * 30, 9.5, 2.2)}{hand(m * 6, 14, 1.5)}
      <circle cx="20" cy="20" r="1.7" fill="#ff9f43" />
    </svg>
  );
}

const clock = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
const Brand = ({ m, size }: { m: { d: string; color: string }; size: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: size, height: size, flex: '0 0 auto' }}><path d={m.d} fill={m.color === '#0d0f16' ? '#fff' : m.color} /></svg>
);

function Ring({ pct, color }: { pct: number; color: string }) {
  const r = 22; const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 56 56" className="ov-ring">
      <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 28 28)" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
    </svg>
  );
}

export default function NotchDemo({ open, onOpen, onClose, start = 'media' }: { open: boolean; onOpen: () => void; onClose: () => void; start?: Space }) {
  const [space, setSpace] = useState<Space>(start);
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<'file' | 'loop'>('loop');
  const [pos, setPos] = useState({ t: LOOP.start, d: LOOP.length });
  const audio = useRef<HTMLAudioElement | null>(null);
  const pad = useRef<ReturnType<typeof createPad> | null>(null);
  const loopStarted = useRef(0);
  const [now, setNow] = useState(() => new Date());
  const [focusLeft, setFocusLeft] = useState(25 * 60);
  const [focusOn, setFocusOn] = useState(false);
  const [act, setAct] = useState(0);
  const [volume, setVolume] = useState(0.62);
  const [expr, setExpr] = useState('12 × (3 + 4)');
  const [history, setHistory] = useState<{ e: string; r: string }[]>([]);
  const [files, setFiles] = useState(['Design review.fig', 'Q4 report.pdf', 'Cover art.png']);
  const [colour, setColour] = useState('#0027c4');
  const [swatches, setSwatches] = useState(['#0027c4', '#ff5f8f', '#fbbf24', '#34d399', '#1d1c21']);
  const [query, setQuery] = useState('');
  const dockRef = useRef<HTMLElement | null>(null);
  const [lyricsOn, setLyricsOn] = useState(true);
  const [note, setNote] = useState('Landing page: bigger laptop, smoother zoom, real notch.\nNext: Mac build, then Linux.');
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState('');
  const [toast, setToast] = useState('');
  const [prefs, setPrefs] = useState({ login: true, lyrics: true, autoswitch: true, battery: true });
  const [todos, setTodos] = useState([
    { t: 'Ship the landing page', done: true },
    { t: 'Review the notch animations', done: false },
    { t: 'Reply to the beta testers', done: false },
  ]);
  const [hw, setHw] = useState({ cpu: 24, mem: 58, gpu: 12, disk: 61 });

  // Use your own track if one is provided; it shows as already playing at 0:18.
  useEffect(() => {
    fetch(SONG.file, { method: 'HEAD' })
      .then((r) => {
        if (r.ok && (r.headers.get('content-type') || '').startsWith('audio')) {
          setMode('file');
          setPos({ t: SONG.start, d: 210 });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => {
      setNow(new Date());
      setHw((h) => ({
        cpu: Math.max(6, Math.min(92, h.cpu + (Math.random() - 0.5) * 14)),
        mem: Math.max(40, Math.min(80, h.mem + (Math.random() - 0.5) * 3)),
        gpu: Math.max(3, Math.min(70, h.gpu + (Math.random() - 0.5) * 10)),
        disk: h.disk,
      }));
    }, 1500);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!focusOn) return;
    const t = window.setInterval(() => setFocusLeft((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, [focusOn]);

  // Follow whichever source is playing.
  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => {
      if (mode === 'file' && audio.current) setPos({ t: audio.current.currentTime, d: audio.current.duration || 210 });
      if (mode === 'loop') setPos((p) => ({ ...p, t: Math.min(p.d - 1, (performance.now() - loopStarted.current) / 1000) }));
    }, 250);
    return () => window.clearInterval(t);
  }, [playing, mode]);

  useEffect(() => () => { audio.current?.pause(); pad.current?.close(); }, []);

  // Closed, the notch rotates through what is live: music, AI limits, the next
  // event and focus. While music plays it stays on the song.
  useEffect(() => {
    if (open || playing) { setAct(0); return; }
    const t = window.setInterval(() => setAct((a) => (a + 1) % 4), 3200);
    return () => window.clearInterval(t);
  }, [open, playing]);

  const toggle = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (mode === 'file') {
      if (!audio.current) {
        audio.current = new Audio(SONG.file);
        audio.current.currentTime = pos.t;
        audio.current.addEventListener('ended', () => setPlaying(false));
      }
      if (playing) { audio.current.pause(); setPlaying(false); } else { void audio.current.play(); setPlaying(true); }
      return;
    }
    if (!pad.current) pad.current = createPad();
    if (playing) { pad.current.pause(); setPlaying(false); return; }
    loopStarted.current = performance.now() - pos.t * 1000;
    pad.current.play();
    setPlaying(true);
  };
  const seek = (e: React.MouseEvent, to: number) => {
    e.stopPropagation();
    const t = Math.max(0, Math.min(pos.d - 1, to));
    setPos((p) => ({ ...p, t }));
    if (mode === 'file' && audio.current) audio.current.currentTime = t;
    if (mode === 'loop') loopStarted.current = performance.now() - t * 1000;
  };
  const go = (e: React.MouseEvent, s: Space) => { e.stopPropagation(); setSpace(s); };
  useEffect(() => {
    const dock = dockRef.current;
    const btn = dock?.querySelector<HTMLElement>(`[data-space="${space}"]`);
    if (dock && btn) dock.scrollTo({ left: btn.offsetLeft - dock.clientWidth / 2 + btn.clientWidth / 2, behavior: 'smooth' });
  }, [space]);
  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      dock.scrollBy({ left: e.deltaY, behavior: 'smooth' });
    };
    dock.addEventListener('wheel', wheel, { passive: false });
    return () => dock.removeEventListener('wheel', wheel);
  }, []);
  const pickColour = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ED = (window as any).EyeDropper;
    if (!ED) { say('Your browser has no screen picker. In the app it picks any pixel.'); return; }
    try {
      const r = await new ED().open();
      setColour(r.sRGBHex);
      setSwatches((w) => [r.sRGBHex, ...w.filter((c) => c !== r.sRGBHex)].slice(0, 8));
    } catch { /* cancelled */ }
  };
  const applyVolume = (v: number) => {
    const x = Math.max(0, Math.min(1, v));
    setVolume(x);
    if (audio.current) audio.current.volume = x;
    pad.current?.setVolume(x);
  };
  const dragVolume = (e: React.PointerEvent<HTMLElement>) => {
    e.stopPropagation();
    const bar = e.currentTarget.getBoundingClientRect();
    const set = (x: number) => applyVolume((x - bar.left) / bar.width);
    set(e.clientX);
    e.currentTarget.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => set(ev.clientX);
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const say = (text: string) => { setToast(text); window.setTimeout(() => setToast(''), 2400); };

  const title = space === 'settings' ? 'Settings' : DOCK.find((d) => d.id === space)?.title || '';
  const hhmm = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const pct = pos.d ? (pos.t / pos.d) * 100 : 0;
  const track = mode === 'file' ? SONG : LOOP;
  const art = mode === 'file' ? { backgroundImage: `url(${SONG.art})` } : undefined;

  return (
    <>
      <div
        className={`ov${open ? ' open' : ''}${playing ? ' playing' : ''}`}
        onClick={(e) => { e.stopPropagation(); if (!open) onOpen(); }}
        role={open ? undefined : 'button'}
        aria-label={open ? undefined : 'Open the notch'}
      >
        {/* Closed: the live activity, cycling like the app */}
        <div className="ov-idle">
          <div className="ov-act" key={act}>
            {act === 0 && (
              <>
                <i className="ov-art sm" style={art} />
                <span className="ov-line">{track.title} · {track.artist}</span>
                <span className="ov-bars"><i /><i /><i /><i /></span>
                <button className="ov-btn" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>{I(playing ? PAUSE : PLAY, true)}</button>
              </>
            )}
            {act === 1 && (
              <>
                <Brand m={CLAUDE} size="calc(var(--u) * 17)" />
                <span className="ov-line"><b className="ov-name">Claude</b>Session 87% used · in 1 h 49 min</span>
                <span className="ov-act-ring"><Ring pct={87} color="#d97757" /></span>
              </>
            )}
            {act === 2 && (
              <>
                <span className="ov-act-logo"><Brand m={GCAL} size="calc(var(--u) * 16)" /></span>
                <span className="ov-line">Design review</span>
                <span className="ov-act-meta">in 25 min</span>
              </>
            )}
            {act === 3 && (
              <>
                <span className="ov-act-dot" />
                <span className="ov-line">Lock In <b>{clock(focusLeft)}</b></span>
                <span className="ov-act-meta">2 sessions today</span>
              </>
            )}
          </div>
        </div>

        {/* Open: one tool at a time, with the dock along the bottom */}
        <div className="ov-exp">
          <header className="ov-head">
            <h2 key={space}>{title}</h2>
            <div className="ov-head-r">
              <span className="ov-bat">100%
                <svg viewBox="0 0 28 13" aria-hidden="true"><rect x="0.65" y="0.65" width="23.2" height="11.7" rx="3.6" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.3" /><rect x="2.4" y="2.4" width="19.4" height="8.2" rx="2" fill="#f2f2f5" /><path d="M25.2 4.5v4a2 2 0 0 0 0-4Z" fill="rgba(255,255,255,0.45)" /></svg>
              </span>
              <button className="ov-btn" onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="Close">{I('m6 14.5 6-6 6 6')}</button>
            </div>
          </header>

          <div className="ov-stage" key={space}>
            {space === 'overview' && (
              <div className="sp sp-overview">
                <div className="ov-top"><div><b className="ov-big">{hhmm}</b><span>{now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
                  <button className="ov-chip" onClick={(e) => go(e, 'ai')}><Brand m={CLAUDE} size="calc(var(--u) * 16)" /><span>87% session</span></button></div>
                <button className="ov-card" onClick={(e) => go(e, 'media')}><i className="ov-art md" style={art} /><div><b>{track.title}</b><span>{track.artist}</span></div><span className="ov-bars"><i /><i /><i /><i /></span></button>
                <div className="ov-grid2">
                  <button className="ov-card" onClick={(e) => go(e, 'focus')}><span className="ov-ic" style={{ color: '#ff9f43' }}>{I(DOCK[2].d)}</span><div><b>Focus</b><span>{focusOn ? `${clock(focusLeft)} left` : '2 sessions today'}</span></div></button>
                  <button className="ov-card" onClick={(e) => go(e, 'today')}><span className="ov-ic" style={{ color: '#3ddc97' }}>{I(DOCK[3].d)}</span><div><b>Design review</b><span>4:30 PM</span></div></button>
                </div>
              </div>
            )}

            {space === 'media' && (
              <div className="sp sp-media">
                <div className="ov-np"><i className="ov-art" style={art} /><div className="ov-np-text"><b>{track.title}</b><span>{track.artist}</span></div><span className="ov-bars"><i /><i /><i /><i /></span></div>
                <div className="ov-progress"><span>{clock(pos.t)}</span><div><i style={{ width: `${pct}%` }} /></div><span>-{clock(pos.d - pos.t)}</span></div>
                <div className="ov-ctrls">
                  <span className="ov-vol">
                    <button className="ov-vol-btn" onClick={(e) => { e.stopPropagation(); applyVolume(volume > 0 ? 0 : 0.62); }} aria-label={volume > 0 ? 'Mute' : 'Unmute'}>
                      {I(volume === 0 ? 'M4.5 9.5h2.8L11.6 6a.6.6 0 0 1 .9.5v11a.6.6 0 0 1-.9.5l-4.3-3.5H4.5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1ZM16 9.5l5 5M21 9.5l-5 5' : 'M4.5 9.5h2.8L11.6 6a.6.6 0 0 1 .9.5v11a.6.6 0 0 1-.9.5l-4.3-3.5H4.5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1ZM15.8 9a4.2 4.2 0 0 1 0 6M18.6 6.4a8 8 0 0 1 0 11.2')}
                    </button>
                    <i className="ov-vol-track" onPointerDown={dragVolume} role="slider" aria-label="Volume" aria-valuenow={Math.round(volume * 100)} style={{ background: `linear-gradient(90deg, #fff ${volume * 100}%, rgba(255,255,255,0.12) ${volume * 100}%)` }}><b style={{ left: `${volume * 100}%` }} /></i>
                  </span>
                  <div className="ov-main">
                    <button className="ov-btn" onClick={(e) => seek(e, pos.t - 10)} aria-label="Back 10 seconds">{I(PREV, true)}</button>
                    <button className="ov-play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>{I(playing ? PAUSE : PLAY, true)}</button>
                    <button className="ov-btn" onClick={(e) => seek(e, pos.t + 10)} aria-label="Forward 10 seconds">{I(NEXT, true)}</button>
                  </div>
                  <span className="ov-ly"><button className={`ov-ly-btn${lyricsOn ? ' on' : ''}`} onClick={(e) => { e.stopPropagation(); setLyricsOn(!lyricsOn); }} aria-pressed={lyricsOn} aria-label="Lyrics">{I('M4 6h11M4 11h8M4 16h5M17 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM19.5 16.5V7.5l2-1')}</button></span>
                </div>
                <div className="ov-lyrics">{lyricsOn
                  ? <><p className="cur">{playing ? 'Lyrics scroll here in the app' : 'Press play to listen'}</p><p>Synced line by line on your PC</p></>
                  : <p>Lyrics hidden</p>}</div>
              </div>
            )}

            {space === 'focus' && (
              <div className="sp sp-focus">
                <span className="ov-label">Lock In</span>
                <b className="ov-timer">{clock(focusLeft)}</b>
                <div className="ov-row">
                  <button className="ov-pill solid" onClick={(e) => { e.stopPropagation(); setFocusOn(!focusOn); }}>{focusOn ? 'Pause' : 'Lock In'}</button>
                  <button className="ov-pill" onClick={(e) => { e.stopPropagation(); setFocusOn(false); setFocusLeft(25 * 60); }}>Reset</button>
                </div>
              </div>
            )}

            {space === 'today' && (
              <div className="sp sp-today">
                <div className="ov-cal"><span>{now.toLocaleDateString([], { weekday: 'short' }).toUpperCase()}</span><b>{now.getDate()}</b><small>{now.toLocaleDateString([], { month: 'long' })}</small></div>
                <div className="ov-events">
                  <div><i style={{ background: '#3ddc97' }} /><b>Design review</b><span>4:30 PM</span></div>
                  <div><i style={{ background: '#5b8cff' }} /><b>Standup</b><span>Tomorrow, 10:00</span></div>
                  <div><i style={{ background: '#ff9f43' }} /><b>Gym</b><span>Tomorrow, 7:00 PM</span></div>
                </div>
              </div>
            )}

            {space === 'ai' && (
              <div className="sp sp-ai">
                {[{ m: CLAUDE, n: 'Claude Code', s: 87, w: 61, cur: true }, { m: OPENAI, n: 'Codex', s: 42, w: 30, cur: false }].map((x) => (
                  <div className={`ov-aicard${x.cur ? ' cur' : ''}`} key={x.n}>
                    <div className="ov-aihead"><Brand m={x.m} size="calc(var(--u) * 15)" /><b>{x.n}</b>{x.cur && <span>In use</span>}</div>
                    {([['Session', x.s, 'in 1h 49m'], ['Week', x.w, 'in 3d 2h']] as [string, number, string][]).map(([l, v, r]) => (
                      <div className="ov-lim" key={l}>
                        <div><span>{l}</span><b>{v}%</b></div>
                        <i><em style={{ width: `${v}%`, background: v >= 75 ? '#ffb340' : '#d9dbe4' }} /></i>
                        <small>{r}</small>
                      </div>
                    ))}
                  </div>
                ))}
                <button className="ov-continue" onClick={(e) => { e.stopPropagation(); say('In the app, this opens Codex in your project with your context.'); }}>
                  <Brand m={OPENAI} size="calc(var(--u) * 14)" />Continue in Codex
                </button>
              </div>
            )}

            {space === 'todos' && (
              <div className="sp sp-todos">
                <form className="ov-add" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); const t = draft.trim(); if (t) { setTodos([{ t, done: false }, ...todos]); setDraft(''); } }}>
                  <span>{I('M12 5.5v13M5.5 12h13')}</span>
                  <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a to-do and press Enter" maxLength={60} />
                </form>
                {todos.map((t, k) => (
                  <button key={t.t + k} className={`ov-todo${t.done ? ' done' : ''}`} onClick={(e) => { e.stopPropagation(); setTodos(todos.map((x, j) => (j === k ? { ...x, done: !x.done } : x))); }}>
                    <i>{t.done ? I('m5 12.5 4.5 4.5L19 7.5') : null}</i><span>{t.t}</span>
                  </button>
                ))}
              </div>
            )}

            {space === 'note' && (
              <div className="sp sp-note">
                <textarea value={note} onClick={(e) => e.stopPropagation()} onChange={(e) => setNote(e.target.value)} spellCheck={false} aria-label="Note" />
                <span>{note.trim() ? note.trim().split(/\s+/).length : 0} words · saved</span>
              </div>
            )}

            {space === 'clipboard' && (
              <div className="sp sp-clip">
                {[['npm run electron:start', 'now'], ['https://github.com/overlay', '2m'], ['Meeting moved to 4:30', '8m']].map(([t, a]) => (
                  <button className={`ov-clip${copied === t ? ' copied' : ''}`} key={t} onClick={(e) => { e.stopPropagation(); void navigator.clipboard?.writeText(t); setCopied(t); window.setTimeout(() => setCopied(''), 1400); }}>
                    <span>{t}</span><small>{copied === t ? 'Copied' : a}</small>
                  </button>
                ))}
              </div>
            )}


            {space === 'weather' && (
              <div className="sp sp-weather">
                <div className="ov-wnow">
                  <span className="ov-wicon">{I(DOCK.find((d) => d.id === 'weather')!.d)}</span>
                  <div><b className="ov-big">24°</b><span>Partly cloudy</span></div>
                  <div className="ov-wside"><b>Kolkata</b><span>Feels 26° · H 27° L 19°</span><span>Wind 9 km/h · Humidity 62%</span></div>
                </div>
                <div className="ov-wdays">
                  {['Today', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, k) => (
                    <div key={d}><span>{d}</span>{I(k === 2 ? 'M7.25 14.5h10a4 4 0 0 0 .5-7.97 5.75 5.75 0 0 0-11.1 1.55A3.25 3.25 0 0 0 7.25 14.5ZM8.5 17.5l-1 2.5M12.5 17.5l-1 2.5M16.5 17.5l-1 2.5' : DOCK.find((x) => x.id === 'weather')!.d)}<b>{[27, 26, 22, 25, 28][k]}°</b><small>{[19, 18, 17, 18, 20][k]}°</small></div>
                  ))}
                </div>
              </div>
            )}

            {space === 'clocks' && (
              <div className="sp sp-clocks">
                {ZONES.map(([name, tz]) => (
                  <div className="ov-clockcard" key={name}>
                    <Dial tz={tz} now={now} />
                    <div><b>{now.toLocaleTimeString([], { timeZone: tz, hour: 'numeric', minute: '2-digit' })}</b><span>{name}</span></div>
                  </div>
                ))}
              </div>
            )}

            {space === 'calc' && (
              <div className="sp sp-calc">
                <form className="ov-calc" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); const r = calculate(expr); if (r !== null) { setHistory([{ e: expr, r: String(Number(r.toPrecision(12))) }, ...history].slice(0, 3)); } }}>
                  <input value={expr} onChange={(e) => setExpr(e.target.value)} spellCheck={false} aria-label="Expression" />
                  <b>{(() => { const r = calculate(expr); return r === null ? '' : `= ${Number(r.toPrecision(12)).toLocaleString()}`; })()}</b>
                </form>
                <div className="ov-hist">{history.length ? history.map((h, k) => <div key={k}><span>{h.e}</span><b>= {h.r}</b></div>) : <span className="ov-muted">Press Enter to keep a result here.</span>}</div>
              </div>
            )}

            {space === 'shelf' && (
              <div className="sp sp-shelf" onClick={(e) => e.stopPropagation()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const names = [...e.dataTransfer.files].map((f) => f.name); if (names.length) setFiles((f) => [...names, ...f].slice(0, 8)); }}>
                <div className="ov-files">
                  {files.map((f) => (
                    <div className="ov-file" key={f}>
                      <span className={`ov-ext ${f.split('.').pop()}`}>{f.split('.').pop()?.toUpperCase()}</span>
                      <span className="ov-fname">{f}</span>
                      <button className="ov-x" onClick={() => setFiles(files.filter((x) => x !== f))} aria-label={`Remove ${f}`}>{I('M17 7 7 17M7 7l10 10')}</button>
                    </div>
                  ))}
                </div>
                <span className="ov-muted">Drop files here. In the app you drag them back out into any window.</span>
              </div>
            )}

            {space === 'colour' && (
              <div className="sp sp-colour">
                <div className="ov-colrow">
                  <button className="ov-pick" style={{ background: colour }} onClick={pickColour}><span>Pick from screen</span></button>
                  <div className="ov-formats">
                    {(() => {
                      const n = parseInt(colour.slice(1), 16); const r = (n >> 16) & 255; const g = (n >> 8) & 255; const b = n & 255;
                      return [['HEX', colour.toUpperCase()], ['RGB', `rgb(${r}, ${g}, ${b})`]].map(([k, v]) => (
                        <button key={k} className={`ov-format${copied === v ? ' copied' : ''}`} onClick={(e) => { e.stopPropagation(); void navigator.clipboard?.writeText(v); setCopied(v); window.setTimeout(() => setCopied(''), 1200); }}>
                          <span>{k}</span><b>{copied === v ? 'Copied' : v}</b>
                        </button>
                      ));
                    })()}
                  </div>
                </div>
                <div className="ov-swatches">{swatches.map((c) => <button key={c} className={c === colour ? 'on' : ''} style={{ background: c }} onClick={(e) => { e.stopPropagation(); setColour(c); }} aria-label={c} />)}</div>
              </div>
            )}

            {space === 'launcher' && (
              <div className="sp sp-launcher" onClick={(e) => e.stopPropagation()}>
                <form className="ov-add" onSubmit={(e) => { e.preventDefault(); const hit = APPS.find((a) => a.toLowerCase().includes(query.toLowerCase().trim())); if (hit && query.trim()) say(`In the app, this opens ${hit}.`); }}>
                  <span>{I('M11 17.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM20 20l-4.4-4.4')}</span>
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your apps" />
                </form>
                <div className="ov-apps">
                  {APPS.filter((a) => a.toLowerCase().includes(query.toLowerCase().trim())).slice(0, 5).map((a, k) => (
                    <button key={a} className={`ov-app${k === 0 && query ? ' on' : ''}`} onClick={() => say(`In the app, this opens ${a}.`)}>
                      <i style={{ background: `hsl(${(a.length * 47) % 360} 70% 55%)` }}>{a[0]}</i><span>{a}</span>{k === 0 && query ? <kbd>Enter</kbd> : null}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {space === 'github' && (
              <div className="sp sp-github">
                <div className="ov-ghhead"><Brand m={{ ...GITHUB, color: '#0d0f16' }} size="calc(var(--u) * 18)" /><b>souradeep</b><span>12 day streak · 3 open PRs</span></div>
                <div className="ov-contrib">
                  {Array.from({ length: 26 * 7 }, (_, k) => {
                    const v = (Math.sin(k * 12.9898) * 43758.5453) % 1;
                    const lvl = v < 0.35 ? 0 : v < 0.6 ? 1 : v < 0.8 ? 2 : v < 0.93 ? 3 : 4;
                    return <i key={k} className={`l${lvl}`} />;
                  })}
                </div>
                <span className="ov-muted">Contributions over the last six months</span>
              </div>
            )}

            {space === 'settings' && (
              <div className="sp sp-settings">
                {([['login', 'Start Overlay with Windows'], ['lyrics', 'Show lyrics while music plays'], ['autoswitch', 'Hand off when an AI limit runs out'], ['battery', 'Show battery in the notch']] as [keyof typeof prefs, string][]).map(([k, label]) => (
                  <button key={k} className="ov-pref" onClick={(e) => { e.stopPropagation(); setPrefs({ ...prefs, [k]: !prefs[k] }); }} aria-pressed={prefs[k]}>
                    <span>{label}</span><i className={prefs[k] ? 'on' : ''}><b /></i>
                  </button>
                ))}
              </div>
            )}

            {space === 'hardware' && (
              <div className="sp sp-hw">
                {([['CPU', hw.cpu, '#5b8cff'], ['Memory', hw.mem, '#3ddc97'], ['GPU', hw.gpu, '#ff9f43'], ['Disk', hw.disk, '#c084fc']] as [string, number, string][]).map(([n, v, c]) => (
                  <div className="ov-gauge" key={n}><Ring pct={v} color={c} /><b>{Math.round(v)}%</b><span>{n}</span></div>
                ))}
              </div>
            )}
          </div>

          {toast && <div className="ov-toast">{toast}</div>}
          <nav className="ov-dock" ref={dockRef}>
            {DOCK.map((d) => (
              <button key={d.id} data-space={d.id} className={`ov-dot${d.id === space ? ' on' : ''}`} style={{ color: d.tint }} onClick={(e) => go(e, d.id)} aria-label={d.title} title={d.title}>{I(d.d, d.fill)}</button>
            ))}
            <span className="ov-dock-gap" />
            <button className={`ov-dot gear${space === 'settings' ? ' on' : ''}`} onClick={(e) => go(e, 'settings')} aria-label="Settings" title="Settings">{I(GEAR)}</button>
          </nav>
        </div>
      </div>

    </>
  );
}
