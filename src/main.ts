import './style.css';
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
import shortcutSvgRaw from './assets/icons/shortcut.svg?raw';
import volMuteSvgRaw from './assets/icons/vol-mute.svg?raw';
import volLowSvgRaw from './assets/icons/vol-low.svg?raw';
import volHighSvgRaw from './assets/icons/vol-high.svg?raw';

// ─── IPC bridge ───────────────────────────────────────────────────────────────
let ipc: any = null;
try { if ((window as any).require) ipc = (window as any).require('electron').ipcRenderer; } catch {}
const send = (ch: string, ...a: any[]) => ipc?.send(ch, ...a);
const invoke = (ch: string, ...a: any[]) => ipc?.invoke(ch, ...a) || Promise.resolve();

// ─── State ────────────────────────────────────────────────────────────────────
type Phase = 'idle' | 'expanded' | 'calendar';
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
      if (cfg?.shortcuts?.length > 0) {
        renderShortcuts(cfg.shortcuts);
      }
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
    
    if (count === 0) box.style.background = 'rgba(255,255,255,0.08)';
    else if (count < 3) box.style.background = '#0e4429';
    else if (count < 5) box.style.background = '#006d32';
    else if (count < 7) box.style.background = '#26a641';
    else box.style.background = '#39d353';
    
    container.appendChild(box);
  }
}



function renderShortcuts(shortcuts: any[]) {
  const expContainer = document.getElementById('quick-row-shortcuts');
  const idleContainer = document.getElementById('idle-shortcuts');

  const MAX_SLOTS = 4;
  const items = [...shortcuts];
  while (items.length < MAX_SLOTS) {
    items.push({ isPlaceholder: true, name: 'Add Shortcut' });
  }

  const addSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;

  if (expContainer) {
    expContainer.innerHTML = '';
    items.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'qbtn';
      btn.title = s.name;
      
      if (s.isPlaceholder) {
        btn.innerHTML = addSvg.replace('width="14"', 'width="16"').replace('height="14"', 'height="16"');
        btn.addEventListener('click', e => { e.stopPropagation(); if (ipc) ipc.send('open-dashboard'); });
      } else {
        const effectiveIconUrl = s.iconUrl;
        const fallbackIcon = shortcutSvgRaw.replace('width="14"', 'width="18"').replace('height="14"', 'height="18"');
        btn.innerHTML = effectiveIconUrl
          ? `<img src="${effectiveIconUrl}" style="width:18px; height:18px; object-fit:contain; border-radius:3px;" />`
          : fallbackIcon;
        btn.addEventListener('click', e => { e.stopPropagation(); if (ipc) ipc.send('open-shortcut', s.target); });
      }
      expContainer.appendChild(btn);
    });
  }

  if (idleContainer) {
    idleContainer.innerHTML = '';
    items.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'ibtn';
      
      if (s.isPlaceholder) {
        btn.style.cssText = 'padding:0; display:flex; align-items:center; justify-content:center; width:22px; height:22px; flex-shrink:0; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: rgba(255,255,255,0.4); transition: 0.15s;';
        btn.innerHTML = addSvg;
        btn.onmouseover = () => { btn.style.background = 'rgba(255,255,255,0.1)'; btn.style.color = '#fff'; };
        btn.onmouseout = () => { btn.style.background = 'rgba(255,255,255,0.06)'; btn.style.color = 'rgba(255,255,255,0.4)'; };
        btn.addEventListener('click', e => { e.stopPropagation(); if (ipc) ipc.send('open-dashboard'); });
      } else {
        btn.style.cssText = 'padding:0; display:flex; align-items:center; justify-content:center; width:22px; height:22px; flex-shrink:0;';
        const effectiveIconUrl = s.iconUrl;
        const fallbackIcon = shortcutSvgRaw;
        btn.innerHTML = effectiveIconUrl
          ? `<img src="${effectiveIconUrl}" style="width:14px; height:14px; object-fit:contain; border-radius:2px;" />`
          : fallbackIcon;
        btn.addEventListener('click', e => { e.stopPropagation(); if (ipc) ipc.send('open-shortcut', s.target); });
      }
      idleContainer.appendChild(btn);
    });
  }
}

