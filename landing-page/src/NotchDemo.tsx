import { useEffect, useRef, useState } from 'react';
import { CLAUDE, OPENAI } from './brand/marks';

/**
 * The Overlay notch as it looks after you install it, in the app's own pixel
 * sizes on a 1000px-wide screen. Click it to open; the dock switches tools,
 * just like the app.
 *
 * Music: if /song.mp3 exists (a track you have the rights to), it plays with no
 * visible player. Otherwise YouTube's official player is used, and it stays
 * visible while it plays, because YouTube's terms do not allow a hidden player.
 */

const TRACK = {
  youtube: 'q8bP3DW8EpY',
  file: '/song.mp3',
  start: 18,
  guessLength: 225,
  title: 'Just a Boy',
  artist: 'DrINsaNE',
  art: 'https://i.ytimg.com/vi/q8bP3DW8EpY/hqdefault.jpg',
};

declare global {
  interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void }
}

let apiReady: Promise<void> | null = null;
function loadYouTube(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (!apiReady) {
    apiReady = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    });
  }
  return apiReady;
}

type Space = 'overview' | 'media' | 'focus' | 'today' | 'ai' | 'todos' | 'note' | 'clipboard' | 'hardware';

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
];

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

export default function NotchDemo({ open, onOpen, onClose }: { open: boolean; onOpen: () => void; onClose: () => void }) {
  const [space, setSpace] = useState<Space>('media');
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState({ t: TRACK.start, d: TRACK.guessLength });
  const [mode, setMode] = useState<'file' | 'youtube' | null>(null);
  const [ytShown, setYtShown] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const host = useRef<HTMLDivElement | null>(null);
  const yt = useRef<any>(null);
  const [now, setNow] = useState(() => new Date());
  const [focusLeft, setFocusLeft] = useState(25 * 60);
  const [focusOn, setFocusOn] = useState(false);
  const [todos, setTodos] = useState([
    { t: 'Ship the landing page', done: true },
    { t: 'Review the notch animations', done: false },
    { t: 'Reply to the beta testers', done: false },
  ]);
  const [hw, setHw] = useState({ cpu: 24, mem: 58, gpu: 12, disk: 61 });

  // Use a local track if one is provided.
  useEffect(() => {
    fetch(TRACK.file, { method: 'HEAD' })
      .then((r) => setMode(r.ok && (r.headers.get('content-type') || '').startsWith('audio') ? 'file' : 'youtube'))
      .catch(() => setMode('youtube'));
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

  // Follow whichever player is running.
  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => {
      if (mode === 'file' && audio.current) setPos({ t: audio.current.currentTime, d: audio.current.duration || TRACK.guessLength });
      if (mode === 'youtube' && yt.current?.getCurrentTime) setPos({ t: yt.current.getCurrentTime() || 0, d: yt.current.getDuration() || TRACK.guessLength });
    }, 250);
    return () => window.clearInterval(t);
  }, [playing, mode]);

  useEffect(() => () => { yt.current?.destroy?.(); audio.current?.pause(); }, []);

  const startYouTube = async () => {
    await loadYouTube();
    if (yt.current || !host.current) return;
    yt.current = new window.YT.Player(host.current, {
      videoId: TRACK.youtube,
      width: '100%',
      height: '100%',
      playerVars: { start: Math.floor(pos.t), autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1 },
      events: {
        onStateChange: (e: any) => {
          const S = window.YT.PlayerState;
          if (e.data === S.PLAYING) setPlaying(true);
          if (e.data === S.PAUSED || e.data === S.ENDED) setPlaying(false);
        },
      },
    });
  };

  const toggle = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (mode === 'file') {
      if (!audio.current) {
        audio.current = new Audio(TRACK.file);
        audio.current.currentTime = pos.t;
        audio.current.addEventListener('ended', () => setPlaying(false));
      }
      if (playing) { audio.current.pause(); setPlaying(false); } else { void audio.current.play(); setPlaying(true); }
      return;
    }
    setYtShown(true);
    if (!yt.current) { void startYouTube(); return; }
    if (playing) yt.current.pauseVideo(); else yt.current.playVideo();
  };
  const seek = (e: React.MouseEvent, to: number) => {
    e.stopPropagation();
    const t = Math.max(0, Math.min(pos.d - 1, to));
    setPos((p) => ({ ...p, t }));
    if (mode === 'file' && audio.current) audio.current.currentTime = t;
    if (mode === 'youtube' && yt.current?.seekTo) yt.current.seekTo(t, true);
  };
  const go = (e: React.MouseEvent, s: Space) => { e.stopPropagation(); setSpace(s); };

  const title = DOCK.find((d) => d.id === space)?.title || '';
  const hhmm = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const pct = pos.d ? (pos.t / pos.d) * 100 : 0;
  const art = { backgroundImage: `url(${TRACK.art})` };

  return (
    <>
      <div
        className={`ov${open ? ' open' : ''}${playing ? ' playing' : ''}`}
        onClick={(e) => { e.stopPropagation(); if (!open) onOpen(); }}
        role={open ? undefined : 'button'}
        aria-label={open ? undefined : 'Open the notch'}
      >
        {/* Closed: the live activity, like the app with music playing */}
        <div className="ov-idle">
          <i className="ov-art sm" style={art} />
          <span className="ov-line">{TRACK.title} · {TRACK.artist}</span>
          <span className="ov-bars"><i /><i /><i /><i /></span>
          <button className="ov-btn" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>{I(playing ? PAUSE : PLAY, true)}</button>
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
                <button className="ov-card" onClick={(e) => go(e, 'media')}><i className="ov-art md" style={art} /><div><b>{TRACK.title}</b><span>{TRACK.artist}</span></div><span className="ov-bars"><i /><i /><i /><i /></span></button>
                <div className="ov-grid2">
                  <button className="ov-card" onClick={(e) => go(e, 'focus')}><span className="ov-ic" style={{ color: '#ff9f43' }}>{I(DOCK[2].d)}</span><div><b>Focus</b><span>{focusOn ? `${clock(focusLeft)} left` : '2 sessions today'}</span></div></button>
                  <button className="ov-card" onClick={(e) => go(e, 'today')}><span className="ov-ic" style={{ color: '#3ddc97' }}>{I(DOCK[3].d)}</span><div><b>Design review</b><span>4:30 PM</span></div></button>
                </div>
              </div>
            )}

            {space === 'media' && (
              <div className="sp sp-media">
                <div className="ov-np"><i className="ov-art" style={art} /><div className="ov-np-text"><b>{TRACK.title}</b><span>{TRACK.artist}</span></div><span className="ov-bars"><i /><i /><i /><i /></span></div>
                <div className="ov-progress"><span>{clock(pos.t)}</span><div><i style={{ width: `${pct}%` }} /></div><span>-{clock(pos.d - pos.t)}</span></div>
                <div className="ov-ctrls">
                  <span className="ov-vol">{I('M4.5 9.5h2.8L11.6 6a.6.6 0 0 1 .9.5v11a.6.6 0 0 1-.9.5l-4.3-3.5H4.5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1ZM15.8 9a4.2 4.2 0 0 1 0 6M18.6 6.4a8 8 0 0 1 0 11.2')}<i><b /></i></span>
                  <div className="ov-main">
                    <button className="ov-btn" onClick={(e) => seek(e, pos.t - 10)} aria-label="Back 10 seconds">{I(PREV, true)}</button>
                    <button className="ov-play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>{I(playing ? PAUSE : PLAY, true)}</button>
                    <button className="ov-btn" onClick={(e) => seek(e, pos.t + 10)} aria-label="Forward 10 seconds">{I(NEXT, true)}</button>
                  </div>
                  <span className="ov-ly">{I('M4 6h11M4 11h8M4 16h5M17 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM19.5 16.5V7.5l2-1')}</span>
                </div>
                <div className="ov-lyrics"><p className="cur">{playing ? 'Lyrics scroll here in the app' : 'Press play to listen'}</p><p>Synced line by line on your PC</p></div>
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
              </div>
            )}

            {space === 'todos' && (
              <div className="sp sp-todos">
                {todos.map((t, k) => (
                  <button key={t.t} className={`ov-todo${t.done ? ' done' : ''}`} onClick={(e) => { e.stopPropagation(); setTodos(todos.map((x, j) => (j === k ? { ...x, done: !x.done } : x))); }}>
                    <i>{t.done ? I('m5 12.5 4.5 4.5L19 7.5') : null}</i><span>{t.t}</span>
                  </button>
                ))}
              </div>
            )}

            {space === 'note' && (
              <div className="sp sp-note"><p>Landing page: bigger laptop, smoother zoom, real notch.<br />Next: Mac build, then Linux.</p><span>12 words · saved</span></div>
            )}

            {space === 'clipboard' && (
              <div className="sp sp-clip">
                {[['npm run electron:start', 'now'], ['https://github.com/overlay', '2m'], ['Meeting moved to 4:30', '8m']].map(([t, a]) => (
                  <div className="ov-clip" key={t}><span>{t}</span><small>{a}</small></div>
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

          <nav className="ov-dock">
            {DOCK.map((d) => (
              <button key={d.id} className={`ov-dot${d.id === space ? ' on' : ''}`} style={{ color: d.tint }} onClick={(e) => go(e, d.id)} aria-label={d.title} title={d.title}>{I(d.d, d.fill)}</button>
            ))}
            <span className="ov-dock-gap" />
            <span className="ov-dot gear">{I(GEAR)}</span>
          </nav>
        </div>
      </div>

      {mode === 'youtube' && (
        <div className={`yt-window${ytShown ? ' show' : ''}`} onClick={(e) => e.stopPropagation()}>
          <div className="yt-frame"><div ref={host} /></div>
        </div>
      )}
    </>
  );
}
