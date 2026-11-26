import '@fontsource-variable/instrument-sans';
import './style.css';
import { countMark } from './count/mark';
import overlayMark from './assets/overlay-mark.png';
import { mountCount, openCountSpace } from './count/panel';
import { mountExtraTools } from './tools/extra';
import { mountMoreTools } from './tools/more';
import { mountLinks, marks } from './tools/links';
import { mountStudio } from './tools/studio';
import { mountDesk } from './tools/desk';
import { mountKit } from './tools/kit';
import { mountContext } from './tools/context';
import plusSvgRaw from './assets/icons/plus.svg?raw';
import expandSvgRaw from './assets/icons/expand.svg?raw';
import playSvgRaw from './assets/icons/play.svg?raw';
import pauseSvgRaw from './assets/icons/pause.svg?raw';
import prevSvgRaw from './assets/icons/prev.svg?raw';
import nextSvgRaw from './assets/icons/next.svg?raw';
import musicSvgRaw from './assets/icons/music.svg?raw';
import calendarSvgRaw from './assets/icons/calendar.svg?raw';
import camSvgRaw from './assets/icons/cam.svg?raw';
import screenshotSvgRaw from './assets/icons/screenshot.svg?raw';
import settingsSvgRaw from './assets/icons/settings.svg?raw';
import chevronLeftSvgRaw from './assets/icons/chevron-left.svg?raw';
import chevronRightSvgRaw from './assets/icons/chevron-right.svg?raw';
import closeSvgRaw from './assets/icons/close.svg?raw';
import volMuteSvgRaw from './assets/icons/vol-mute.svg?raw';
import volLowSvgRaw from './assets/icons/vol-low.svg?raw';
import volHighSvgRaw from './assets/icons/vol-high.svg?raw';

const timerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9.5 2.75h5"/></svg>`;

const lyricsSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h11M4 11h8M4 16h5"/><circle cx="17" cy="16.5" r="2.5"/><path d="M19.5 16.5V7.5l2-1"/></svg>`;

/** Menu-bar battery: even stroke, inset charge, a centered cap, and a bolt only while charging. */
let batteryMaskId = 0;
function batterySvg(pct: number, charging: boolean): string {
  const id = `bat-cut-${++batteryMaskId}`;
  const fill = charging ? '#32d27a' : pct <= 20 ? '#ff5a4e' : '#f4f4f6';
  const inner = 16.2;
  const w = pct <= 0 ? 0 : Math.max(1.6, (Math.min(100, pct) / 100) * inner);
  const bolt = 'M11.55 2.55 8.55 6.55h2.05l-.7 2.9 3.05-4.05H10.9l.65-2.85Z';
  return `<svg width="26" height="12" viewBox="0 0 26 12" aria-hidden="true">
    ${charging ? `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="26" height="12">
      <rect width="26" height="12" fill="#fff"/>
      <path d="${bolt}" fill="#000" stroke="#000" stroke-width="0.7" stroke-linejoin="round"/>
    </mask></defs>` : ''}
    <rect x="0.7" y="0.7" width="21.2" height="10.6" rx="3.1" fill="none" stroke="rgba(255,255,255,0.72)" stroke-width="1.15"/>
    <rect x="22.55" y="3.85" width="2.15" height="4.3" rx="0.9" fill="rgba(255,255,255,0.72)"/>
    ${w ? `<rect x="2.25" y="2.25" width="${w.toFixed(2)}" height="7.5" rx="1.5" fill="${fill}" ${charging ? `mask="url(#${id})"` : ''}/>` : ''}
    ${charging ? `<path d="${bolt}" fill="#fff"/>` : ''}
  </svg>`;
}

const ico = (d: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const gridSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8"/></svg>`;
const chevronUpSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14.5 6-6 6 6"/></svg>`;

// ─── IPC bridge ───────────────────────────────────────────────────────────────
let ipc: any = null;
try { if ((window as any).require) ipc = (window as any).require('electron').ipcRenderer; } catch {}
const send = (ch: string, ...a: any[]) => ipc?.send(ch, ...a);
const invoke = (ch: string, ...a: any[]) => ipc?.invoke(ch, ...a) || Promise.resolve();

// ─── State ────────────────────────────────────────────────────────────────────
type Phase = 'idle' | 'expanded' | 'calendar' | 'count';
type TimerPhase = 'off' | 'focus' | 'paused' | 'break';

let appPhase: Phase      = 'idle';
let timerPhase: TimerPhase = 'off';
let timeLeft  = 25 * 60;
let timerTick: ReturnType<typeof setInterval> | undefined;
let mediaPlaying = false;
let sessionCountToday = 0;
let totalFocusSecsToday = 0;

let FOCUS_SECS = 25 * 60;
const BREAK_SECS =  5 * 60;

let globalStats: Record<string, { count: number, totalSecs: number }> = {};

// ─── Session persistence (IPC Database) ────────────────────────────────────────
function loadSessions() {
  if (ipc) {
    ipc.invoke('get-stats').then((stats: any) => {
      if (stats) {
        globalStats = stats;
        const key = todayKey();
        if (stats[key]) {
          sessionCountToday = stats[key].count || 0;
          totalFocusSecsToday = stats[key].totalSecs || 0;
        }
      }
      updateStats();
      renderHeatmap();
    }).catch(() => {
      updateStats();
      renderHeatmap();
    });
    
    ipc.invoke('get-config').then((cfg: any) => {
      renderShortcuts(cfg?.shortcuts || []);
    }).catch(() => {});
  }
}

function renderHeatmap() {
  const container = document.getElementById('t-heatmap');
  if (!container) return;
  
  container.innerHTML = '';
  const today = new Date();
  
  // Render last 7 days
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${dd}`;
    
    const count = globalStats[key]?.count || 0;
    
    const box = document.createElement('div');
    box.className = 'heat-box';
    box.title = `${key}: ${count} sessions`;
    
    if (count === 0) box.style.background = 'rgba(255,255,255,0.07)';
    else if (count < 3) box.style.background = '#16224f';
    else if (count < 5) box.style.background = '#1d3aa6';
    else if (count < 7) box.style.background = '#3d6bff';
    else box.style.background = '#8fa8ff';
    
    container.appendChild(box);
  }
}



function shortcutIcon(s: any, size: number): HTMLElement {
  const wrap = document.createElement('span');
  wrap.className = 'sc-icon';
  let primary = s.iconUrl || '';
  let fallback = '';
  try {
    if (s.target?.startsWith('http')) {
      const u = new URL(s.target);
      primary = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${u.hostname}&size=128`;
      fallback = `${u.origin}/favicon.ico`;
    }
  } catch {}
  const letter = () => { wrap.textContent = String(s.name || '?').trim().charAt(0).toUpperCase(); wrap.classList.add('sc-letter'); };
  if (!primary && s.target && !s.target.startsWith('http')) {
    invoke('get-file-icon', s.target).then((data: string | null) => {
      if (!data) return letter();
      const img = document.createElement('img');
      img.src = data; img.width = size; img.height = size;
      wrap.innerHTML = ''; wrap.appendChild(img);
    }).catch(letter);
    letter();
    return wrap;
  }
  if (!primary) { letter(); return wrap; }
  const img = document.createElement('img');
  img.src = primary; img.width = size; img.height = size;
  img.onerror = () => { if (fallback && img.src !== fallback) img.src = fallback; else letter(); };
  wrap.appendChild(img);
  return wrap;
}

function renderShortcuts(shortcuts: any[]) {
  const real = (shortcuts || []).filter((s) => s && s.target);
  const expContainer = document.getElementById('quick-row-shortcuts');
  const idleContainer = document.getElementById('idle-shortcuts');

  if (expContainer) {
    expContainer.innerHTML = '';
    real.slice(0, 5).forEach((s) => {
      const btn = document.createElement('button');
      btn.className = 'qbtn qbtn-app';
      btn.title = s.name;
      btn.appendChild(shortcutIcon(s, 16));
      btn.addEventListener('click', (e) => { e.stopPropagation(); send('open-shortcut', s.target); });
      expContainer.appendChild(btn);
    });
    const add = document.createElement('button');
    add.className = 'qbtn qbtn-add';
    add.title = 'Add a shortcut';
    add.innerHTML = plusSvgRaw;
    add.addEventListener('click', (e) => { e.stopPropagation(); send('open-settings', 'Shortcuts'); });
    expContainer.appendChild(add);
  }

  if (idleContainer) {
    idleContainer.innerHTML = '';
    real.slice(0, 3).forEach((s) => {
      const btn = document.createElement('button');
      btn.className = 'ibtn ibtn-sm ibtn-app';
      btn.title = s.name;
      btn.appendChild(shortcutIcon(s, 14));
      btn.addEventListener('click', (e) => { e.stopPropagation(); send('open-shortcut', s.target); });
      idleContainer.appendChild(btn);
    });
  }
}

function addSessionStats(countDelta: number, secsDelta: number) {
  if (ipc) {
    ipc.send('add-stats', { count: countDelta, totalSecs: secsDelta });
  }
}
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
loadSessions();

if (ipc) {
  ipc.on('widget-config', (_e: any, cfg: any) => {
    if (cfg && cfg.pomodoroDuration) {
      const newFocus = cfg.pomodoroDuration * 60;
      if (FOCUS_SECS !== newFocus) {
        FOCUS_SECS = newFocus;
        if (timerPhase === 'off') {
          timeLeft = FOCUS_SECS;
          const ring = document.getElementById('ring-time');
          if (ring) {
            const m = Math.floor(timeLeft / 60);
            const s = timeLeft % 60;
            ring.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
          }
        }
      }
    }
  });
}

