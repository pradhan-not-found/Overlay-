import './dashboard.css';

// ─── IPC ────────────────────────────────────────────────────────────────────
let ipc: any = null;
try { if ((window as any).require) ipc = (window as any).require('electron').ipcRenderer; } catch {}

const root = document.getElementById('dash-root')!;

// ─── SVG Icons ──────────────────────────────────────────────────────────────
const icons = {
  flame: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"/></svg>`,
  timer: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><circle cx="12" cy="14" r="8"/><polyline points="12 10 12 14 14.5 14"/><line x1="4.93" y1="5.64" x2="7.76" y2="8.46"/><line x1="19.07" y1="5.64" x2="16.24" y2="8.46"/></svg>`,
  stopwatch: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><polyline points="12 9 12 13 15 13"/><path d="M9 2h6"/><path d="M12 2v2"/></svg>`,
  chart: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
  calendar: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  play: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  pause: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
  reset: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>`,
  lap: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  share: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
  trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  chevLeft: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
  chevRight: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
};

// ─── Helpers ────────────────────────────────────────────────────────────────
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmt(s: number) {
  const m = Math.floor(s / 60), sc = s % 60;
  return `${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`;
}
function fmtHMS(s: number) {
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sc = s%60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`;
}
function streakColor(n: number) {
  if (n === 0) return '#555555';
  if (n <= 2)  return '#e0d5c0';
  if (n <= 6)  return '#ff9500';
  if (n <= 13) return '#ff6b35';
  return '#ff3b30';
}
function streakGlow(n: number) {
  if (n >= 14) return '0 0 20px rgba(255,59,48,0.5)';
  if (n >= 7)  return '0 0 16px rgba(255,107,53,0.4)';
  if (n >= 3)  return '0 0 12px rgba(255,149,0,0.3)';
  return 'none';
}

// ─── State ──────────────────────────────────────────────────────────────────
let activeNav = 'lockin';
let stats: any = {};
let pomoLeft = (window as any).pomoLeft ?? 25 * 60;
let pomoActive = (window as any).pomoActive ?? false;
let pomoDuration = 25;
let cdLeft = (window as any).cdLeft ?? 60 * 60;
let cdActive = (window as any).cdActive ?? false;
let cdCustomLeft = cdLeft;
let swSecs = (window as any).swSecs ?? 0;
let swActive = (window as any).swActive ?? false;
let laps: {num: number, split: number, elapsed: number}[] = [];
let lastLapElapsed = 0;
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let calEvents: any[] = [];
let tickInterval: any = null;
let totalAllTimeSecs = 0;
let streak = 0;
let todaySecs = 0;
let level = 1;

// ─── Boot ────────────────────────────────────────────────────────────────────
async function boot() {
  if (ipc) {
    try {
      stats = await ipc.invoke('get-stats') || {};
      pomoDuration = parseInt(await ipc.invoke('get-setting', 'pomodoro-duration', '25')) || 25;
      activeNav = await ipc.invoke('get-setting', 'dashboard-nav', 'lockin') || 'lockin';
      const savedCd = parseInt(await ipc.invoke('get-setting', 'countdown-last', '3600')) || 3600;
      if (!cdActive) { cdLeft = savedCd; cdCustomLeft = savedCd; }
      calEvents = await ipc.invoke('get-events') || [];
    } catch {}
    try {
      const today = todayKey();
      laps = ((await ipc.invoke('get-laps', today)) || []).map((r: any) => ({
        num: r.lap_num, split: r.split_secs, elapsed: r.elapsed_secs
      }));
      if (laps.length > 0) lastLapElapsed = laps[laps.length-1].elapsed;
    } catch {}
  }

  if (!(window as any).pomoActive) pomoLeft = pomoDuration * 60;
  (window as any).pomoDuration = pomoDuration;

  computeStats();
  render();
  startTick();
  bindIPC();
}

function computeStats() {
  totalAllTimeSecs = 0; streak = 0; todaySecs = 0;
  const keys = Object.keys(stats).sort((a,b) => b.localeCompare(a));
  for (const k of keys) totalAllTimeSecs += stats[k].totalSecs || 0;

  const today = new Date(); today.setHours(0,0,0,0);
  const tk = todayKey();
  todaySecs = stats[tk]?.totalSecs || 0;

  let checkDate = new Date(today);
  const yk = (() => { const d = new Date(today); d.setDate(d.getDate()-1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  if (!stats[tk]?.totalSecs) {
    if (!stats[yk]?.totalSecs) { streak = 0; }
    else { checkDate.setDate(checkDate.getDate()-1); }
  }
  if (streak !== 0 || stats[tk]?.totalSecs > 0) {
    let ts = 0;
    while (true) {
      const k = `${checkDate.getFullYear()}-${String(checkDate.getMonth()+1).padStart(2,'0')}-${String(checkDate.getDate()).padStart(2,'0')}`;
      if (stats[k]?.totalSecs > 0) { ts++; checkDate.setDate(checkDate.getDate()-1); } else break;
    }
    streak = ts;
  }
  level = Math.floor(totalAllTimeSecs / 18000) + 1;
}

// ─── Render ──────────────────────────────────────────────────────────────────
function render() {
  root.innerHTML = `
    <div class="dash-layout">
      <nav class="nav-rail">
        <div class="nav-brand">${icons.flame}</div>
        <div class="nav-items">
          ${navItem('lockin',    icons.flame,     'Lock In')}
          ${navItem('countdown', icons.timer,     'Countdown')}
          ${navItem('stopwatch', icons.stopwatch, 'Stopwatch')}
          ${navItem('stats',     icons.chart,     'Stats')}
          ${navItem('calendar',  icons.calendar,  'Calendar')}
        </div>
        <div class="nav-footer">
          <div class="nav-stat-chip" title="Focus Level">
            <span class="nav-chip-label">LVL</span>
            <span class="nav-chip-val">${level}</span>
          </div>
          <div class="nav-stat-chip" title="${streak} day streak" style="color:${streakColor(streak)};text-shadow:${streakGlow(streak)};">
            ${icons.flame}
            <span class="nav-chip-val">${streak}d</span>
          </div>
        </div>
      </nav>

      <main class="dash-main">
        <div class="panel ${activeNav==='lockin'    ? 'active':''}" id="panel-lockin">${renderPomodoro()}</div>
        <div class="panel ${activeNav==='countdown' ? 'active':''}" id="panel-countdown">${renderCountdown()}</div>
        <div class="panel ${activeNav==='stopwatch' ? 'active':''}" id="panel-stopwatch">${renderStopwatch()}</div>
        <div class="panel ${activeNav==='stats'     ? 'active':''}" id="panel-stats">${renderStats()}</div>
        <div class="panel ${activeNav==='calendar'  ? 'active':''}" id="panel-calendar">${renderCalendar()}</div>
      </main>
    </div>
  `;
  bindEvents();
}

function navItem(id: string, icon: string, label: string) {
  return `<button class="nav-item ${activeNav===id?'active':''}" data-nav="${id}" title="${label}">
    ${icon}<span class="nav-label">${label}</span>
  </button>`;
}

// ─── Panel Renderers ─────────────────────────────────────────────────────────
function renderPomodoro() {
  const durBtns = [15,25,50,90].map(d =>
    `<button class="dur-btn${pomoDuration===d?' active':''}" data-dur="${d}">${d}m</button>`
  ).join('');
  return `<div class="panel-inner">
    <div class="panel-hdr"><div class="panel-label">LOCK IN</div><div class="panel-sub">Pomodoro Focus Timer</div></div>
    <div class="big-time" id="pomo-time">${fmt(pomoLeft)}</div>
    <div class="dur-row">${durBtns}</div>
    <div class="ctrl-row">
      <button class="ctrl-btn primary" id="btn-pomo-toggle">${pomoActive?icons.pause:icons.play}<span>${pomoActive?'Pause':pomoLeft<pomoDuration*60?'Resume':'Lock In'}</span></button>
      <button class="ctrl-btn secondary" id="btn-pomo-reset">${icons.reset}<span>Reset</span></button>
    </div>
    <div class="session-pills">
      <div class="info-pill">Today &nbsp;<b>${fmtHMS(todaySecs)}</b></div>
    </div>
  </div>`;
}

function renderCountdown() {
  const cdM = String(Math.floor(cdLeft/60)).padStart(2,'0');
  const cdS = String(cdLeft%60).padStart(2,'0');
  return `<div class="panel-inner">
    <div class="panel-hdr"><div class="panel-label">COUNTDOWN</div><div class="panel-sub">Custom Timer</div></div>
    ${cdActive
      ? `<div class="big-time" id="cd-display">${fmt(cdLeft)}</div>`
      : `<div class="cd-input-row">
          <input type="number" id="cd-mins" class="time-input" value="${cdM}" min="0" max="99" placeholder="00">
          <span class="time-colon">:</span>
          <input type="number" id="cd-secs" class="time-input" value="${cdS}" min="0" max="59" placeholder="00">
        </div>`
    }
    <div class="ctrl-row">
      <button class="ctrl-btn primary" id="btn-cd-toggle">${cdActive?icons.pause:icons.play}<span>${cdActive?'Pause':cdLeft<cdCustomLeft?'Resume':'Start'}</span></button>
      <button class="ctrl-btn secondary" id="btn-cd-reset">${icons.reset}<span>Reset</span></button>
    </div>
  </div>`;
}

function renderStopwatch() {
  const lapsHtml = laps.slice().reverse().map(l =>
    `<div class="lap-row"><span class="lap-num">Lap ${l.num}</span><span class="lap-split">${fmt(l.split)}</span><span class="lap-total">${fmtHMS(l.elapsed)}</span></div>`
  ).join('');
  return `<div class="panel-inner">
    <div class="panel-hdr"><div class="panel-label">STOPWATCH</div><div class="panel-sub">Elapsed Time</div></div>
    <div class="big-time mono" id="sw-time">${fmtHMS(swSecs)}</div>
    <div class="ctrl-row">
      <button class="ctrl-btn primary" id="btn-sw-toggle">${swActive?icons.pause:icons.play}<span>${swActive?'Pause':swSecs>0?'Resume':'Start'}</span></button>
      ${swActive?`<button class="ctrl-btn accent" id="btn-sw-lap">${icons.lap}<span>Lap</span></button>`:''}
      <button class="ctrl-btn secondary" id="btn-sw-reset">${icons.reset}<span>Reset</span></button>
    </div>
    ${laps.length>0?`<div class="laps-hdr"><span>Lap</span><span>Split</span><span>Total</span></div><div class="laps-list">${lapsHtml}</div>`:''}
  </div>`;
}

function renderStats() {
  const today = new Date();
  const weekData = Array.from({length:7}, (_,i) => {
    const d = new Date(today); d.setDate(today.getDate()-(6-i));
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return { secs: stats[k]?.totalSecs||0, day: ['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()], isToday: i===6 };
  });
  const maxS = Math.max(...weekData.map(w=>w.secs), 1);
  const bars = weekData.map(w => {
    const pct = Math.max(w.secs/maxS*100, w.secs>0?4:0);
    return `<div class="bar-col">
      <div class="bar-track" title="${Math.round(w.secs/60)}m">
        <div class="bar-fill${w.isToday?' today':''}" style="height:${pct}%"></div>
        <div class="bar-tip">${Math.round(w.secs/60)}m</div>
      </div>
      <div class="bar-lbl">${w.day}</div>
    </div>`;
  }).join('');

  return `<div class="panel-inner">
    <div class="panel-hdr" style="flex-direction:row;align-items:center;justify-content:space-between;">
      <div><div class="panel-label">STATS</div><div class="panel-sub">Activity Overview</div></div>
      <button class="ctrl-btn secondary" id="btn-share" style="width:auto;padding:8px 14px;">${icons.share}<span>Share</span></button>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-lbl">Today</div><div class="stat-val">${fmtHMS(todaySecs)}</div></div>
      <div class="stat-card"><div class="stat-lbl">Streak</div><div class="stat-val" style="color:${streakColor(streak)};text-shadow:${streakGlow(streak)};">${streak} days</div></div>
      <div class="stat-card"><div class="stat-lbl">Level</div><div class="stat-val">${level}</div></div>
      <div class="stat-card"><div class="stat-lbl">All Time</div><div class="stat-val">${Math.floor(totalAllTimeSecs/3600)}h ${Math.floor((totalAllTimeSecs%3600)/60)}m</div></div>
    </div>
    <div class="graph-section">
      <div class="graph-lbl">Last 7 Days</div>
      <div class="bar-chart">${bars}</div>
    </div>
    <div class="share-overlay hidden" id="share-card">
      <div class="share-inner">
        <div class="share-title">Focus Report</div>
        <div class="share-date">${new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
        <div class="share-row">
          <div class="share-stat"><span>${fmtHMS(todaySecs)}</span><small>Today</small></div>
          <div class="share-stat"><span style="color:${streakColor(streak)}">${streak}d</span><small>Streak</small></div>
          <div class="share-stat"><span>Lvl ${level}</span><small>Rank</small></div>
        </div>
      </div>
      <button class="ctrl-btn secondary" id="btn-share-close" style="width:auto;margin-top:12px;">Close</button>
    </div>
  </div>`;
}

function renderCalendar() {
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const today = new Date();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const eventsByDate: Record<string, any[]> = {};
  for (const ev of calEvents) {
    if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
    eventsByDate[ev.date].push(ev);
  }
  const dayHdrs = DAYS.map(d=>`<div class="cal-day-hdr">${d}</div>`).join('');
  let cells = Array(firstDay).fill('<div class="cal-cell empty"></div>').join('');
  for (let d=1; d<=daysInMonth; d++) {
    const ds = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = calYear===today.getFullYear() && calMonth===today.getMonth() && d===today.getDate();
    const evs = eventsByDate[ds]||[];
    const dots = evs.slice(0,3).map(()=>`<span class="cal-dot"></span>`).join('');
    cells += `<div class="cal-cell${isToday?' today':''}${evs.length?' has-ev':''}" data-date="${ds}">
      <span class="cal-num">${d}</span><div class="cal-dots">${dots}</div>
    </div>`;
  }
  const selDate = (window as any)._calSelectedDate || `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const selEvs = eventsByDate[selDate]||[];
  const selEvHtml = selEvs.length
    ? selEvs.map(ev=>`<div class="cal-ev-item"><span class="cal-ev-dot"></span><span class="cal-ev-title">${ev.title}</span><button class="ev-del" data-id="${ev.id}">${icons.trash}</button></div>`).join('')
    : `<div class="cal-empty-msg">No events</div>`;

  return `<div class="cal-layout">
    <div class="cal-left">
      <div class="cal-hdr">
        <button class="icon-btn" id="cal-prev">${icons.chevLeft}</button>
        <span class="cal-month-title">${MONTHS[calMonth]} ${calYear}</span>
        <button class="icon-btn" id="cal-next">${icons.chevRight}</button>
      </div>
      <div class="cal-grid">${dayHdrs}${cells}</div>
    </div>
    <div class="cal-right">
      <div class="cal-events-sec">
        <div class="cal-sec-title">${selDate}</div>
        <div class="cal-evs-list">${selEvHtml}</div>
      </div>
      <div class="cal-add-sec">
        <div class="cal-sec-title">Add Event</div>
        <input id="cal-new-title" class="cal-inp" type="text" placeholder="Event title..." maxlength="60">
        <input id="cal-new-date"  class="cal-inp" type="date" value="${selDate}" style="color-scheme:dark;">
        <button class="ctrl-btn primary" id="btn-cal-add" style="width:100%;justify-content:center;">${icons.plus}<span>Add Event</span></button>
      </div>
    </div>
  </div>`;
}

// ─── Bind Events ─────────────────────────────────────────────────────────────
function bindEvents() {
  // Nav switching
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      activeNav = btn.getAttribute('data-nav') || 'lockin';
      if (ipc) ipc.send('set-setting', 'dashboard-nav', activeNav);
      document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.getAttribute('data-nav')===activeNav));
      document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id===`panel-${activeNav}`));
    });
  });

  // Pomodoro
  document.getElementById('btn-pomo-toggle')?.addEventListener('click', () => { pomoActive=!pomoActive; if(pomoActive&&pomoLeft===0)pomoLeft=pomoDuration*60; refreshPomodoro(); });
  document.getElementById('btn-pomo-reset')?.addEventListener('click', () => { pomoActive=false; pomoLeft=pomoDuration*60; refreshPomodoro(); });
  document.querySelectorAll('.dur-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const dur = parseInt(btn.getAttribute('data-dur')||'25');
      pomoDuration=dur; if(!pomoActive)pomoLeft=dur*60;
      if(ipc) ipc.send('set-setting','pomodoro-duration',dur);
      document.querySelectorAll('.dur-btn').forEach(b=>b.classList.toggle('active',b.getAttribute('data-dur')===String(dur)));
      const el=document.getElementById('pomo-time'); if(el)el.textContent=fmt(pomoLeft);
    });
  });

  // Countdown
  bindCdEvents();

  // Stopwatch
  bindSwEvents();

  // Stats
  document.getElementById('btn-share')?.addEventListener('click', () => document.getElementById('share-card')?.classList.remove('hidden'));
  document.getElementById('btn-share-close')?.addEventListener('click', () => document.getElementById('share-card')?.classList.add('hidden'));

  // Calendar
  bindCalendarEvents();
}

function bindCdEvents() {
  document.getElementById('btn-cd-toggle')?.addEventListener('click', () => {
    if (!cdActive) {
      const m = parseInt((document.getElementById('cd-mins') as HTMLInputElement)?.value)||0;
      const s = parseInt((document.getElementById('cd-secs') as HTMLInputElement)?.value)||0;
      cdLeft=m*60+s; cdCustomLeft=cdLeft;
      if(ipc) ipc.send('set-setting','countdown-last',cdLeft);
    }
    cdActive=!cdActive; refreshCountdown();
  });
  document.getElementById('btn-cd-reset')?.addEventListener('click', () => { cdActive=false; cdLeft=cdCustomLeft; refreshCountdown(); });
}

function bindSwEvents() {
  document.getElementById('btn-sw-toggle')?.addEventListener('click', () => { swActive=!swActive; refreshStopwatch(); });
  document.getElementById('btn-sw-lap')?.addEventListener('click', () => {
    const split=swSecs-lastLapElapsed; lastLapElapsed=swSecs;
    const lap={num:laps.length+1,split,elapsed:swSecs}; laps.push(lap);
    if(ipc) ipc.send('add-lap',{lap_num:lap.num,split_secs:split,elapsed_secs:swSecs});
    refreshStopwatch();
  });
  document.getElementById('btn-sw-reset')?.addEventListener('click', () => {
    swActive=false; swSecs=0; laps=[]; lastLapElapsed=0;
    if(ipc) ipc.send('clear-laps',todayKey()); refreshStopwatch();
  });
}

function bindCalendarEvents() {
  document.getElementById('cal-prev')?.addEventListener('click', () => { calMonth--; if(calMonth<0){calMonth=11;calYear--;} refreshCalendar(); });
  document.getElementById('cal-next')?.addEventListener('click', () => { calMonth++; if(calMonth>11){calMonth=0;calYear++;} refreshCalendar(); });
  document.querySelectorAll('.cal-cell:not(.empty)').forEach(cell => {
    cell.addEventListener('click', () => { const d=cell.getAttribute('data-date'); if(d){(window as any)._calSelectedDate=d; refreshCalendar();} });
  });
  document.getElementById('btn-cal-add')?.addEventListener('click', () => {
    const title=(document.getElementById('cal-new-title') as HTMLInputElement)?.value?.trim();
    const date=(document.getElementById('cal-new-date') as HTMLInputElement)?.value;
    if(!title||!date) return;
    const ev={id:`ev-${Date.now()}`,title,date}; calEvents.push(ev);
    if(ipc) ipc.send('add-event',ev);
    (document.getElementById('cal-new-title') as HTMLInputElement).value='';
    refreshCalendar();
  });
  document.querySelectorAll('.ev-del').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id=btn.getAttribute('data-id'); calEvents=calEvents.filter(ev=>ev.id!==id);
      if(ipc) ipc.send('delete-event',id); refreshCalendar();
    });
  });
}

// ─── Partial Refreshes ────────────────────────────────────────────────────────
function refreshPomodoro() {
  const el=document.getElementById('pomo-time'); if(el)el.textContent=fmt(pomoLeft);
  const btn=document.getElementById('btn-pomo-toggle');
  if(btn)btn.innerHTML=`${pomoActive?icons.pause:icons.play}<span>${pomoActive?'Pause':pomoLeft<pomoDuration*60?'Resume':'Lock In'}</span>`;
}
function refreshCountdown() {
  const p=document.getElementById('panel-countdown'); if(p){p.innerHTML=renderCountdown();bindCdEvents();}
}
function refreshStopwatch() {
  const p=document.getElementById('panel-stopwatch'); if(p){p.innerHTML=renderStopwatch();bindSwEvents();}
}
function refreshCalendar() {
  const p=document.getElementById('panel-calendar'); if(p){p.innerHTML=renderCalendar();bindCalendarEvents();}
}

// ─── Tick Loop ────────────────────────────────────────────────────────────────
function startTick() {
  if(tickInterval) clearInterval(tickInterval);
  tickInterval = setInterval(() => {
    if(pomoActive && pomoLeft>0) {
      pomoLeft--;
      if(ipc && pomoLeft%10===0) ipc.send('add-stats',{count:0,totalSecs:10});
      if(ipc && pomoLeft===0)    ipc.send('add-stats',{count:1,totalSecs:0});
      todaySecs++;
    }
    if(activeNav==='lockin') { const el=document.getElementById('pomo-time'); if(el)el.textContent=fmt(pomoLeft); }

    if(cdActive && cdLeft>0) {
      cdLeft--;
      if(ipc && cdLeft%10===0) ipc.send('add-stats',{count:0,totalSecs:10});
    }
    if(activeNav==='countdown') { const el=document.getElementById('cd-display'); if(el)el.textContent=fmt(cdLeft); }

    if(swActive) {
      swSecs++;
      if(ipc && swSecs%10===0) ipc.send('add-stats',{count:0,totalSecs:10});
    }
    if(activeNav==='stopwatch') { const el=document.getElementById('sw-time'); if(el)el.textContent=fmtHMS(swSecs); }

    // Sync to notch
    if(ipc) {
      let type='none',time=0,active=false;
      if(pomoActive)              {type='pomodoro'; time=pomoLeft; active=true;}
      else if(cdActive)           {type='countdown';time=cdLeft;   active=true;}
      else if(swActive)           {type='stopwatch';time=swSecs;   active=true;}
      else if(pomoLeft<pomoDuration*60) {type='pomodoro'; time=pomoLeft;  active=false;}
      else if(cdLeft<cdCustomLeft)      {type='countdown';time=cdLeft;    active=false;}
      else if(swSecs>0)                 {type='stopwatch';time=swSecs;    active=false;}
      ipc.send('sync-timer',{type,time,active});
    }

    (window as any).pomoLeft=pomoLeft; (window as any).pomoActive=pomoActive;
    (window as any).cdLeft=cdLeft;     (window as any).cdActive=cdActive;
    (window as any).swSecs=swSecs;     (window as any).swActive=swActive;
  }, 1000);
}

// ─── IPC from notch ──────────────────────────────────────────────────────────
function bindIPC() {
  if(!ipc) return;
  ipc.on('toggle-dashboard-timer', () => {
    if(pomoActive||pomoLeft<pomoDuration*60)      { pomoActive=!pomoActive; refreshPomodoro(); }
    else if(cdActive||cdLeft<cdCustomLeft)         { cdActive=!cdActive; refreshCountdown(); }
    else if(swActive||swSecs>0)                    { swActive=!swActive; refreshStopwatch(); }
    else { pomoActive=true; pomoLeft=pomoDuration*60; refreshPomodoro(); }
  });
}

boot();
