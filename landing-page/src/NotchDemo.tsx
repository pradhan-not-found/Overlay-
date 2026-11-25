import { useEffect, useRef, useState } from 'react';

/**
 * The Overlay notch as it looks after you install it, laid out in the app's own
 * pixel sizes (scaled to the laptop screen). Play actually plays: a short ambient
 * loop is generated in the browser, so there is no recording to license.
 */

const LYRICS = [
  'Streetlights fold into the rearview',
  'Every signal turning blue',
  'Keep the engine humming low',
  'Nowhere that we have to go',
  'City breathing in the dark',
  'Windows open, radio on',
  'Every light says keep on going',
  'Night drive till the dawn',
];
const LINE_MS = 4000;
const LENGTH_S = 235;

const ico = (d: string, fill = false) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...(fill ? { fill: 'currentColor' } : { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const })}>
    <path d={d} />
  </svg>
);
const PLAY = 'M7 5.6v12.8a1.3 1.3 0 0 0 1.98 1.1l10.2-6.4a1.3 1.3 0 0 0 0-2.2L8.98 4.5A1.3 1.3 0 0 0 7 5.6Z';
const PAUSE = 'M7.4 4.5h1.4A1.4 1.4 0 0 1 10.2 5.9v12.2a1.4 1.4 0 0 1-1.4 1.4H7.4A1.4 1.4 0 0 1 6 18.1V5.9a1.4 1.4 0 0 1 1.4-1.4Zm7.8 0h1.4A1.4 1.4 0 0 1 18 5.9v12.2a1.4 1.4 0 0 1-1.4 1.4h-1.4a1.4 1.4 0 0 1-1.4-1.4V5.9a1.4 1.4 0 0 1 1.4-1.4Z';
const PREV = 'M19 6.3v11.4a1.2 1.2 0 0 1-1.84 1.02l-8.6-5.7a1.2 1.2 0 0 1 0-2.04l8.6-5.7A1.2 1.2 0 0 1 19 6.3ZM5.7 5a1.3 1.3 0 0 1 1.3 1.3v11.4a1.3 1.3 0 0 1-2.6 0V6.3A1.3 1.3 0 0 1 5.7 5Z';
const NEXT = 'M5 6.3v11.4a1.2 1.2 0 0 0 1.84 1.02l8.6-5.7a1.2 1.2 0 0 0 0-2.04l-8.6-5.7A1.2 1.2 0 0 0 5 6.3ZM18.3 5a1.3 1.3 0 0 1 1.3 1.3v11.4a1.3 1.3 0 0 1-2.6 0V6.3A1.3 1.3 0 0 1 18.3 5Z';