// ─── HTML ────────────────────────────────────────────────────────────────────
document.getElementById('app')!.innerHTML = `
<div class="pill" id="pill" data-docked="true" data-phase="idle">

  <!-- ══ IDLE ══ -->
  <div class="view view-idle active" id="view-idle">
    <div class="idle-state" id="idle-state-default">
      <button class="overlay-mark" id="btn-count-idle" title="Overlay"><img src="${overlayMark}" alt="" /></button>
      <span class="idle-clock" id="idle-clock">00:00</span>
      <button type="button" class="idle-msg" id="idle-msg"></button>
      <span class="idle-spacer"></span>
      <div class="ctx-slot" id="ctx-slot"></div>
      <div class="idle-links">
        <button class="link-chip" id="btn-idle-github" title="GitHub">${marks.github}<span id="gh-idle-count"></span></button>
        <button class="link-chip" id="btn-idle-discord" title="Discord">${marks.discord}<i id="dc-idle-dot"></i></button>
        <button class="update-chip" id="update-chip" type="button">Update available</button>
      </div>
      <div class="idle-shortcuts" id="idle-shortcuts"></div>
    </div>

    <div class="idle-state" id="idle-state-media" style="display:none">
      <div class="art-chip" id="cd-art-wrapper"><div class="cd-default-art">${musicSvgRaw}</div></div>
      <span class="idle-track" id="idle-track-name"></span>
      <span class="idle-spacer"></span>
      <div class="src-logo" id="idle-source-logo"></div>
      <div class="music-bars" id="idle-music-bars" style="display:none"><span class="bar"></span><span class="bar"></span><span class="bar"></span><span class="bar"></span></div>
      <button class="ibtn ibtn-sm" id="btn-idle-play" title="Play or pause">${playSvgRaw}</button>
    </div>

    <div class="idle-state" id="idle-state-timer" style="display:none">
      <span class="focus-dot"></span>
      <span class="idle-label">Lock In</span>
      <span class="idle-timer-hint" id="idle-timer-hint"></span>
      <span class="idle-spacer"></span>
      <button class="ibtn ibtn-sm" id="btn-idle-timer-toggle" title="Pause or resume">${playSvgRaw}</button>
      <button class="ibtn ibtn-sm" id="btn-idle-notch-expand" title="Open focus screen">${expandSvgRaw}</button>
    </div>
  </div>

  <!-- ══ EXPANDED: one tool at a time, with a dock along the bottom ══ -->
  <div class="view view-exp" id="view-exp">
    <header class="exp-head">
      <h2 id="exp-title">Overview</h2>
      <div class="exp-actions">
        <div id="battery-badge" class="battery" style="display:none">
          <span id="bat-pct">--</span>
          <span id="bat-svg"></span>
        </div>
        <button class="ibtn ibtn-sm" id="btn-collapse" title="Close">${chevronUpSvg}</button>
        <button class="ibtn ibtn-sm" id="btn-close-app" title="Hide Overlay">${closeSvgRaw}</button>
      </div>
    </header>

    <div class="space-stage">
      <section class="space p-overview" data-space="overview">
        <div class="ov-top">
          <div class="ov-time"><span class="ov-clock" id="ov-clock">--:--</span><span class="ov-date" id="ov-date"></span></div>
          <button class="ov-ai" data-go="count" id="ov-ai" title="AI usage"></button>
        </div>
        <button class="ov-card ov-np" data-go="media">
          <div class="ov-art" id="ov-art">${musicSvgRaw}</div>
          <div class="ov-np-text"><b id="ov-np-title">Nothing playing</b><span id="ov-np-artist">Play something in any media app</span></div>
          <div class="music-bars" id="ov-bars" style="display:none"><span class="bar"></span><span class="bar"></span><span class="bar"></span><span class="bar"></span></div>
        </button>
        <div class="ov-row">
          <button class="ov-card" data-go="focus"><span class="ov-icon" style="--tint:#ff9f43">${timerSvg}</span><div><b>Focus</b><span id="ov-focus-state">Off</span></div></button>
          <button class="ov-card" data-go="today"><span class="ov-icon" style="--tint:#3ddc97">${calendarSvgRaw}</span><div><b id="ov-event">Today</b><span id="ov-event-sub">Nothing scheduled</span></div></button>
        </div>
      </section>

      <section class="space p-media" data-space="media">
        <div class="np-head">
          <div class="m-art" id="m-art">${musicSvgRaw}</div>
          <div class="m-info">
            <p class="m-track" id="m-track">Nothing playing</p>
            <p class="m-artist" id="m-artist">Play something in Spotify or any media app</p>
          </div>
          <div id="m-art-logo" class="m-src"></div>
          <div class="music-bars" id="exp-music-bars" style="display:none"><span class="bar"></span><span class="bar"></span><span class="bar"></span><span class="bar"></span></div>
        </div>
        <div class="np-progress">
          <span id="m-elapsed">0:00</span>
          <div class="np-track"><i id="m-prog"></i></div>
          <span id="m-remain">0:00</span>
        </div>
        <div class="m-ctrls">
          <div class="vol-wrap">
            <div id="vol-icon-container" class="vol-btn">${volHighSvgRaw}</div>
            <input type="range" class="vol-slider" id="vol-slider" min="0" max="1" step="0.01" value="0.5" title="Volume">
          </div>
          <div class="np-main">
            <button class="ibtn" id="btn-prev" title="Previous">${prevSvgRaw}</button>
            <button class="ibtn play" id="btn-play" title="Play or pause">${playSvgRaw}</button>
            <button class="ibtn" id="btn-next" title="Next">${nextSvgRaw}</button>
          </div>
          <div class="np-right"><button class="ibtn ibtn-lyrics" id="btn-lyrics" title="Lyrics">${lyricsSvg}</button></div>
        </div>
        <div class="np-lyrics" id="m-lyrics">
          <p class="ly ly-prev" id="ly-prev"></p>
          <p class="ly ly-cur m-lyric" id="m-lyric"></p>
          <p class="ly ly-next" id="ly-next"></p>
        </div>
      </section>

      <section class="space p-timer" data-space="focus">
        <div class="t-main">
          <p class="p-label" id="t-label">Lock In</p>
          <span class="ring-time" id="ring-time">25:00</span>
          <div class="t-stats">
            <span class="chip" id="stat-sessions">0 sessions today</span>
            <span class="chip" id="stat-time">0m focused</span>
          </div>
          <div class="t-btns">
            <button class="btn btn-p" id="btn-lockin">Lock In</button>
            <button class="btn btn-g" id="btn-reset">Reset</button>
            <button class="btn btn-g btn-icon" id="btn-exp-notch-expand" title="Open focus screen">${expandSvgRaw}</button>
          </div>
        </div>
        <div class="t-week"><span class="t-week-label">Last 7 days</span><div id="t-heatmap" class="heatmap"></div></div>
      </section>

      <section class="space p-right" data-space="today">
        <div class="cal-card" id="cal-card-btn" title="Open calendar">
          <div class="cal-left">
            <div class="cal-dow" id="cal-dow">Mon</div>
            <div class="cal-date"><span id="cal-num">1</span> <span id="cal-month">Jan</span></div>
          </div>
          <div class="cal-icon">${chevronRightSvgRaw}</div>
        </div>
        <div class="today-side">
          <p class="p-label">Shortcuts</p>
          <div class="quick-row" id="quick-row"><div id="quick-row-shortcuts" class="quick-shortcuts"></div></div>
          <p class="p-label">Quick actions</p>
          <div class="quick-row">
            <button class="qbtn qbtn-wide" id="qbtn-cam" title="Camera preview">${camSvgRaw}<span>Camera</span></button>
            <button class="qbtn qbtn-wide" id="qbtn-screenshot" title="Screenshot">${screenshotSvgRaw}<span>Screenshot</span></button>
          </div>
        </div>
      </section>

      <section class="space p-count" data-space="count" id="count-space"></section>
      <section class="space p-todos" data-space="todos"></section>
      <section class="space p-note" data-space="note"></section>
      <section class="space p-clipboard" data-space="clipboard"></section>
      <section class="space p-hardware" data-space="hardware"></section>
      <section class="space p-weather" data-space="weather"></section>
      <section class="space p-clocks" data-space="clocks"></section>
      <section class="space p-calc" data-space="calc"></section>
      <section class="space p-shelf" data-space="shelf"></section>
      <section class="space p-colour" data-space="colour"></section>
      <section class="space p-launcher" data-space="launcher"></section>
      <section class="space p-github" data-space="github"></section>
      <section class="space p-discord" data-space="discord"></section>
      <section class="space p-leetcode" data-space="leetcode"></section>
      <section class="space p-terminal" data-space="terminal"></section>
      <section class="space p-convert" data-space="convert"></section>
      <section class="space p-water" data-space="water"></section>
      <section class="space p-habits" data-space="habits"></section>
      <section class="space p-scratch" data-space="scratch"></section>
      <section class="space p-prompter" data-space="prompter"></section>
      <section class="space p-ask" data-space="ask"></section>
      <section class="space p-trading" data-space="trading"></section>
      <section class="space p-vault" data-space="vault"></section>
      <section class="space p-notices" data-space="notices"></section>
      <section class="space p-capture" data-space="capture"></section>
      <section class="space p-recorder" data-space="recorder"></section>
      <section class="space p-camera" data-space="camera"></section>
      <section class="space p-agents" data-space="agents"></section>
      <section class="space p-screentime" data-space="screentime"></section>
      <section class="space p-wallpapers" data-space="wallpapers"></section>
      <section class="space p-kit" data-space="downloads"></section>
      <section class="space p-kit" data-space="ports"></section>
      <section class="space p-kit" data-space="breaks"></section>
      <section class="space p-kit" data-space="find"></section>
    </div>

    <nav class="dock" id="space-dots">
      <button class="space-dot" data-space="overview" data-title="Overview" title="Overview" style="--tint:#5b8cff">${gridSvg}</button>
      <button class="space-dot" data-space="media" data-title="Now Playing" title="Now Playing" style="--tint:#ff5f8f">${musicSvgRaw}</button>
      <button class="space-dot" data-space="focus" data-title="Focus" title="Focus" style="--tint:#ff9f43">${timerSvg}</button>
      <button class="space-dot" data-space="today" data-title="Today" title="Today" style="--tint:#3ddc97">${calendarSvgRaw}</button>
      <button class="space-dot" data-space="count" data-title="AI Usage" title="AI Usage" style="--tint:#7b95ff">${countMark(17, 'currentColor')}</button>
      <button class="space-dot" data-space="todos" data-title="To-Dos" title="To-Dos" style="--tint:#34d399">${ico('<circle cx="12" cy="12" r="8.25"/><path d="m8.5 12.25 2.4 2.4 4.6-4.9"/>')}</button>
      <button class="space-dot" data-space="note" data-title="Note" title="Note" style="--tint:#fbbf24">${ico('<path d="M14.5 4.5H7A2.5 2.5 0 0 0 4.5 7v10A2.5 2.5 0 0 0 7 19.5h10a2.5 2.5 0 0 0 2.5-2.5V9.5"/><path d="m18 3.5 2.5 2.5-7.5 7.5-3.25.75.75-3.25Z"/>')}</button>
      <button class="space-dot" data-space="clipboard" data-title="Clipboard" title="Clipboard" style="--tint:#2dd4bf">${ico('<rect x="6" y="4.5" width="12" height="16" rx="2.5"/><path d="M9.5 4.5V4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v.5M9.5 10h5M9.5 13.5h5M9.5 17h3"/>')}</button>
      <button class="space-dot" data-space="hardware" data-title="Hardware" title="Hardware" style="--tint:#60a5fa">${ico('<rect x="6.5" y="6.5" width="11" height="11" rx="2"/><path d="M9.5 3.5v3M14.5 3.5v3M9.5 17.5v3M14.5 17.5v3M3.5 9.5h3M3.5 14.5h3M17.5 9.5h3M17.5 14.5h3"/><rect x="10" y="10" width="4" height="4" rx="0.75"/>')}</button>
      <button class="space-dot" data-space="weather" data-title="Weather" title="Weather" style="--tint:#38bdf8">${ico('<path d="M9 5.25V4M4.6 7.1l-.9-.9M3.25 11.5H2M13.4 7.1l.9-.9"/><path d="M5.3 13.7a4 4 0 1 1 7.1-3.6"/><path d="M9.25 19.5h8.5a3.5 3.5 0 0 0 .4-6.98 5 5 0 0 0-9.6 1.35A2.85 2.85 0 0 0 9.25 19.5Z"/>')}</button>
      <button class="space-dot" data-space="clocks" data-title="Clocks" title="World clocks" style="--tint:#f472b6">${ico('<circle cx="12" cy="12" r="8.25"/><path d="M3.75 12h16.5M12 3.75c2.3 2.3 3.4 5 3.4 8.25S14.3 17.95 12 20.25M12 3.75C9.7 6.05 8.6 8.75 8.6 12s1.1 5.95 3.4 8.25"/>')}</button>
      <button class="space-dot" data-space="calc" data-title="Calc" title="Calculator and converter" style="--tint:#a3e635">${ico('<rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01" stroke-width="2"/>')}</button>
      <button class="space-dot" data-space="shelf" data-title="Shelf" title="Shelf" style="--tint:#fb923c">${ico('<path d="M4 13.5 6.5 6a2 2 0 0 1 1.9-1.4h7.2A2 2 0 0 1 17.5 6l2.5 7.5"/><path d="M4 13.5h4.5l1.5 2.5h4l1.5-2.5H20V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/>')}</button>
      <button class="space-dot" data-space="colour" data-title="Colour" title="Colour picker" style="--tint:#e879f9">${ico('<path d="M16 3.5a2.1 2.1 0 0 1 3 0l1.5 1.5a2.1 2.1 0 0 1 0 3L19 9.5 14.5 5Z"/><path d="m14.5 5 4.5 4.5-9.5 9.5H5v-4.5Z"/>')}</button>
      <button class="space-dot" data-space="launcher" data-title="Launcher" title="Launch an app" style="--tint:#f87171">${ico('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>')}</button>
      <button class="space-dot" data-space="github" data-title="GitHub" title="GitHub" style="--tint:#c4c4cc">${marks.github}</button>
      <button class="space-dot" data-space="discord" data-title="Discord" title="Discord" style="--tint:#8ea1ff">${marks.discord}</button>
      <button class="space-dot" data-space="leetcode" data-title="LeetCode" title="LeetCode" style="--tint:#ffb340">${marks.leetcode}</button>
      <button class="space-dot" data-space="terminal" data-title="Terminal" title="Terminal" style="--tint:#d4d4d8">${ico('<rect x="3.75" y="4.75" width="16.5" height="14.5" rx="2.5"/><path d="M7.25 9.25 9.75 12l-2.5 2.75M12.25 14.75h4.5"/>')}</button>
      <button class="space-dot" data-space="convert" data-title="Convert" title="Convert" style="--tint:#67e8f9">${ico('<path d="M7 8h9.2M13.6 5.4 16.4 8l-2.8 2.6M17 16H7.8M10.4 13.4 7.6 16l2.8 2.6"/>')}</button>
      <button class="space-dot" data-space="water" data-title="Water" title="Water" style="--tint:#7dd3fc">${`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.8c.35.55 5.4 6.55 5.4 10.05a5.4 5.4 0 1 1-10.8 0C6.6 9.35 11.65 3.35 12 2.8Z"/></svg>`}</button>
      <button class="space-dot" data-space="habits" data-title="Habits" title="Habits" style="--tint:#86efac">${ico('<path d="M8 13.5 10.5 16 16 9"/><circle cx="12" cy="12" r="8.25"/>')}</button>
      <button class="space-dot" data-space="scratch" data-title="Scratchpad" title="Scratchpad" style="--tint:#fcd34d">${ico('<path d="M8 8.5 5.5 12 8 15.5M16 8.5 18.5 12 16 15.5M13 7l-2 10"/>')}</button>
      <button class="space-dot" data-space="prompter" data-title="Prompter" title="Prompter" style="--tint:#fda4af">${ico('<path d="M6 7h12M6 12h12M6 17h8"/>')}</button>
      <button class="space-dot" data-space="ask" data-title="Ask" title="Ask" style="--tint:#c4b5fd">${ico('<path d="M12 3.5 13.4 8l4.6.2-3.6 2.9 1.3 4.4L12 13.2 8.3 15.5 9.6 11 6 8.2 10.6 8Z"/>')}</button>
      <button class="space-dot" data-space="trading" data-title="Trading" title="Trading" style="--tint:#4ade80">${ico('<path d="M4 16.5 9 11l3 2.5L20 6"/><path d="M14 6h6v6"/>')}</button>
      <button class="space-dot" data-space="vault" data-title="Vault" title="Vault" style="--tint:#fbbf24">${ico('<rect x="5" y="10" width="14" height="9" rx="2"/><path d="M8 10V8a4 4 0 0 1 8 0v2"/>')}</button>
      <button class="space-dot" data-space="notices" data-title="Notices" title="Notices" style="--tint:#fb7185">${ico('<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5L19.5 18H4.5Z"/><path d="M10 18.5a2 2 0 0 0 4 0"/>')}</button>
      <button class="space-dot" data-space="capture" data-title="Capture" title="Capture" style="--tint:#f472b6">${ico('<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><circle cx="12" cy="12" r="3"/>')}</button>
      <button class="space-dot" data-space="recorder" data-title="Recorder" title="Recorder" style="--tint:#fb923c">${ico('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>')}</button>
      <button class="space-dot" data-space="camera" data-title="Camera" title="Camera" style="--tint:#facc15">${ico('<path d="M4 8.5h3l1.5-2h7L17 8.5h3v9H4Z"/><circle cx="12" cy="12.5" r="2.4"/>')}</button>
      <button class="space-dot" data-space="agents" data-title="Agents" title="Agents" style="--tint:#a5b4fc">${ico('<path d="M12 3.5 13.6 8.4 18.5 10 13.6 11.6 12 16.5 10.4 11.6 5.5 10 10.4 8.4Z"/><path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7Z"/>')}</button>
      <button class="space-dot" data-space="screentime" data-title="Screen Time" title="Screen Time" style="--tint:#38bdf8">${ico('<circle cx="12" cy="12" r="8"/><path d="M12 8v4.5l3 1.5"/>')}</button>
      <button class="space-dot" data-space="wallpapers" data-title="Wallpapers" title="Wallpapers" style="--tint:#e879f9">${ico('<rect x="4" y="5" width="16" height="14" rx="2"/><path d="m4 15 4.5-4 3 3 2.5-2.5L20 16"/>')}</button>
      <button class="space-dot" data-space="downloads" data-title="Downloads" title="Downloads" style="--tint:#60a5fa">${ico('<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M5 19.5h14"/>')}</button>
      <button class="space-dot" data-space="ports" data-title="Ports" title="Local servers" style="--tint:#34d399">${ico('<rect x="3.5" y="5" width="17" height="6" rx="2"/><rect x="3.5" y="13" width="17" height="6" rx="2"/><path d="M7 8h.01M7 16h.01M11 8h6M11 16h6"/>')}</button>
      <button class="space-dot" data-space="breaks" data-title="Breaks" title="Breaks" style="--tint:#7dd3fc">${ico('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>')}</button>
      <button class="space-dot" data-space="find" data-title="Find" title="Find files" style="--tint:#fda4af">${ico('<path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h4"/><path d="M14 3.5V8h4.5v2"/><circle cx="16" cy="16" r="3"/><path d="m20.5 20.5-2.4-2.4"/>')}</button>
      <span class="dock-sep"></span>
      <button class="dock-btn" id="qbtn-settings" title="Settings">${settingsSvgRaw}</button>
    </nav>
  </div>

  <!-- ══ COUNT SIDEBAR ══ -->
  <div class="view view-count" id="view-count"></div>

  <div class="view" id="view-cal" style="flex-direction: row; width: 100%; height: 100%; padding: 16px 24px; gap: 24px; background: transparent; box-sizing: border-box; overflow: hidden; align-items: stretch; font-family: inherit;">
    <!-- Left: Events List -->
    <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; border-right: 1px solid rgba(255,255,255,0.1); padding-right: 24px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
        <button id="btn-close-cal" class="qbtn" title="Back" style="width:26px; height:26px; border-radius:6px; flex-shrink:0;">
          ${chevronLeftSvgRaw}
        </button>
        <h3 style="font-size: 10px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.08em; margin: 0;">Upcoming</h3>
      </div>
      <div id="cal-events-list" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 8px;"></div>
    </div>
    
    <!-- Middle: Calendar Grid -->
    <div style="flex: 0 0 260px; display: flex; flex-direction: column; justify-content: flex-start; padding-top: 2px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <h2 style="font-size: 16px; font-weight: 700; margin: 0; color: #fff; letter-spacing: -0.02em;">Calendar</h2>
        <div style="display: flex; align-items: center; gap: 2px;">
          <button class="ibtn" id="cal-prev-month" style="padding: 2px;">${chevronLeftSvgRaw}</button>
          <h3 id="cal-month-year" style="font-size: 11px; font-weight: 700; margin: 0; color: #ccc; width: 65px; text-align: center;">Month</h3>
          <button class="ibtn" id="cal-next-month" style="padding: 2px;">${chevronRightSvgRaw}</button>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-bottom: 2px; text-align: center; color: #888; font-size: 9px; font-weight: 700; text-transform: uppercase;">
        <div>SU</div><div>MO</div><div>TU</div><div>WE</div><div>TH</div><div>FR</div><div>SA</div>
      </div>
      <div id="cal-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; flex: 1; align-content: start;"></div>
    </div>

    <!-- Right: Add Event -->
    <div style="flex: 0 0 180px; display: flex; flex-direction: column; justify-content: center; border-left: 1px solid rgba(255,255,255,0.1); padding-left: 24px;">
      <h3 style="font-size: 10px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 6px 0;">New Event</h3>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <input id="cal-new-title" type="text" placeholder="Title..." style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 5px 8px; border-radius: 6px; color: #fff; font-family: inherit; font-size: 11px; outline: none; font-weight: 500;">
        <input id="cal-new-date" type="date" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 5px 8px; border-radius: 6px; color: #fff; font-family: inherit; font-size: 11px; outline: none; color-scheme: dark; font-weight: 500;">
        <button id="cal-add-event" style="background: #fff; color: #000; border: none; padding: 6px; border-radius: 6px; font-weight: 700; font-size: 11px; cursor: pointer; transition: 0.2s;">Add Event</button>
      </div>
    </div>
  </div>

  <!-- Camera popup overlay -->
  <div class="cam-popup hidden" id="cam-popup">
    <button class="cam-close-btn" id="cam-close">
      ${closeSvgRaw}
    </button>
    <video class="cam-feed" id="cam-feed" autoplay muted playsinline></video>
    <div class="cam-status" id="cam-status">Starting camera…</div>
  </div>