function saveSessions() {
  if (ipc) {
    ipc.send('save-session', { count: sessionCountToday, totalSecs: totalFocusSecsToday });
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

  <!-- ══ IDLE STATE ══ -->
  <div class="view view-idle active" id="view-idle" style="width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0 18px;">
    <div class="idle-state-default" id="idle-state-default" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
      <span class="idle-clock" id="idle-clock">00:00</span>
      <div id="idle-shortcuts" style="display: flex; align-items: center; gap: 6px;"></div>
    </div>
    
    <!-- Media state -->
    <div class="idle-state-media hidden" id="idle-state-media" style="display: none; align-items: center; width: 100%;">
      <div class="cd-disc" id="cd-disc">
        <div class="cd-art-wrapper" id="cd-art-wrapper">
          <div class="cd-default-art"></div>
        </div>
        <div class="cd-grooves"></div>
        <div class="cd-glare"></div>
        <div class="cd-center">
          <div class="cd-hole"></div>
        </div>
      </div>
      <span id="idle-track-name" style="font-size: 13px; font-weight: 600; color: var(--ink); margin-left: 10px; max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"></span>
      <div class="idle-controls" id="idle-controls" style="margin-left: auto; display: flex; align-items: center; gap: 8px;">
        <div id="idle-source-logo" style="display: flex; align-items: center; justify-content: center; opacity: 0.8;"></div>
        <div class="music-bars" id="idle-music-bars" style="display: none; margin-right: 4px;">
        </div>
        <button class="ibtn" id="btn-idle-play" title="Play/Pause" style="padding: 4px; display: flex; align-items: center; justify-content: center;">
          ${playSvgRaw}
        </button>
      </div>
    </div>
    
    <!-- Timer state -->
        <div class="idle-state-timer hidden" id="idle-state-timer" style="display: none; align-items: center; justify-content: center; width: 100%;">
      <span style="font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; margin-right: 12px;">Lock In</span>
      <span class="idle-timer-hint" id="idle-timer-hint" style="font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--ink); margin-right: 12px;"></span>
      <div style="width: 1px; height: 12px; background: rgba(255,255,255,0.2); margin-right: 12px;"></div>
      <div style="display: flex; gap: 4px;">
        <button class="ibtn" id="btn-idle-timer-toggle" title="Pause / Resume" style="padding: 2px; display: flex; align-items: center; justify-content: center; background: transparent; border: none; color: var(--muted); cursor: pointer; transition: 0.2s;">
          ${playSvgRaw}
        </button>
        <button class="ibtn" id="btn-idle-notch-expand" title="Expand Lock Screen" style="padding: 2px; display: flex; align-items: center; justify-content: center; background: transparent; border: none; color: var(--muted); cursor: pointer; transition: 0.2s;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
        </button>
      </div>
    </div>

  </div>

  <!-- ══ EXPANDED STATE ══ -->
  <div class="view view-exp" id="view-exp" style="position: relative;">
    
    

    <!-- TIMER PANEL -->
    <section class="panel p-timer">
      <p class="p-label" id="t-label">Lock In</p>
      
      <div class="t-info">
        <span class="ring-time" id="ring-time">25:00</span>
      </div>

      <div class="t-stats" style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px; margin-bottom: 8px;">
        <div style="display: flex; gap: 4px;">
          <span id="stat-sessions" style="font-size: 10px; font-weight: 600; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; color: #fff;">0 sessions today</span>
          <span id="stat-time" style="font-size: 10px; font-weight: 600; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; color: #fff;">0m focused</span>
        </div>
        <div id="t-heatmap" style="display: flex; flex-direction: row; align-items: center; gap: 4px; margin-top: 2px;">
          <!-- Heatmap rendered here -->
        </div>
      </div>

            <div class="t-btns" style="display:flex; gap:8px;">
        <button class="btn btn-p" id="btn-lockin" style="min-width: 90px;">Lock In</button>
        <button class="btn btn-g" id="btn-reset" style="min-width: 90px;">Reset</button>
        <button class="btn btn-g" id="btn-exp-notch-expand" style="padding: 0 10px;" title="Expand Lock Screen">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
        </button>
      </div>
    </section>

    <div class="div"></div>

    <!-- MEDIA PANEL -->
    <section class="panel p-media">
      <div class="media-row">
        <div class="m-art" id="m-art" style="position: relative;">
          ${musicSvgRaw}
          <div id="m-art-logo" style="position: absolute; bottom: -8px; left: -8px; border-radius: 50%; padding: 4px; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: none; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1);"></div>
        </div>
        <div class="m-info">
          <div style="display: flex; align-items: center; gap: 8px;">
            <p class="m-track" id="m-track">Nothing playing</p>
            <div class="music-bars" id="exp-music-bars" style="display: none; margin-bottom: 4px;">
            </div>
          </div>
          <p class="m-artist" id="m-artist">Open Spotify or any media player</p>
          <div class="m-ctrls">
            <button class="ibtn" id="btn-prev" title="Previous">
              ${prevSvgRaw}
            </button>
            <button class="ibtn play" id="btn-play" title="Play / Pause">
              ${playSvgRaw}
            </button>
            <button class="ibtn" id="btn-next" title="Next">
              ${nextSvgRaw}
            </button>
            <div class="vol-wrap">
              <div id="vol-icon-container" style="display: flex; align-items: center; cursor: pointer; flex-shrink: 0; width: 14px;">
                ${volHighSvgRaw}
              </div>
              <input type="range" class="vol-slider" id="vol-slider" min="0" max="1" step="0.01" value="0.5" title="Volume">
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="div"></div>


    <section class="panel p-right">
      <div class="cal-card" id="cal-card-btn">
        <div class="cal-left">
          <div class="cal-dow" id="cal-dow">Mon</div>
          <div class="cal-date"><span id="cal-num">1</span> <span id="cal-month">Jan</span></div>
        </div>
        <div class="cal-icon">
          ${calendarSvgRaw}
        </div>
      </div>

      <!-- Battery indicator -->
      <div id="battery-badge" style="display:none; align-items:center; gap:6px; font-size:11px; font-weight:600; color:var(--text-main); padding:4px 10px; border-radius:20px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); font-family: 'Helvetica', Arial, sans-serif; cursor: default;">
        <div style="display:flex; align-items:center; gap: 1px;">
          <div class="battery-wrapper" style="position:relative; width: 22px; height: 11px; border: 1px solid rgba(255,255,255,0.4); border-radius: 3px; padding: 1px; box-sizing: border-box;">
            <div id="bat-fill" style="height: 100%; width: 50%; background: #fff; border-radius: 1px; transition: width 0.3s ease, background 0.3s ease;"></div>
            <svg id="bat-charge-icon" style="display:none; position:absolute; left:50%; top:50%; transform:translate(-50%, -50%);" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="#000" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          </div>
          <div style="width: 2px; height: 4px; background: rgba(255,255,255,0.4); border-radius: 0 2px 2px 0;"></div>
        </div>
        <span id="bat-pct" style="margin-top: 1px; color: #fff;">--</span>
      </div>

      <div class="quick-row" id="quick-row">
        <div id="quick-row-shortcuts" style="display:flex; gap:6px;"></div>
        <div class="quick-divider"></div>
        <button class="qbtn" id="qbtn-cam" title="Webcam Preview">
          ${camSvgRaw}
        </button>
        <button class="qbtn" id="qbtn-screenshot" title="Screenshot">
          ${screenshotSvgRaw}
        </button>
        <button class="qbtn" id="qbtn-settings" title="Settings">
          ${settingsSvgRaw}
        </button>
      </div>
    </section>
  </div>
  <div class="view" id="view-cal" style="flex-direction: row; width: 100%; height: 100%; padding: 16px 24px; gap: 24px; background: transparent; box-sizing: border-box; overflow: hidden; align-items: stretch; font-family: 'HelveticaTrace', Helvetica, sans-serif;">
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
function setPhase(next: Phase) {
  appPhase = next;
  
  if (next === 'idle') {
    viewExp.classList.remove('active');
    viewCalEl.classList.remove('active');
    pill.setAttribute('data-phase', next);
    // Smoothly transition DOM inside a large transparent window, then shrink it
    setTimeout(() => {
      if (appPhase === 'idle') {
        viewIdle.classList.add('active');
        send('resize-window', { width: 280, height: 44 });
      }
    }, 280);
  } else if (next === 'expanded') {
    viewIdle.classList.remove('active');
    viewCalEl.classList.remove('active');
    send('resize-window', { width: 840, height: 160 });
    pill.setAttribute('data-phase', next);
    
    setTimeout(() => {
      if (appPhase === 'expanded') viewExp.classList.add('active');
    }, 40);
  } else if (next === 'calendar') {
    viewIdle.classList.remove('active');
    viewExp.classList.remove('active');
    pill.setAttribute('data-phase', next);
    // Open in the same bar, just replacing content
    send('resize-window', { width: 760, height: 320 });
    setTimeout(() => {
      if (appPhase === 'calendar') {
        viewCalEl.classList.add('active');
        renderEvents();
        renderCalendar();
      }
    }, 40);
  }
}

// ─── Pomodoro timer ───────────────────────────────────────────────────────────

function startTick() {
  clearInterval(timerTick);
  timerTick = setInterval(() => {
    timeLeft--;
    if (timerPhase === 'focus') {
      totalFocusSecsToday++;
      if (totalFocusSecsToday % 5 === 0) saveSessions(); // Save to DB every 5 secs
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
        saveSessions();
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
});

document.getElementById('btn-idle-timer-toggle')?.addEventListener('click', (e) => {
  e.stopPropagation();
  btnLockin.click();
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
  ipc.on('docked-state', (_: any, docked: boolean) => {
    pill.setAttribute('data-docked', String(docked));
  });

  ipc.on('battery-status', (_: any, b: any) => {
    const badge = document.getElementById('battery-badge') as HTMLElement;
    const pctEl = document.getElementById('bat-pct');
    const fill  = document.getElementById('bat-fill');
    const chargeIcon = document.getElementById('bat-charge-icon');
    if (!badge || !pctEl || !fill) return;

    const pct = Math.round((b?.percent ?? 0));
    const isCharging = b?.acConnected || false;

    pctEl.textContent = `${pct}%`;
    fill.style.width = `${pct}%`;

    // Color based on level
    let fillBg = '#fff';
    if (pct <= 20 && !isCharging) fillBg = '#ff453a';
    else if (pct <= 50 && !isCharging) fillBg = '#ffd60a';
    else if (isCharging) fillBg = '#30d158';

    fill.style.background = fillBg;
    badge.style.color = '#fff';

    if (chargeIcon) {
      chargeIcon.style.display = isCharging ? 'block' : 'none';
      fill.style.opacity = '1';
    }
  });


  ipc.on('widget-config', (_: any, cfg: any) => {
    if (cfg && cfg.shortcuts) {
      renderShortcuts(cfg.shortcuts);
    }
  });

  ipc.on('media-info', (_: any, info: { title: string; artist: string; isPlaying: boolean; albumArt?: string; sourceApp?: string }) => {
    mTrack.textContent  = info.title  || 'Nothing playing';
    mArtist.textContent = info.artist || (info.title ? '' : 'Open Spotify or any media player');
    idleTrackName.textContent = info.title || 'Nothing playing';
    
    if (info.sourceApp) {
      const appLower = info.sourceApp.toLowerCase();
      let iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>'; // default monitor
      
      if (appLower.includes('spotify')) {
        iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#1DB954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.54.659.3 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.54-1.02.72-1.56.3z"/></svg>';
      } else if (appLower.includes('chrome')) {
        iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4285F4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle><line x1="21.17" y1="8" x2="12" y2="8"></line><line x1="3.95" y1="6.06" x2="8.54" y2="14"></line><line x1="10.88" y1="21.94" x2="15.46" y2="14"></line></svg>';
      } else if (appLower.includes('edge')) {
        iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0078D7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>';
      }

      mArtLogo.innerHTML = iconSvg;
      mArtLogo.style.display = 'flex';
      
      idleSourceLogo.innerHTML = iconSvg;
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
        mArt.innerHTML = '';
      } else {
        mArt.style.backgroundImage = 'none';
        mArt.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>';
      }
    }

    setPlaying(info.isPlaying);
  });

  ipc.on('widget-config', (_: any, cfg: any) => {
    if (!cfg) return;

    // Re-render shortcuts live when user saves changes from Settings
    if (cfg.shortcuts && cfg.shortcuts.length > 0) {
      renderShortcuts(cfg.shortcuts);
    }



    // Panel visibility
    const pTimer = document.querySelector('.p-timer') as HTMLElement;
    const pMedia = document.querySelector('.p-media') as HTMLElement;
    const pRight = document.querySelector('.p-right') as HTMLElement;
    if (pTimer) pTimer.style.display = cfg.showTimer === false ? 'none' : 'flex';
    if (pMedia) pMedia.style.display = cfg.showMedia === false ? 'none' : 'flex';
    if (pRight) pRight.style.display = cfg.showCalendar === false ? 'none' : 'flex';
    if (cfg.showTimer === false) idleStateTimer.style.display = 'none';
    if (cfg.showMedia === false) idleStateMedia.style.display = 'none';

    // Battery badge visibility
    const batteryBadge = document.getElementById('battery-badge') as HTMLElement;
    if (batteryBadge) batteryBadge.style.display = cfg.showBattery !== false ? 'flex' : 'none';
  });

} // end if (ipc)

// qbtn-settings handled above (line ~751)

// ─── Drag & Click ─────────────────────────────────────────────────────────────
let pDown = false, dragged = false, origin = { x: 0, y: 0 };

pill.addEventListener('pointerdown', e => {
  const t = e.target as HTMLElement;
  if (t.closest('button') || t.tagName === 'INPUT' || t.closest('.cam-popup')) return;
  if (t.closest('#cal-card-btn') || t.closest('#view-cal') || t.closest('.vol-wrap')) return;
  pDown = true;
  dragged = false;
  origin = { x: e.screenX, y: e.screenY };
  pill.setPointerCapture(e.pointerId);
});

pill.addEventListener('pointermove', e => {
  if (!pDown) return;
  if (!dragged && (Math.abs(e.screenX - origin.x) > 12 || Math.abs(e.screenY - origin.y) > 12)) {
    dragged = true;
    send('start-drag', origin);
  }
});

pill.addEventListener('pointerup', e => {
  if (!pDown) return;
  pDown = false;
  pill.releasePointerCapture(e.pointerId);
  
  if (dragged) {
    send('stop-drag');
    dragged = false;
    return; // NEVER expand if we were dragging
  } 
  
  // It was a click!
  const t = e.target as HTMLElement;
  if (t.closest('button') || t.tagName === 'INPUT' || t.closest('.cam-popup')) return;
  if (t.closest('.cal-card') || t.closest('#view-cal')) return;
  if (!camPopup.classList.contains('hidden')) { closeCamera(); return; }
  setPhase(appPhase === 'idle' ? 'expanded' : 'idle');
});

// ─── File drop ────────────────────────────────────────────────────────────────
pill.addEventListener('dragover',  e => { e.preventDefault(); pill.classList.add('drop-hover'); });
pill.addEventListener('dragleave', e => { e.preventDefault(); pill.classList.remove('drop-hover'); });
pill.addEventListener('drop', e => {
  e.preventDefault();
  pill.classList.remove('drop-hover');
  const file = e.dataTransfer?.files?.[0];
  if (!file) return;
  const filePath = (file as any).path || file.name;
  try {
    if ((window as any).require) (window as any).require('electron').clipboard.writeText(filePath);
    else navigator.clipboard.writeText(filePath);
    if (Notification.permission === 'granted') new Notification('Path copied', { body: file.name });
  } catch {}
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
