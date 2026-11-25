import { useEffect, useRef, useState } from 'react';

/**
 * The Overlay notch as it looks after you install it, laid out in the app's own
 * pixel sizes (scaled to the laptop screen). Play opens YouTube's official player
 * in a small window on the desktop, and the notch follows it, as the app does
 * with any media player.
 */

const TRACK = {
  id: 'q8bP3DW8EpY',
  start: 18,
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

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function NotchDemo({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [shown, setShown] = useState(false);
  const [pos, setPos] = useState({ t: TRACK.start, d: 0 });
  const host = useRef<HTMLDivElement | null>(null);
  const player = useRef<any>(null);
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const t = window.setInterval(() => setTime(new Date()), 15_000);
    return () => window.clearInterval(t);
  }, []);

  // Follow the player's clock while it plays.
  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => {
      const p = player.current;
      if (p?.getCurrentTime) setPos({ t: p.getCurrentTime() || 0, d: p.getDuration() || 0 });
    }, 250);
    return () => window.clearInterval(t);
  }, [playing]);

  useEffect(() => () => player.current?.destroy?.(), []);

  const create = async () => {
    await loadYouTube();
    if (player.current || !host.current) return;
    player.current = new window.YT.Player(host.current, {
      videoId: TRACK.id,
      width: '100%',
      height: '100%',
      playerVars: { start: TRACK.start, autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1 },
      events: {
        onStateChange: (e: any) => {
          const YT = window.YT;
          if (e.data === YT.PlayerState.PLAYING) setPlaying(true);
          if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) setPlaying(false);
        },
      },
    });
  };

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShown(true);
    if (!player.current) { void create(); return; }
    if (playing) player.current.pauseVideo(); else player.current.playVideo();
  };
  const skip = (e: React.MouseEvent, dir: number) => {
    e.stopPropagation();
    const p = player.current;
    if (!p?.seekTo) return;
    p.seekTo(dir < 0 ? TRACK.start : Math.min((p.getDuration() || 0) - 1, (p.getCurrentTime() || 0) + 15), true);
  };
  const closeWindow = (e: React.MouseEvent) => {
    e.stopPropagation();
    player.current?.pauseVideo?.();
    setShown(false);
  };

  const s = pos.t;
  const len = pos.d || 0;
  const hhmm = time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <>
    <div className={`ov${open ? ' open' : ''}${playing ? ' playing' : ''}`} onClick={(e) => open && e.stopPropagation()}>
      {/* Closed: the bar along the top edge */}
      <div className="ov-idle">
        {playing ? (
          <>
            <i className="ov-art sm" style={{ backgroundImage: `url(${TRACK.art})` }} />
            <span className="ov-line">{TRACK.title} · {TRACK.artist}</span>
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
          <i className="ov-art" style={{ backgroundImage: `url(${TRACK.art})` }} />
          <div className="ov-np-text"><b>{TRACK.title}</b><span>{TRACK.artist}</span></div>
          <span className="ov-bars"><i /><i /><i /><i /></span>
        </div>
        <div className="ov-progress"><span>{clock(s)}</span><div><i style={{ width: `${len ? (s / len) * 100 : 0}%` }} /></div><span>{len ? `-${clock(len - s)}` : '0:00'}</span></div>
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
          <p className="cur">{playing ? 'Playing from YouTube' : 'Press play'}</p>
          <p>In the app, the lyrics scroll here line by line.</p>
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

    {/* The official YouTube player, visible on the desktop while it plays. */}
    <div className={`yt-window${shown ? ' show' : ''}`} onClick={(e) => e.stopPropagation()}>
      <div className="yt-bar">
        <span>{TRACK.title} · YouTube</span>
        <button onClick={closeWindow} aria-label="Close player">{ico('M17 7 7 17M7 7l10 10')}</button>
      </div>
      <div className="yt-frame"><div ref={host} /></div>
    </div>
    </>
  );
}