</div>
`;

// ─── Refs ─────────────────────────────────────────────────────────────────────
const pill      = document.getElementById('pill')!;
const viewIdle  = document.getElementById('view-idle')!;
const viewExp   = document.getElementById('view-exp')!;
const viewCalEl = document.getElementById('view-cal')!;
const idleClock = document.getElementById('idle-clock')!;

const idleStateDefault = document.getElementById('idle-state-default')!;
const idleStateMedia   = document.getElementById('idle-state-media')!;
const idleStateTimer   = document.getElementById('idle-state-timer')!;
const idleTrackName    = document.getElementById('idle-track-name')!;
const idleTimerHint    = document.getElementById('idle-timer-hint')!;
const btnIdlePlay      = document.getElementById('btn-idle-play')!;
const idleSourceLogo   = document.getElementById('idle-source-logo')!;

// Timer refs
const tLabel   = document.getElementById('t-label')!;
const ringTime = document.getElementById('ring-time')!;
const statSessions = document.getElementById('stat-sessions')!;
const statTime     = document.getElementById('stat-time')!;
// Heatmap handles stats visually now
const btnLockin = document.getElementById('btn-lockin')!;

// Media refs
const mTrack  = document.getElementById('m-track')!;
const mArtist = document.getElementById('m-artist')!;
const mArtLogo = document.getElementById('m-art-logo')!;
const btnPlay = document.getElementById('btn-play')!;
const btnPrev = document.getElementById('btn-prev')!;
const btnNext = document.getElementById('btn-next')!;
const volSlider = document.getElementById('vol-slider') as HTMLInputElement;
const volIconContainer = document.getElementById('vol-icon-container')!;

let currentVolState = -1; // 0=mute, 1=low, 2=high

function updateVolIcon(val: number) {
  if (!volIconContainer || !volSlider) return;
  
  let newState = val === 0 ? 0 : (val < 0.5 ? 1 : 2);
  if (newState !== currentVolState) {
    if (newState === 0) {
      volIconContainer.innerHTML = volMuteSvgRaw;
    } else if (newState === 1) {
      volIconContainer.innerHTML = volLowSvgRaw;
    } else {
      volIconContainer.innerHTML = volHighSvgRaw;
    }
    currentVolState = newState;
  }
  
  const pct = val * 100;
  volSlider.style.background = `linear-gradient(to right, #ffffff ${pct}%, rgba(255,255,255,0.1) ${pct}%)`;
}