const DOCK: { tint: string; d: string; active?: boolean; star?: boolean }[] = [
  { tint: '#5b8cff', d: 'M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z' },
  { tint: '#ff5f8f', d: 'M9 17.5V6.2a1 1 0 0 1 .78-.98l9-2a1 1 0 0 1 1.22.98V15.5M9 17.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM20 15.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z', active: true },
  { tint: '#ff9f43', d: 'M12 21a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15ZM12 9.5v4l2.5 1.5M9.5 2.75h5' },
  { tint: '#3ddc97', d: 'M6.5 4.5h11a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3v-10a3 3 0 0 1 3-3ZM8 2.75v3.5M16 2.75v3.5M3.5 9.5h17' },
  { tint: '#7b95ff', d: 'M12 2.5 14 10l7.5 2-7.5 2-2 7.5-2-7.5-7.5-2 7.5-2Z', star: true },
  { tint: '#34d399', d: 'M12 20.25a8.25 8.25 0 1 0 0-16.5 8.25 8.25 0 0 0 0 16.5ZM8.5 12.25l2.4 2.4 4.6-4.9' },
  { tint: '#fbbf24', d: 'M14.5 4.5H7A2.5 2.5 0 0 0 4.5 7v10A2.5 2.5 0 0 0 7 19.5h10a2.5 2.5 0 0 0 2.5-2.5V9.5M18 3.5l2.5 2.5-7.5 7.5-3.25.75.75-3.25Z' },
  { tint: '#2dd4bf', d: 'M8.5 4.5h7a2.5 2.5 0 0 1 2.5 2.5v11a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 6 18V7a2.5 2.5 0 0 1 2.5-2.5ZM9.5 10h5M9.5 13.5h5M9.5 17h3' },
  { tint: '#60a5fa', d: 'M8.5 6.5h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2ZM9.5 3.5v3M14.5 3.5v3M9.5 17.5v3M14.5 17.5v3M3.5 9.5h3M3.5 14.5h3M17.5 9.5h3M17.5 14.5h3' },
];
const GEAR = 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z';

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
  return {
    play() { void ctx.resume(); master.gain.cancelScheduledValues(ctx.currentTime); master.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 0.4); },
    pause() { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25); window.setTimeout(() => void ctx.suspend(), 300); },
    close() { window.clearInterval(timer); void ctx.close(); },
  };
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function NotchDemo({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [ms, setMs] = useState(84_000);
  const pad = useRef<ReturnType<typeof createPad> | null>(null);
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const t = window.setInterval(() => setTime(new Date()), 15_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const started = performance.now() - ms;
    const t = window.setInterval(() => setMs((performance.now() - started) % (LENGTH_S * 1000)), 200);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  useEffect(() => () => pad.current?.close(), []);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!pad.current) pad.current = createPad();
    if (playing) pad.current.pause(); else pad.current.play();
    setPlaying(!playing);
  };
  const skip = (e: React.MouseEvent, dir: number) => {
    e.stopPropagation();
    setMs((v) => Math.max(0, Math.min(LENGTH_S * 1000 - 1, Math.floor(v / LINE_MS + dir) * LINE_MS)));
  };

  const line = Math.floor(ms / LINE_MS) % LYRICS.length;
  const s = ms / 1000;
  const hhmm = time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div className={`ov${open ? ' open' : ''}${playing ? ' playing' : ''}`} onClick={(e) => open && e.stopPropagation()}>
      {/* Closed: the bar along the top edge */}
      <div className="ov-idle">
        {playing ? (
          <>
            <i className="ov-art sm" />
            <span className="ov-line">{LYRICS[line]}</span>
            <span className="ov-bars"><i /><i /><i /><i /></span>
            <button className="ov-btn" onClick={toggle} aria-label="Pause">{ico(PAUSE, true)}</button>
          </>
        ) : (
          <>
            <img className="ov-mark" src="/mark.png" alt="" />
            <span className="ov-clock">{hhmm}</span>
            <span className="ov-spacer" />
            <button className="ov-btn" onClick={toggle} aria-label="Play">{ico(PLAY, true)}</button>
            <span className="ov-x">{ico('M17 7 7 17M7 7l10 10')}</span>
          </>
        )}
      </div>

      {/* Open: Now Playing, as in the app */}
      <div className="ov-exp">
        <header className="ov-head">
          <h2>Now Playing</h2>
          <div className="ov-head-r">
            <span className="ov-bat">100%
              <svg viewBox="0 0 28 13" aria-hidden="true"><rect x="0.65" y="0.65" width="23.2" height="11.7" rx="3.6" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.3" /><rect x="2.4" y="2.4" width="19.4" height="8.2" rx="2" fill="#f2f2f5" /><path d="M25.2 4.5v4a2 2 0 0 0 0-4Z" fill="rgba(255,255,255,0.45)" /></svg>
            </span>
            <button className="ov-btn" onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="Close">{ico('m6 14.5 6-6 6 6')}</button>
          </div>
        </header>
        <div className="ov-np">
          <i className="ov-art" />
          <div className="ov-np-text"><b>Night Drive</b><span>Overlay Sessions</span></div>
          <span className="ov-bars"><i /><i /><i /><i /></span>
        </div>
        <div className="ov-progress"><span>{clock(s)}</span><div><i style={{ width: `${(s / LENGTH_S) * 100}%` }} /></div><span>-{clock(LENGTH_S - s)}</span></div>
        <div className="ov-ctrls">
          <span className="ov-vol">{ico('M4.5 9.5h2.8L11.6 6a.6.6 0 0 1 .9.5v11a.6.6 0 0 1-.9.5l-4.3-3.5H4.5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1ZM15.8 9a4.2 4.2 0 0 1 0 6M18.6 6.4a8 8 0 0 1 0 11.2')}<i><b /></i></span>
          <div className="ov-main">
            <button className="ov-btn" onClick={(e) => skip(e, -1)} aria-label="Previous">{ico(PREV, true)}</button>
            <button className="ov-play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>{ico(playing ? PAUSE : PLAY, true)}</button>
            <button className="ov-btn" onClick={(e) => skip(e, 1)} aria-label="Next">{ico(NEXT, true)}</button>
          </div>
          <span className="ov-ly">{ico('M4 6h11M4 11h8M4 16h5M17 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM19.5 16.5V7.5l2-1')}</span>
        </div>
        <div className="ov-lyrics">
          <p>{LYRICS[(line + LYRICS.length - 1) % LYRICS.length]}</p>
          <p className="cur" key={line}>{LYRICS[line]}</p>
          <p>{LYRICS[(line + 1) % LYRICS.length]}</p>
        </div>
        <nav className="ov-dock" aria-hidden="true">
          {DOCK.map((d, k) => (
            <span key={k} className={`ov-dot${d.active ? ' on' : ''}`} style={{ color: d.tint }}>{ico(d.d, d.star)}</span>
          ))}
          <span className="ov-dock-gap" />
          <span className="ov-dot gear">{ico(GEAR)}</span>
        </nav>
      </div>
    </div>
  );
}