// Fetch initial volume
invoke('get-volume').then((v: number) => {
  if (v !== undefined) {
    volSlider.value = String(v);
    updateVolIcon(v);
  }
});
let lastVol = 0.5;

volIconContainer.addEventListener('click', (e) => {
  e.stopPropagation();
  // Visually toggle it on frontend immediately for responsiveness
  if (parseFloat(volSlider.value) === 0) {
    const restoreTo = lastVol > 0 ? lastVol : 0.5;
    volSlider.value = String(restoreTo);
    updateVolIcon(restoreTo);
    send('set-volume', restoreTo);
  } else {
    lastVol = parseFloat(volSlider.value);
    volSlider.value = '0';
    updateVolIcon(0);
    send('set-volume', 0);
  }
});

volSlider.addEventListener('input', (e) => {
  const val = parseFloat((e.target as HTMLInputElement).value);
  send('set-volume', val);
  updateVolIcon(val);
});

// Cal refs
const calNum   = document.getElementById('cal-num')!;
const calMonth = document.getElementById('cal-month')!;
const calDow   = document.getElementById('cal-dow')!;

// Camera refs
const camPopup = document.getElementById('cam-popup')!;
const camFeed  = document.getElementById('cam-feed') as HTMLVideoElement;
const camStatus = document.getElementById('cam-status')!;
const camClose = document.getElementById('cam-close')!;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(secs: number) {
  return `${String(Math.floor(secs / 60)).padStart(2,'0')}:${String(secs % 60).padStart(2,'0')}`;
}

function updateRing() {
  updateStats();
  updateIdleView();
}

function fmtHMS(secs: number) {
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
}

function updateStats() {
  if (statSessions && statTime) {
    statSessions.textContent = `${sessionCountToday} session${sessionCountToday !== 1 ? 's' : ''} today`;
    statTime.textContent     = fmtHMS(totalFocusSecsToday) + ' focused';
  }
}

function updateIdleView() {
  if (!idleStateDefault) return;
  idleStateDefault.style.display = 'none';
  idleStateMedia.style.display = 'none';
  idleStateTimer.style.display = 'none';

  const btnToggle = document.getElementById('btn-idle-timer-toggle');
  if (btnToggle) {
    if (timerPhase === 'focus' || timerPhase === 'break') {
      btnToggle.innerHTML = pauseSvgRaw;
    } else {
      btnToggle.innerHTML = playSvgRaw;
    }
  }

  if (timerPhase === 'focus' || timerPhase === 'break') {
    // Actively running timer takes top priority
    idleStateTimer.style.display = 'flex';
  } else if (mediaPlaying) {
    // Media takes priority over a paused timer
    idleStateMedia.style.display = 'flex';
  } else if (timerPhase === 'paused') {
    // Show paused timer if nothing else is going on
    idleStateTimer.style.display = 'flex';
  } else {
    // Clean default state
    idleStateDefault.style.display = 'flex';
  }
}

// ─── Clock ────────────────────────────────────────────────────────────────────
function tickClock() {
  if (timerPhase === 'focus') return; // idle shows countdown when timer active
  const d = new Date();
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  idleClock.textContent = `${h}:${String(d.getMinutes()).padStart(2,'0')} ${ampm}`;
}
tickClock();
setInterval(tickClock, 1000);

// ─── Calendar init ────────────────────────────────────────────────────────────
(function() {
  const now = new Date();
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const D = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  calNum.textContent   = String(now.getDate());
  calMonth.textContent = M[now.getMonth()];
  calDow.textContent   = D[now.getDay()];
})();

// ─── Phase switcher ──────────────────────────────────────────────────────────
const EXP_W = 600, EXP_H = 360;
const viewCountEl = document.getElementById('view-count')!;

function setPhase(next: Phase) {
  const prev = appPhase;
  appPhase = next;
  if (prev === 'count' && next !== 'count') send('count-sidebar', false);
  if (next === 'expanded') extra.onSpace(currentSpace); else extra.stop();
  if (prev === 'expanded' && next !== 'expanded') desk.onSpace('');
  (window as any).__ctxBar?.phase(next === 'idle');
  // Opening shows the current section as it is; the slide is only for switching sections.
  if (next === 'expanded' && prev !== 'expanded') document.querySelectorAll('.space').forEach((el) => el.classList.remove('enter-left', 'enter-right'));
  if (next === 'expanded' && prev !== 'expanded' && currentSpace === 'camera') desk.onSpace('camera');

  viewIdle.classList.toggle('active', false);
  viewExp.classList.toggle('active', false);
  viewCalEl.classList.toggle('active', false);
  viewCountEl.classList.toggle('active', false);
  pill.setAttribute('data-phase', next);

  if (next === 'idle') {
    // Let the content fade, then shrink the window around the pill.
    setTimeout(() => {
      if (appPhase !== 'idle') return;
      viewIdle.classList.add('active');
      send('resize-window', { width: 280, height: 44 });
    }, 260);
  } else if (next === 'expanded') {
    send('resize-window', { width: EXP_W, height: EXP_H });
    setTimeout(() => { if (appPhase === 'expanded') viewExp.classList.add('active'); }, 60);
  } else if (next === 'calendar') {
    send('resize-window', { width: 760, height: 320 });
    setTimeout(() => {
      if (appPhase === 'calendar') {
        viewCalEl.classList.add('active');
        renderEvents();
        renderCalendar();
      }
    }, 60);
  } else if (next === 'count') {
    send('count-sidebar', true);
    setTimeout(() => { if (appPhase === 'count') viewCountEl.classList.add('active'); }, 80);
  }
}

// ─── Spaces (dot tabs across the top of the expanded notch) ──────────────────
let currentSpace = 'overview';
function showSpace(name: string) {
  const order = ['overview', 'media', 'focus', 'today', 'count', 'todos', 'note', 'clipboard', 'hardware', 'weather', 'clocks', 'calc', 'shelf', 'colour', 'launcher', 'github', 'discord', 'leetcode', 'terminal', 'convert', 'water', 'habits', 'scratch', 'prompter', 'ask', 'trading', 'vault', 'notices', 'capture', 'recorder', 'camera', 'agents', 'screentime', 'wallpapers', 'downloads', 'ports', 'breaks', 'find'];
  const from = order.indexOf(currentSpace);
  const to = order.indexOf(name);
  currentSpace = name;
  document.querySelectorAll<HTMLElement>('.space-dot').forEach((dot) => {
    dot.classList.toggle('active', dot.dataset.space === name);
    if (dot.dataset.space === name) document.getElementById('exp-title')!.textContent = dot.dataset.title || '';
  });
  document.querySelectorAll<HTMLElement>('.space').forEach((el) => {
    const on = el.dataset.space === name;
    el.classList.remove('enter-left', 'enter-right');
    if (on) {
      el.classList.add(to >= from ? 'enter-right' : 'enter-left');
      void el.offsetWidth;
    }
    el.classList.toggle('active', on);
  });
  if (name === 'count') openCountSpace();
  extra.onSpace(name);
  more.onSpace(name);
  links.onSpace(name);
  studio.onSpace(name);
  desk.onSpace(name);
  kit.onSpace(name);
  send('set-setting', 'lastSpace', name);
}
document.querySelectorAll<HTMLElement>('.space-dot').forEach((dot) => {
  dot.addEventListener('click', (e) => { e.stopPropagation(); showSpace(dot.dataset.space || 'media'); });
});
const extra = mountExtraTools({ invoke, send, on: (ch, fn) => ipc?.on(ch, fn) });
const more = mountMoreTools({ invoke, send });
const links = mountLinks({ invoke, send, on: (ch, fn) => ipc?.on(ch, fn) });
const studio = mountStudio({ invoke, send });
const desk = mountDesk({ invoke, send });
const kit = mountKit({ invoke, send });
(window as any).__ctxBar = mountContext({ invoke, send, on: (ch, fn) => ipc?.on(ch, fn), openSpace: (name) => { setPhase('expanded'); showSpace(name); }, isIdle: () => appPhase === 'idle' });
// The dock fades only on a side that still has more to scroll to.
{
  const dock = document.getElementById('space-dots');
  const edges = () => {
    if (!dock) return;
    dock.classList.toggle('more-left', dock.scrollLeft > 2);
    dock.classList.toggle('more-right', dock.scrollLeft + dock.clientWidth < dock.scrollWidth - 2);
  };
  dock?.addEventListener('scroll', edges, { passive: true });
  window.addEventListener('resize', edges);
  new ResizeObserver(edges).observe(dock || document.body);
  setTimeout(edges, 300);
}
setInterval(() => more.tick(), 15_000);

document.querySelectorAll<HTMLElement>('[data-go]').forEach((card) => {
  card.addEventListener('click', (e) => { e.stopPropagation(); showSpace(card.dataset.go || 'overview'); });
});
document.getElementById('btn-collapse')?.addEventListener('click', (e) => { e.stopPropagation(); setPhase('idle'); });
invoke('get-setting', 'lastSpace', 'overview').then((v: any) => showSpace(typeof v === 'string' && v ? v : 'overview')).catch(() => showSpace('overview'));

ipc?.on('preview', () => {
  const order = ['overview', 'media', 'focus', 'today', 'count', 'todos', 'note', 'clipboard', 'hardware', 'weather', 'clocks', 'calc', 'shelf', 'colour', 'launcher', 'github', 'discord', 'leetcode', 'terminal', 'convert', 'water', 'habits', 'scratch', 'prompter', 'ask', 'trading', 'vault', 'notices', 'capture', 'recorder', 'camera', 'agents', 'screentime', 'wallpapers', 'downloads', 'ports', 'breaks', 'find'];
  let k = 0;
  setPhase('expanded');
  setTimeout(() => showSpace(order[0]), 400);
  const t = setInterval(() => {
    k += 1;
    if (k < order.length) showSpace(order[k]);
    else { clearInterval(t); setPhase('idle'); }
  }, 2500);
});
document.getElementById('btn-count-idle')?.addEventListener('click', async (e) => {
  e.stopPropagation();
  const mark = e.currentTarget as HTMLElement;
  setPhase('expanded');
  showSpace('overview');
  if (mark.classList.contains('syncing')) return;
  mark.classList.add('syncing');
  mark.title = 'Syncing…';
  try { await invoke('sync:all'); } catch {}
  mark.classList.remove('syncing');
  mark.classList.add('synced');
  mark.title = 'Overlay · synced just now';
  setTimeout(() => mark.classList.remove('synced'), 1600);
});
// Another window asked for a full sync: reload what the notch shows.
ipc?.on('sync-all', () => { loadSessions(); });
document.getElementById('btn-idle-github')?.addEventListener('click', (e) => {
  e.stopPropagation();
  setPhase('expanded');
  showSpace('github');
});
document.getElementById('btn-idle-discord')?.addEventListener('click', (e) => {
  e.stopPropagation();
  void invoke('links:open', { kind: 'discord' });
});
mountCount({
  sidebar: viewCountEl,
  space: document.getElementById('count-space')!,
  openSidebar: () => { send('open-dashboard', { nav: 'ai' }); setPhase('idle'); },
  close: () => setPhase('idle'),
  invoke,
  on: (ch, fn) => ipc?.on(ch, fn),
});

// ─── Dashboard Timer Sync (IPC) ────────────────────────────────────────────────
if (ipc) {
  ipc.on('sync-timer', (_e: any, state: { type: string, time: number, active: boolean }) => {
    if (state.type === 'none') {
      if (timerPhase !== 'off') resetTimer();
      return;
    }
    
    // Override local timer with dashboard's source of truth
    clearInterval(timerTick);
    
    if (state.type === 'pomodoro') tLabel.textContent = 'Lock In';
    else if (state.type === 'countdown') tLabel.textContent = 'Countdown';
    else if (state.type === 'stopwatch') tLabel.textContent = 'Stopwatch';

    timeLeft = state.time;
    ringTime.textContent = fmt(state.time);
    // Ensure the hint is visible (resetTimer hides it with 'hidden' class)
    idleTimerHint.classList.remove('hidden');
    idleTimerHint.textContent = fmt(state.time);
    
    if (state.active) {
      timerPhase = 'focus';
      btnLockin.textContent = 'Pause';
      // Restart local tick so the notch keeps counting down even if the
      // dashboard window is closed mid-session.
      startTick();
    } else {
      timerPhase = 'paused';
      btnLockin.textContent = 'Resume';
      idleTimerHint.textContent = 'Paused';
    }
    
    updateIdleView();
  });

  // Fired by main.cjs when dashboard is NOT open and user clicks Lock In in notch
  ipc.on('start-local-timer', () => {
    if (timerPhase === 'off') {
      timerPhase = 'focus';
      tLabel.textContent    = 'Focusing';
      btnLockin.textContent = 'Pause';
      idleTimerHint.classList.remove('hidden');
      idleTimerHint.textContent = fmt(timeLeft);
      startTick();
    } else if (timerPhase === 'focus') {
      clearInterval(timerTick);
      timerPhase = 'paused';
      tLabel.textContent    = 'Paused';
      btnLockin.textContent = 'Resume';
      idleTimerHint.textContent = 'Paused';
    } else if (timerPhase === 'paused') {
      timerPhase = 'focus';
      tLabel.textContent    = 'Focusing';
      btnLockin.textContent = 'Pause';
      idleTimerHint.classList.remove('hidden');
      idleTimerHint.textContent = fmt(timeLeft);
      startTick();
    } else if (timerPhase === 'break') {
      tLabel.textContent    = 'Break';
      btnLockin.textContent = 'Skip Break';
      startTick();
    }
    updateIdleView();
  });
}

// ─── Pomodoro timer ───────────────────────────────────────────────────────────

function startTick() {
  clearInterval(timerTick);
  timerTick = setInterval(() => {
    timeLeft--;
    if (timerPhase === 'focus') {
      totalFocusSecsToday++;
      if (totalFocusSecsToday % 5 === 0) addSessionStats(0, 5); // Save to DB every 5 secs
    }

    ringTime.textContent = fmt(timeLeft);
    updateRing();

    // Show countdown in idle pill when active
    if (timerPhase === 'focus' || timerPhase === 'break') {
      idleTimerHint.textContent = fmt(timeLeft);
    }

    if (timeLeft <= 0) {
      clearInterval(timerTick);
      if (timerPhase === 'focus') {
        // Record session
        sessionCountToday++;
        addSessionStats(1, FOCUS_SECS % 5);
        updateStats();

        // Transition to break
        timerPhase = 'break';
        timeLeft   = BREAK_SECS;
        tLabel.textContent   = 'Take a break';
        btnLockin.textContent = 'Start Break';
        updateRing();
        ringTime.textContent = fmt(BREAK_SECS);
        if (Notification.permission === 'granted') new Notification('Focus session complete.', { body: 'Take a 5-minute break.' });
      } else {
        // Break over — reset to idle
        resetTimer();
        if (Notification.permission === 'granted') new Notification('Break over.', { body: 'Ready to lock in again?' });
      }
    }
  }, 1000) as unknown as ReturnType<typeof setInterval>;
}

function resetTimer() {
  clearInterval(timerTick);
  timerPhase = 'off';
  timeLeft = FOCUS_SECS;
  tLabel.textContent    = 'Lock In';
  btnLockin.textContent = 'Lock In';
  updateRing();
  ringTime.textContent  = fmt(FOCUS_SECS);
  idleTimerHint.classList.add('hidden');
  tickClock();
  updateIdleView();
}

btnLockin.addEventListener('click', e => {
  e.stopPropagation();
  if (ipc) {
    ipc.send('toggle-dashboard-timer');
  } else {
    // Fallback if no IPC (e.g., browser preview)
    if (timerPhase === 'off') {
      timerPhase = 'focus';
      tLabel.textContent    = 'Focusing';
      btnLockin.textContent = 'Pause';
      startTick();
    } else if (timerPhase === 'focus') {
      clearInterval(timerTick);
      timerPhase = 'paused';
      tLabel.textContent    = 'Paused';
      btnLockin.textContent = 'Resume';
      idleTimerHint.textContent = 'Paused';
    } else if (timerPhase === 'paused') {
      timerPhase = 'focus';
      tLabel.textContent    = 'Focusing';
      btnLockin.textContent = 'Pause';
      startTick();
    } else if (timerPhase === 'break') {
      tLabel.textContent    = 'Break';
      btnLockin.textContent = 'Skip Break';
      startTick();
    }
    updateIdleView();
  }
});

document.getElementById('btn-idle-timer-toggle')?.addEventListener('click', (e) => {
  e.stopPropagation();
  btnLockin.click();
});

document.getElementById('btn-close-app')?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (ipc) ipc.send('hide-overlay');
});


document.getElementById('btn-idle-notch-expand')?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (ipc) ipc.send('open-dashboard', { expand: true });
});
document.getElementById('btn-exp-notch-expand')?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (ipc) ipc.send('open-dashboard', { expand: true });
});

document.getElementById('btn-reset')?.addEventListener('click', () => {
  if (ipc) ipc.send('toggle-dashboard-timer'); // Reset should ideally send a reset command, but toggle is ok for now. Or we can just fallback to local reset if disconnected.
  resetTimer();
});



// ─── Media controls ──────────────────────────────────────────────────────────
function setPlaying(p: boolean) {
  mediaPlaying = p;
  
  btnPlay.innerHTML = p ? pauseSvgRaw : playSvgRaw;
  btnIdlePlay.innerHTML = p ? pauseSvgRaw : playSvgRaw;
  
  const cdWrapper = document.getElementById('cd-art-wrapper');
  if (cdWrapper) {
    if (p) cdWrapper.classList.add('playing');
    else cdWrapper.classList.remove('playing');
  }

  const idleBars = document.getElementById('idle-music-bars');
  if (idleBars) idleBars.style.display = p ? 'flex' : 'none';

  const expBars = document.getElementById('exp-music-bars');
  if (expBars) expBars.style.display = p ? 'flex' : 'none';
  
  updateIdleView();
}

btnPlay.addEventListener('click', (e) => { e.stopPropagation(); send('media-play-pause'); });
btnIdlePlay.addEventListener('click', (e) => { e.stopPropagation(); send('media-play-pause'); });
btnPrev.addEventListener('click', e => { e.stopPropagation(); send('media-prev'); });
btnNext.addEventListener('click', e => { e.stopPropagation(); send('media-next'); });

// ─── Camera preview ───────────────────────────────────────────────────────────
let camStream: MediaStream | null = null;

async function openCamera() {
  camPopup.classList.remove('hidden');
  camStatus.textContent = 'Starting camera…';
  camStatus.classList.remove('hidden');
  try {
    camStream = await navigator.mediaDevices.getUserMedia({ video: { width: 280, height: 160 }, audio: false });
    camFeed.srcObject = camStream;
    camFeed.onloadedmetadata = () => {
      camFeed.play();
      camStatus.classList.add('hidden');
    };
  } catch (err) {
    camStatus.textContent = 'Camera not available';
  }
}

function closeCamera() {
  if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; }
  camFeed.srcObject = null;
  camPopup.classList.add('hidden');
}

document.getElementById('qbtn-cam')?.addEventListener('click', e => { e.stopPropagation(); openCamera(); });
camClose?.addEventListener('click', e => { e.stopPropagation(); closeCamera(); });

// ─── Settings / Actions ──────────────────────────────────────────────────────
document.getElementById('qbtn-settings')?.addEventListener('click', e => {
  e.stopPropagation();
  send('open-settings');
});

document.getElementById('qbtn-screenshot')?.addEventListener('click', e => {
  e.stopPropagation();
  send('take-screenshot');
});

// ─── File drop hint ──────────────────────────────────────────────────────────
document.getElementById('qbtn-file')?.addEventListener('click', e => {
  e.stopPropagation();
  pill.classList.add('drop-active');
  setTimeout(() => pill.classList.remove('drop-active'), 1500);
});

// ─── IPC listeners ────────────────────────────────────────────────────────────
if (ipc) {
  ipc.on('docked-state', () => { /* the page tracks docking itself */ });

  ipc.on('battery-status', (_: any, b: any) => {
    const badge = document.getElementById('battery-badge') as HTMLElement;
    const pctEl = document.getElementById('bat-pct');
    const icon = document.getElementById('bat-svg');
    if (!badge || !pctEl || !icon || !b || b.hasBattery === false) return;
    const pct = Math.max(0, Math.min(100, Math.round(b.percent ?? 0)));
    const charging = Boolean(b.isCharging || b.acConnected);
    pctEl.textContent = `${pct}%`;
    icon.innerHTML = batterySvg(pct, charging);
    badge.dataset.ready = '1';
    if (badge.dataset.hidden !== '1') badge.style.display = 'flex';
    badge.classList.toggle('charging', charging);
    badge.classList.toggle('low', pct <= 20 && !charging);
    badge.title = charging ? `${pct}% · charging` : `${pct}%${b.timeRemaining > 0 ? ` · about ${Math.floor(b.timeRemaining / 60)} h ${b.timeRemaining % 60} min left` : ''}`;
  });

  ipc.on('widget-config', (_: any, cfg: any) => {
    if (cfg && cfg.shortcuts) {
      renderShortcuts(cfg.shortcuts);
    }
  });

  const updateChip = document.getElementById('update-chip') as HTMLButtonElement | null;
  ipc.on('update-status', (_: any, status: any) => {
    if (!updateChip || !status) return;
    const event = status.event;
    if (event === 'available') {
      updateChip.classList.add('show');
      updateChip.dataset.action = 'wait';
      updateChip.textContent = status.version ? `Update ${status.version}` : 'Update available';
    } else if (event === 'downloading') {
      updateChip.classList.add('show');
      updateChip.dataset.action = 'wait';
      updateChip.textContent = `Updating ${status.percent ?? 0}%`;
    } else if (event === 'downloaded') {
      updateChip.classList.add('show');
      updateChip.dataset.action = 'install';
      updateChip.textContent = 'Restart to update';
    } else if (event === 'not-available' || event === 'error') {
      updateChip.classList.remove('show');
    }
  });
  updateChip?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (updateChip.dataset.action === 'install') send('install-update');
  });

  ipc.on('media-info', (_: any, info: { title: string; artist: string; isPlaying: boolean; albumArt?: string; sourceApp?: string }) => {
    mTrack.textContent  = info.title  || 'Nothing playing';
    mArtist.textContent = info.artist || (info.title ? '' : 'Open Spotify or any media player');
    idleTrackName.textContent = info.title || 'Nothing playing';
    
    if (info.sourceApp) {
      const raw = info.sourceApp.split(/[\\/!]/).filter(Boolean);
      const app = /spotify/i.test(info.sourceApp) ? 'Spotify'
        : /chrome/i.test(info.sourceApp) ? 'Chrome'
        : /msedge|edge/i.test(info.sourceApp) ? 'Edge'
        : /firefox/i.test(info.sourceApp) ? 'Firefox'
        : /zunemusic|music/i.test(info.sourceApp) ? 'Media Player'
        : (raw[raw.length - 1] || info.sourceApp).replace(/\.exe$/i, '');
      const dot = /spotify/i.test(info.sourceApp) ? '#1ed760' : 'rgba(255,255,255,0.55)';
      mArtLogo.innerHTML = `<span class="src-dot" style="background:${dot}"></span>${app}`;
      mArtLogo.style.display = 'flex';
      idleSourceLogo.innerHTML = `<span class="src-dot" style="background:${dot}"></span>`;
    } else {
      mArtLogo.style.display = 'none';
      idleSourceLogo.innerHTML = '';
    }

    // Sync playback state and icons
    setPlaying(info.isPlaying);
    
    // Update CD album art for the idle pill
    const cdWrapper = document.getElementById('cd-art-wrapper');
    const cdDefault = document.querySelector('.cd-default-art');
    if (cdWrapper && cdDefault) {
      if (info.albumArt) {
        cdWrapper.style.backgroundImage = `url(${info.albumArt})`;
        cdWrapper.style.backgroundSize = 'cover';
        cdWrapper.style.backgroundPosition = 'center';
        cdDefault.classList.add('hidden');
      } else {
        cdWrapper.style.backgroundImage = 'none';
        cdDefault.classList.remove('hidden');
      }
    }
    
    // Update expanded media art
    const mArt = document.getElementById('m-art');
    if (mArt) {
      if (info.albumArt) {
        mArt.style.backgroundImage = `url(${info.albumArt})`;
        mArt.style.backgroundSize = 'cover';
        mArt.style.backgroundPosition = 'center';
        mArt.innerHTML = '';
      } else {
        mArt.style.backgroundImage = 'none';
        mArt.innerHTML = musicSvgRaw;
      }
    }

    setPlaying(info.isPlaying);
  });

  ipc.on('widget-config', (_: any, cfg: any) => {
    if (!cfg) return;

    // Re-render shortcuts live when user saves changes from Settings
    renderShortcuts(cfg.shortcuts || []);



    // Panel visibility
    const hideDot = (space: string, hidden: boolean) => {
      const dot = document.querySelector<HTMLElement>(`.space-dot[data-space="${space}"]`);
      if (dot) dot.style.display = hidden ? 'none' : '';
    };
    hideDot('focus', cfg.showTimer === false);
    hideDot('media', cfg.showMedia === false);
    hideDot('today', cfg.showCalendar === false);
    const active = document.querySelector<HTMLElement>('.space-dot.active');
    if (active && active.style.display === 'none') {
      const first = [...document.querySelectorAll<HTMLElement>('.space-dot')].find((d) => d.style.display !== 'none');
      if (first) showSpace(first.dataset.space || 'count');
    }
    if (cfg.showTimer === false) idleStateTimer.style.display = 'none';
    if (cfg.showMedia === false) idleStateMedia.style.display = 'none';

    // Battery badge visibility
    const batteryBadge = document.getElementById('battery-badge') as HTMLElement;
    if (batteryBadge) { batteryBadge.dataset.hidden = cfg.showBattery === false ? '1' : ''; batteryBadge.style.display = cfg.showBattery === false ? 'none' : (batteryBadge.dataset.ready ? 'flex' : 'none'); }
  });

} // end if (ipc)

// qbtn-settings handled above (line ~751)

// ─── Lyrics ──────────────────────────────────────────────────────────────────
// Lines come from the main process; position is interpolated from the last
// timeline report so the current line stays in step between updates.
const mLyric = document.getElementById('m-lyric')!;
const btnLyrics = document.getElementById('btn-lyrics')!;
let lyricLines: { t: number; text: string }[] = [];
let lyricSynced = false;
let lyricTitle = '';
let showLyrics = true;
let pos = { ms: 0, at: Date.now(), playing: false, title: '', duration: 0 };
let lastLyric = '';

invoke('get-setting', 'showLyrics', true).then((v: any) => { showLyrics = v !== false && v !== 'false'; btnLyrics.classList.toggle('on', showLyrics); paintLyric(); });
btnLyrics.addEventListener('click', (e) => {
  e.stopPropagation();
  showLyrics = !showLyrics;
  btnLyrics.classList.toggle('on', showLyrics);
  send('set-setting', 'showLyrics', showLyrics);
  paintLyric();
});

const lyPrev = document.getElementById('ly-prev')!;
const lyNext = document.getElementById('ly-next')!;
const mProg = document.getElementById('m-prog') as HTMLElement;
const mElapsed = document.getElementById('m-elapsed')!;
const mRemain = document.getElementById('m-remain')!;

const nowMs = () => pos.ms + (pos.playing ? Date.now() - pos.at : 0);
const clock = (ms: number) => { const t = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

function lyricIndex(): number {
  if (!lyricSynced || !lyricLines.length || lyricTitle !== pos.title) return -1;
  const now = nowMs() + 250;
  let idx = -1;
  for (let k = 0; k < lyricLines.length; k++) { if (lyricLines[k].t <= now) idx = k; else break; }
  return idx;
}

function paintProgress() {
  const dur = pos.duration || 0;
  const cur = Math.min(dur || Infinity, nowMs());
  mProg.style.width = dur ? `${Math.min(100, (cur / dur) * 100)}%` : '0%';
  mElapsed.textContent = clock(dur ? cur : 0);
  mRemain.textContent = dur ? `-${clock(dur - cur)}` : '0:00';
}

function paintLyric() {
  paintProgress();
  const idx = showLyrics ? lyricIndex() : -1;
  const line = idx >= 0 ? (lyricLines[idx].text || '♪') : (showLyrics && lyricSynced && lyricTitle === pos.title && lyricLines.length ? '♪' : '');
  const key = `${idx}|${line}|${showLyrics}`;
  if (key === lastLyric) return;
  lastLyric = key;
  const box = document.getElementById('m-lyrics')!;
  box.classList.add('swap');
  setTimeout(() => {
    const plainOnly = showLyrics && pos.title && lyricTitle === pos.title && !lyricSynced && lyricLines.length;
    lyPrev.textContent = idx > 0 ? lyricLines[idx - 1].text : '';
    mLyric.textContent = line || (plainOnly ? 'Lyrics found, but without timing' : showLyrics ? (pos.title ? 'No synced lyrics for this song' : '') : 'Lyrics hidden');
    lyNext.textContent = idx >= 0 && idx + 1 < lyricLines.length ? lyricLines[idx + 1].text : '';
    mLyric.classList.toggle('empty', !line);
    box.classList.remove('swap');
  }, 120);
  // The collapsed notch shows the live line in place of the title.
  const live = line && line !== '♪' ? line : '';
  idleTrackName.textContent = live || pos.title || 'Nothing playing';
  idleTrackName.classList.toggle('lyric', Boolean(live));
}
setInterval(paintLyric, 250);

if (ipc) {
  ipc.on('media-info', (_: any, info: any) => {
    const duration = typeof info.durationMs === 'number' ? info.durationMs : (info.title === pos.title ? pos.duration : 0);
    if (typeof info.positionMs === 'number') pos = { ms: info.positionMs, at: info.receivedAt || Date.now(), playing: info.isPlaying, title: info.title, duration };
    else pos = { ...pos, ms: info.title === pos.title ? nowMs() : 0, playing: info.isPlaying, title: info.title, at: Date.now(), duration };
    if (info.title !== lyricTitle) { lyricLines = []; lyricSynced = false; }
    paintLyric();
  });
  ipc.on('media-lyrics', (_: any, res: any) => {
    lyricTitle = res.title;
    lyricLines = res.lines || [];
    lyricSynced = Boolean(res.synced);
    lastLyric = '__';
    paintLyric();
  });
}

// ─── Overview ────────────────────────────────────────────────────────────────
function paintOverview() {
  const d = new Date();
  const ovClock = document.getElementById('ov-clock');
  if (!ovClock) return;
  ovClock.textContent = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  document.getElementById('ov-date')!.textContent = d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('ov-np-title')!.textContent = mTrack.textContent || 'Nothing playing';
  document.getElementById('ov-np-artist')!.textContent = mArtist.textContent || '';
  const art = document.getElementById('ov-art')!;
  const bg = (document.getElementById('m-art') as HTMLElement).style.backgroundImage;
  art.style.backgroundImage = bg || 'none';
  art.classList.toggle('has-art', Boolean(bg && bg !== 'none'));
  (document.getElementById('ov-bars') as HTMLElement).style.display = mediaPlaying ? 'flex' : 'none';
  document.getElementById('ov-focus-state')!.textContent =
    timerPhase === 'focus' ? `${ringTime.textContent} left` : timerPhase === 'paused' ? 'Paused' : timerPhase === 'break' ? 'On a break' : `${sessionCountToday} today`;
}
setInterval(paintOverview, 1000);
paintOverview();

// ─── Position, hover and drag ─────────────────────────────────────────────────
// The window covers the screen; the notch is placed with CSS. We only take the
// mouse while the pointer is over the notch, so the rest stays click-through.
let pillX = window.innerWidth / 2;
let pillY = 0;
let docked = true;
let interactive = false;

function applyPos() {
  pill.style.setProperty('--x', `${Math.round(pillX)}px`);
  pill.style.setProperty('--y', `${docked ? 0 : Math.round(pillY)}px`);
  pill.setAttribute('data-docked', String(docked));
}
invoke('get-setting', 'pillPos', null).then((v: any) => {
  try {
    const p = typeof v === 'string' ? JSON.parse(v) : v;
    if (p && typeof p.x === 'number') { pillX = Math.min(Math.max(p.x, 160), window.innerWidth - 160); pillY = p.y || 0; docked = p.docked !== false; }
  } catch {}
  applyPos();
});
applyPos();

function setInteractive(on: boolean) {
  if (on === interactive) return;
  interactive = on;
  send('set-interactive', on);
}
document.addEventListener('mousemove', (e) => {
  if (dragging) return;
  const over = Boolean((e.target as HTMLElement).closest?.('.pill, .cam-popup, .ctx-pop'));
  setInteractive(over);
});
document.documentElement.addEventListener('mouseleave', () => { if (!dragging) setInteractive(false); });

let pDown = false, dragging = false, origin = { x: 0, y: 0 }, start = { x: 0, y: 0 };

pill.addEventListener('pointerdown', e => {
  const t = e.target as HTMLElement;
  if (e.button !== 0) return;
  if (t.closest('button') || t.closest('.ctx-slot') || ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName) || t.closest('.cam-popup')) return;
  if (t.closest('#cal-card-btn') || t.closest('#view-cal') || t.closest('.vol-wrap') || t.closest('#view-count') || t.closest('.np-track')) return;
  pDown = true;
  dragging = false;
  origin = { x: e.clientX, y: e.clientY };
  start = { x: pillX, y: docked ? 0 : pillY };
  pill.setPointerCapture(e.pointerId);
});

pill.addEventListener('pointermove', e => {
  if (!pDown || appPhase === 'count') return;
  const dx = e.clientX - origin.x, dy = e.clientY - origin.y;
  if (!dragging && Math.hypot(dx, dy) < 8) return;
  if (!dragging) { dragging = true; pill.classList.add('dragging'); }
  const half = pill.offsetWidth / 2;
  pillX = Math.min(Math.max(start.x + dx, half + 8), window.innerWidth - half - 8);
  pillY = Math.min(Math.max(start.y + dy, 0), window.innerHeight - pill.offsetHeight - 8);
  docked = pillY < 28;
  applyPos();
});

pill.addEventListener('pointerup', e => {
  if (!pDown) return;
  pDown = false;
  pill.releasePointerCapture(e.pointerId);
  if (dragging) {
    dragging = false;
    pill.classList.remove('dragging');
    if (docked) pillY = 0;
    applyPos();
    send('set-setting', 'pillPos', JSON.stringify({ x: pillX, y: pillY, docked }));
    return; // a drag never toggles the notch
  }
  const t = e.target as HTMLElement;
  if (t.closest('button') || t.closest('.ctx-slot') || t.tagName === 'INPUT') return;
  if (t.closest('.cal-card') || t.closest('#view-cal') || t.closest('#view-count') || t.closest('.dock')) return;
  if (appPhase === 'count') return;
  if (appPhase === 'expanded' && (t.closest('.space-stage') || t.closest('.exp-head'))) return;
  if (!camPopup.classList.contains('hidden')) { closeCamera(); return; }
  clearTimeout(hoverTimer);
  openedByHover = false;
  setPhase(appPhase === 'idle' ? 'expanded' : 'idle');
});

// Hover to open: resting on the closed notch opens it; leaving closes it again,
// unless you are typing in it or it was opened with a click.
let hoverOpen = true;
let openedByHover = false;
let hoverTimer = 0;
let leaveTimer = 0;
const typing = () => { const a = document.activeElement as HTMLElement | null; return !!a && pill.contains(a) && ['INPUT', 'TEXTAREA', 'SELECT'].includes(a.tagName); };
pill.addEventListener('mouseenter', () => {
  clearTimeout(leaveTimer);
  if (!hoverOpen || appPhase !== 'idle' || dragging || (window as any).__overlayLocked) return;
  hoverTimer = window.setTimeout(() => {
    if (appPhase !== 'idle' || dragging || pDown) return;
    openedByHover = true;
    setPhase('expanded');
  }, 320);
});
pill.addEventListener('mouseleave', () => {
  clearTimeout(hoverTimer);
  if (!openedByHover || appPhase !== 'expanded') return;
  leaveTimer = window.setTimeout(() => {
    const overPop = document.querySelector('.ctx-pop:not([hidden]):hover');
    if (openedByHover && appPhase === 'expanded' && !typing() && !overPop && !pill.matches(':hover')) { openedByHover = false; setPhase('idle'); }
  }, 450);
});
// A click inside makes it stay open until you close it.
pill.addEventListener('pointerdown', () => { if (appPhase === 'expanded') openedByHover = false; });
ipc?.on('widget-config', (_e: unknown, cfg: any) => { if (cfg && 'openOnHover' in cfg) hoverOpen = cfg.openOnHover !== false; });
void invoke('get-config').then((cfg: any) => { hoverOpen = cfg?.openOnHover !== false; });

// Clicking anywhere else on the screen tucks an open notch away.
ipc?.on('window-blur', () => {
  if (interactive) return;
  if (appPhase === 'expanded' || appPhase === 'calendar') setPhase('idle');
});
window.addEventListener('resize', () => { pillX = Math.min(pillX, window.innerWidth - 160); applyPos(); });

// ─── File drop ────────────────────────────────────────────────────────────────
pill.addEventListener('dragover',  e => { e.preventDefault(); pill.classList.add('drop-hover'); });
pill.addEventListener('dragleave', e => { e.preventDefault(); pill.classList.remove('drop-hover'); });
pill.addEventListener('drop', e => {
  e.preventDefault();
  pill.classList.remove('drop-hover');
  const files = [...(e.dataTransfer?.files || [])].map((f) => more.pathFor(f)).filter(Boolean);
  if (!files.length) return;
  more.addToShelf(files);
  pill.classList.add('drop-active');
  setTimeout(() => pill.classList.remove('drop-active'), 900);
  if (appPhase !== 'expanded') setPhase('expanded');
  setTimeout(() => showSpace('shelf'), 120);
});

// ─── Notifications permission ─────────────────────────────────────────────────
if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
  Notification.requestPermission();
}

// ─── Calendar UI Logic ────────────────────────────────────────────────────────
const btnCloseCal = document.getElementById('btn-close-cal');
if (btnCloseCal) {
  btnCloseCal.addEventListener('click', e => {
    e.stopPropagation();
    setPhase('expanded'); // Go back to expanded pill
  });
}

const calCard = document.querySelector('.cal-card');
if (calCard) {
  calCard.addEventListener('click', e => {
    e.stopPropagation();
    setPhase('calendar');
  });
}

const calGrid = document.getElementById('cal-grid');
const calMonthYear = document.getElementById('cal-month-year');
const calEventsList = document.getElementById('cal-events-list');
const btnCalPrev = document.getElementById('cal-prev-month');
const btnCalNext = document.getElementById('cal-next-month');
const btnCalAdd = document.getElementById('cal-add-event');
const inputCalTitle = document.getElementById('cal-new-title') as HTMLInputElement;
const inputCalDate = document.getElementById('cal-new-date') as HTMLInputElement;

let currentCalDate = new Date();
let events: { id: string, title: string, date: string }[] = [];

function loadEvents() {
  invoke('get-events').then((evs: any) => {
    if (evs) {
      events = evs;
      renderEvents();
      renderCalendar();
    }
  });
}
loadEvents();

if (btnCalPrev) btnCalPrev.addEventListener('click', (e) => {
  e.stopPropagation();
  currentCalDate.setMonth(currentCalDate.getMonth() - 1);
  renderCalendar();
});

if (btnCalNext) btnCalNext.addEventListener('click', (e) => {
  e.stopPropagation();
  currentCalDate.setMonth(currentCalDate.getMonth() + 1);
  renderCalendar();
});

if (btnCalAdd) btnCalAdd.addEventListener('click', (e) => {
  e.stopPropagation();
  const title = inputCalTitle?.value.trim();
  const date = inputCalDate?.value;
  if (title && date) {
    const newEvent = { id: Date.now().toString(), title, date };
    events.push(newEvent);
    send('add-event', newEvent);
    renderEvents();
    renderCalendar();
    if (inputCalTitle) inputCalTitle.value = '';
    if (inputCalDate) inputCalDate.value = '';
  }
});

function renderEvents() {
  if (!calEventsList) return;
  calEventsList.innerHTML = '';
  
  // Sort events by date ascending
  const sorted = [...events].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  if (sorted.length === 0) {
    calEventsList.innerHTML = `<div style="color: #666; font-size: 11px; margin-top: 10px; font-weight: 500;">No events found.</div>`;
    return;
  }

  sorted.forEach(ev => {
    const el = document.createElement('div');
    el.style.cssText = 'background: rgba(255,255,255,0.04); border-radius: 8px; padding: 8px 12px; display: flex; align-items: flex-start; justify-content: space-between; border: 1px solid rgba(255,255,255,0.02); transition: 0.2s;';
    el.innerHTML = `
      <div>
        <div style="font-weight: 600; font-size: 12px; color: #fff; margin-bottom: 2px;">${ev.title}</div>
        <div style="font-size: 10px; color: #a0a0a5; font-weight: 500;">${new Date(ev.date).toLocaleDateString()}</div>
      </div>
      <button class="btn-del-ev" data-id="${ev.id}" style="background:none;border:none;color:#555;cursor:pointer;padding:2px;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
    `;
    calEventsList.appendChild(el);
  });
  
  document.querySelectorAll('.btn-del-ev').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      events = events.filter(ev => ev.id !== id);
      send('delete-event', id);
      renderEvents();
      renderCalendar();
    });
  });
}

function renderCalendar() {
  if (!calGrid || !calMonthYear) return;
  const year = currentCalDate.getFullYear();
  const month = currentCalDate.getMonth();
  
  const M = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  // Animation for month change
  calMonthYear.style.opacity = '0';
  calMonthYear.style.transform = 'translateY(-2px)';
  setTimeout(() => {
    calMonthYear.textContent = `${M[month].toUpperCase()}`;
    calMonthYear.style.opacity = '1';
    calMonthYear.style.transform = 'translateY(0)';
    calMonthYear.style.transition = '0.2s ease-out';
  }, 100);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  calGrid.innerHTML = '';
  
  for (let i = 0; i < firstDay; i++) {
    const el = document.createElement('div');
    el.style.cssText = 'aspect-ratio: 1;';
    calGrid.appendChild(el);
  }
  
  const today = new Date();
  for (let d = 1; d <= daysInMonth; d++) {
    const el = document.createElement('div');
    const isToday = year === today.getFullYear() && month === today.getMonth() && d === today.getDate();
    
    // Check if event exists
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const hasEvent = events.some(ev => ev.date === dateStr);
    
    el.style.cssText = `
      aspect-ratio: 1; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      border-radius: 6px; 
      font-size: 11px; 
      font-weight: 600; 
      color: ${isToday ? '#fff' : '#a0a0a5'};
      background: ${isToday ? '#3b82f6' : 'transparent'};
      cursor: pointer;
      position: relative;
      transition: 0.15s;
    `;
    el.textContent = String(d);
    
    if (hasEvent) {
      const dot = document.createElement('div');
      dot.style.cssText = `position:absolute; bottom: 2px; width: 3px; height: 3px; border-radius: 50%; background: ${isToday ? '#fff' : '#3b82f6'};`;
      el.appendChild(dot);
    }
    
    el.onmouseenter = () => { if (!isToday) el.style.background = 'rgba(255,255,255,0.1)'; el.style.color = '#fff'; };
    el.onmouseleave = () => { if (!isToday) { el.style.background = 'transparent'; el.style.color = '#a0a0a5'; } };
    
    calGrid.appendChild(el);
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
updateStats();
send('resize-window', { width: 280, height: 44 });
