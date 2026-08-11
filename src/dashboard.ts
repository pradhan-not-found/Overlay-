import './dashboard.css';

// IPC
let ipc: any = null;
try {
  if ((window as any).require) ipc = (window as any).require('electron').ipcRenderer;
} catch {}

const root = document.getElementById('dash-root')!;


function formatTime(secs: number) {
  if (!secs) return '00:00:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
}

async function render() {
  let stats: any = {};
  let activeTabMode = 'clock';
  let pomoDuration = 25;
  if (ipc) {
    try { 
      stats = await ipc.invoke('get-stats');
      activeTabMode = await ipc.invoke('get-setting', 'dashboard-mode', 'clock');
      pomoDuration = parseInt(await ipc.invoke('get-setting', 'pomodoro-duration', '25')) || 25;
    } catch(e) {}
  }
  
  if (!(window as any).pomoActive) {
    (window as any).pomoLeft = (window as any).pomoLeft ?? (pomoDuration * 60);
  }
  (window as any).pomoDuration = pomoDuration;


  let totalAllTimeSecs = 0;
  let streak = 0;
  let todaySecs = 0;
  
  if (stats) {
    const sortedDates = Object.keys(stats).sort((a,b) => b.localeCompare(a));
    for (const key of sortedDates) {
      totalAllTimeSecs += stats[key].totalSecs || 0;
    }

    let currentDate = new Date();
    currentDate.setHours(0,0,0,0);
    
    let todayKey = currentDate.getFullYear() + '-' + String(currentDate.getMonth()+1).padStart(2,'0') + '-' + String(currentDate.getDate()).padStart(2,'0');
    let yesterdayDate = new Date(currentDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    let yesterdayKey = yesterdayDate.getFullYear() + '-' + String(yesterdayDate.getMonth()+1).padStart(2,'0') + '-' + String(yesterdayDate.getDate()).padStart(2,'0');

    if (stats[todayKey]) {
      todaySecs = stats[todayKey].totalSecs || 0;
    }

    let checkDate = new Date(currentDate);
    if (!stats[todayKey] || stats[todayKey].totalSecs === 0) {
      if (!stats[yesterdayKey] || stats[yesterdayKey].totalSecs === 0) {
        streak = 0;
      } else {
        checkDate = yesterdayDate;
      }
    }

    if (streak !== 0 || (stats[todayKey] && stats[todayKey].totalSecs > 0)) {
      let tempStreak = 0;
      while (true) {
        let k = checkDate.getFullYear() + '-' + String(checkDate.getMonth()+1).padStart(2,'0') + '-' + String(checkDate.getDate()).padStart(2,'0');
        if (stats[k] && stats[k].totalSecs > 0) {
          tempStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
      streak = tempStreak;
    }
  }

  const level = Math.floor(totalAllTimeSecs / 18000) + 1;

  
  root.innerHTML = `
      <style>
        .streak-glow { text-shadow: 0 0 20px rgba(255, 149, 0, 0.4); }
        .timer-glow { font-variant-numeric: tabular-nums; }
        @font-face {
          font-family: 'HelveticaLogo';
          src: url('/fonts/Helvetica.ttf') format('truetype');
        }
        .lock-tab-container {
          -webkit-app-region: no-drag; 
          position: absolute; 
          top: 24px; 
          left: 50%; 
          transform: translateX(-50%); 
          display: flex; 
          gap: 2px; 
          background: rgba(10,10,12,0.6); 
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          padding: 5px; 
          border-radius: 14px; 
          border: 1px solid rgba(255,255,255,0.06); 
          box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 2px rgba(0,0,0,0.6);
          z-index: 100; 
          white-space: nowrap;
        }
        .lock-tab { 
          padding: 8px 20px; 
          border-radius: 10px; 
          font-size: 13px; 
          font-weight: 600; 
          color: #71717a; 
          cursor: pointer; 
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          letter-spacing: 0.02em;
        }
        .lock-tab:hover {
          color: #e4e4e7;
        }
        .lock-tab.active { 
          background: rgba(255,255,255,0.12); 
          color: #ffffff; 
          font-weight: 700;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08);
        }
        .mode-panel { display: none; flex-direction: column; align-items: center; justify-content: center; width: 100%; flex: 1; margin-top: 24px; padding: 0 40px; box-sizing: border-box; overflow: hidden; }
        .mode-panel.active { display: flex; animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .big-timer-btn { padding: 12px 32px; border-radius: 30px; font-size: 16px; font-weight: 600; cursor: pointer; border: none; color: #000; background: #fff; transition: all 0.2s ease; outline: none; letter-spacing: 0.02em; }
        .big-timer-btn:hover { background: #f4f4f5; }
        .big-timer-btn:active { transform: scale(0.95); opacity: 0.9; }
        .big-timer-btn.outline { background: transparent; border: 1.5px solid rgba(255,255,255,0.25); color: #fff; }
        .big-timer-btn.outline:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.4); }
        .pomo-dur-btn { padding: 4px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; color: #a1a1aa; cursor: pointer; transition: 0.2s; }
        .pomo-dur-btn:hover { color: #fff; }
        .pomo-dur-btn.active { background: rgba(255,255,255,0.15); color: #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
        input[type="number"]::-webkit-inner-spin-button, 
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      </style>
      <div class="fade-in" style="display: flex; flex-direction: column; width: 100%; height: 100vh; background: #111; position: relative; overflow: hidden;">
        
        <!-- Draggable Title Bar Area -->
        <div style="-webkit-app-region: drag; position: absolute; top: 0; left: 0; right: 0; height: 60px; z-index: 90;"></div>

        <!-- Tab Bar -->
        <div class="lock-tab-container">
          <div class="lock-tab ${activeTabMode === 'clock' ? 'active' : ''}" data-mode="clock">Clock</div>
          <div class="lock-tab ${activeTabMode === 'pomodoro' ? 'active' : ''}" data-mode="pomodoro">Pomodoro</div>
          <div class="lock-tab ${activeTabMode === 'countdown' ? 'active' : ''}" data-mode="countdown">Countdown</div>
          <div class="lock-tab ${activeTabMode === 'stopwatch' ? 'active' : ''}" data-mode="stopwatch">Stopwatch</div>
        </div>

        <!-- Timer panels fill the middle -->
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 0; padding: 60px 40px 120px; box-sizing: border-box;">

          <div class="mode-panel ${activeTabMode === 'clock' ? 'active' : ''}" id="panel-clock">
            <div style="display:flex; align-items:baseline; justify-content:center; gap:12px; max-width: 100%; width: 100%;">
              <div id="lock-clock-time" style="font-size: clamp(60px, 18vw, 220px); font-weight: 500; color: #f4f4f5; letter-spacing: -0.05em; line-height: 1; font-family: 'HelveticaLogo', sans-serif; flex-shrink: 1; min-width: 0;">--:--</div>
              <div id="lock-clock-ampm" style="font-size: clamp(16px, 3vw, 36px); font-weight: 700; color: #a1a1aa; letter-spacing: -0.02em; font-family: 'HelveticaLogo', sans-serif; flex-shrink: 0;">--</div>
            </div>
          </div>

          <div class="mode-panel ${activeTabMode === 'pomodoro' ? 'active' : ''}" id="panel-pomodoro">
            <div style="font-size: 13px; font-weight: 800; color: #52525b; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 12px;">Lock In</div>
            <div id="pomo-time" class="timer-glow" style="font-size: clamp(80px, 20vw, 220px); font-weight: 500; color: #f4f4f5; letter-spacing: -0.05em; line-height: 1; font-family: 'HelveticaLogo', sans-serif;">25:00</div>
            <div style="display: flex; gap: 16px; margin-top: 32px;">
              <button class="big-timer-btn" id="btn-pomo-toggle">Lock In</button>
              <button class="big-timer-btn outline" id="btn-pomo-reset">Reset</button>
            </div>
            <div class="pomo-duration-selector" style="display: flex; gap: 8px; margin-top: 24px; background: rgba(0,0,0,0.4); padding: 4px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
              <div class="pomo-dur-btn ${pomoDuration === 15 ? 'active' : ''}" data-dur="15">15m</div>
              <div class="pomo-dur-btn ${pomoDuration === 25 ? 'active' : ''}" data-dur="25">25m</div>
              <div class="pomo-dur-btn ${pomoDuration === 50 ? 'active' : ''}" data-dur="50">50m</div>
              <div class="pomo-dur-btn ${pomoDuration === 90 ? 'active' : ''}" data-dur="90">90m</div>
            </div>
          </div>

          <div class="mode-panel ${activeTabMode === 'countdown' ? 'active' : ''}" id="panel-countdown">
            <div style="display:flex; align-items:center; justify-content:center; gap:4px; font-variant-numeric: tabular-nums;">
              <input type="number" id="cd-mins" value="60" style="font-size: clamp(60px, 15vw, 160px); font-weight: 500; color: #f4f4f5; letter-spacing: -0.05em; line-height: 1; font-family: 'HelveticaLogo', sans-serif; background: transparent; border: none; width: 2.2ch; text-align: right; outline: none; border-bottom: 4px solid transparent; transition: 0.2s; padding: 0;" onfocus="this.style.borderBottom='4px solid #fff'" onblur="this.style.borderBottom='4px solid transparent'">
              <span style="font-size: clamp(60px, 15vw, 160px); font-weight: 500; color: #f4f4f5; letter-spacing: -0.05em; line-height: 1; font-family: 'HelveticaLogo', sans-serif; position: relative; top: -4px;">:</span>
              <input type="number" id="cd-secs" value="00" style="font-size: clamp(60px, 15vw, 160px); font-weight: 500; color: #f4f4f5; letter-spacing: -0.05em; line-height: 1; font-family: 'HelveticaLogo', sans-serif; background: transparent; border: none; width: 2.2ch; text-align: left; outline: none; border-bottom: 4px solid transparent; transition: 0.2s; padding: 0;" onfocus="this.style.borderBottom='4px solid #fff'" onblur="this.style.borderBottom='4px solid transparent'">
            </div>
            <div style="display: flex; gap: 16px; margin-top: 16px;">
              <button class="big-timer-btn" id="btn-cd-toggle">Start</button>
              <button class="big-timer-btn outline" id="btn-cd-reset">Reset</button>
            </div>
          </div>

          <div class="mode-panel ${activeTabMode === 'stopwatch' ? 'active' : ''}" id="panel-stopwatch">
            <div id="sw-time" class="timer-glow" style="font-size: clamp(80px, 20vw, 220px); font-weight: 500; color: #f4f4f5; letter-spacing: -0.05em; line-height: 1; font-family: 'HelveticaLogo', sans-serif;">00:00</div>
            <div style="display: flex; gap: 16px; margin-top: 32px;">
              <button class="big-timer-btn" id="btn-sw-toggle">Start</button>
              <button class="big-timer-btn outline" id="btn-sw-reset">Reset</button>
            </div>
          </div>
        </div><!-- end middle flex -->

        <!-- Stats bar floating at bottom -->
        <div style="position: absolute; bottom: 32px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; justify-content: center; gap: clamp(16px, 4vw, 40px); height: 80px; background: rgba(20,20,22,0.6); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 12px 40px rgba(0,0,0,0.5); border-radius: 40px; padding: 0 32px; z-index: 50; font-family: 'HelveticaLogo', sans-serif; white-space: nowrap;">
          
          <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
            <span style="font-size:12px; font-weight:600; color:#a1a1aa; text-transform:uppercase; letter-spacing:0.1em;">Rank</span>
            <span style="font-size:24px; font-weight:600; color:#fff;">Level ${level}</span>
          </div>
          
          <div style="width:1px; height:32px; background:linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.1), rgba(255,255,255,0));"></div>
          
          <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
            <span style="font-size:12px; font-weight:600; color:#a1a1aa; text-transform:uppercase; letter-spacing:0.1em;">Today's Focus</span>
            <span id="expanded-timer" class="timer-glow" style="font-size:24px; font-weight:600; color:#fff;">
              ${formatTime(todaySecs)}
            </span>
          </div>

          <div style="width:1px; height:32px; background:linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.1), rgba(255,255,255,0));"></div>
          
          <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
            <span style="font-size:12px; font-weight:600; color:#a1a1aa; text-transform:uppercase; letter-spacing:0.1em;">Streak</span>
            <span class="streak-glow" style="display:flex; align-items:center; gap:6px; font-size:24px; font-weight:600; color:#ff9500;">
              <svg width="18" height="18" viewBox="0 0 448 512" fill="currentColor" stroke="none" style="position:relative; top:-1px;"><path d="M159.3 5.4c7.8-7.3 19.9-7.2 27.7 .1c27.6 25.9 53.5 53.8 77.7 84c11-14.4 23.5-30.1 37-42.9c7.9-7.4 20.1-7.4 28 .1c34.6 33 63.9 76.6 84.5 118c20.3 40.8 33.8 82.5 33.8 111.9C448 404.2 348.2 512 224 512C98.4 512 0 404.1 0 276.5c0-38.4 17.8-85.3 45.4-131.7C73.3 97.7 112.7 48.6 159.3 5.4zM225.7 416c25.3 0 47.7-7 68.8-21c42.1-29.4 53.4-88.2 28.1-134.4c-4.5-9-16-9.6-22.5-2l-25.2 29.3c-6.6 7.6-18.5 7.4-24.7-.5c-16.5-21-46-58.5-62.8-79.8c-6.3-8-18.3-8.1-24.7-.1c-33.8 42.5-50.8 69.3-50.8 99.4C112 375.4 162.6 416 225.7 416z"></path></svg>
              ${streak} Days
            </span>
          </div>
        </div>
      </div>
    `;
    
  bindEvents();
}


// Tab switching
function bindEvents() {
  document.querySelectorAll('.lock-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.lock-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.mode-panel').forEach(p => p.classList.remove('active'));
      
      const mode = tab.getAttribute('data-mode') || 'clock';
      document.getElementById('panel-' + mode)?.classList.add('active');
      
      if (ipc) ipc.send('set-setting', 'dashboard-mode', mode);
    });
  });

  document.getElementById('btn-pomo-toggle')?.addEventListener('click', () => {
    (window as any).pomoActive = !(window as any).pomoActive;
    document.getElementById('btn-pomo-toggle')!.textContent = (window as any).pomoActive ? "Pause" : "Lock In";
  });
  document.getElementById('btn-pomo-reset')?.addEventListener('click', () => {
    (window as any).pomoActive = false;
    (window as any).pomoLeft = ((window as any).pomoDuration || 25) * 60;
    document.getElementById('btn-pomo-toggle')!.textContent = "Lock In";
    document.getElementById('pomo-time')!.textContent = fmt((window as any).pomoLeft);
  });

  document.querySelectorAll('.pomo-dur-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pomo-dur-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const dur = parseInt(btn.getAttribute('data-dur') || '25');
      (window as any).pomoDuration = dur;
      if (!(window as any).pomoActive) {
        (window as any).pomoLeft = dur * 60;
        document.getElementById('pomo-time')!.textContent = fmt(dur * 60);
      }
      if (ipc) ipc.send('set-setting', 'pomodoro-duration', dur);
    });
  });

  document.getElementById('btn-cd-toggle')?.addEventListener('click', () => {
    if (!(window as any).cdActive) {
      const minInp = document.getElementById('cd-mins') as HTMLInputElement;
      const secInp = document.getElementById('cd-secs') as HTMLInputElement;
      if (minInp && secInp) {
        (window as any).cdLeft = (parseInt(minInp.value) || 0) * 60 + (parseInt(secInp.value) || 0);
      }
    }
    (window as any).cdActive = !(window as any).cdActive;
    document.getElementById('btn-cd-toggle')!.textContent = (window as any).cdActive ? "Pause" : "Resume";
  });
  document.getElementById('btn-cd-reset')?.addEventListener('click', () => {
    (window as any).cdActive = false;
    (window as any).cdLeft = 60 * 60;
    document.getElementById('btn-cd-toggle')!.textContent = "Start";
    const minInp = document.getElementById('cd-mins') as HTMLInputElement;
    const secInp = document.getElementById('cd-secs') as HTMLInputElement;
    if (minInp && secInp) { minInp.value = '60'; secInp.value = '00'; }
  });

  document.getElementById('btn-sw-toggle')?.addEventListener('click', () => {
    (window as any).swActive = !(window as any).swActive;
    document.getElementById('btn-sw-toggle')!.textContent = (window as any).swActive ? "Pause" : "Resume";
  });
  document.getElementById('btn-sw-reset')?.addEventListener('click', () => {
    (window as any).swActive = false;
    (window as any).swSecs = 0;
    document.getElementById('btn-sw-toggle')!.textContent = "Start";
  });
}

// Timers state
(window as any).pomoLeft = (window as any).pomoLeft ?? 25 * 60;
(window as any).pomoActive = (window as any).pomoActive ?? false;

(window as any).cdLeft = (window as any).cdLeft ?? 60 * 60;
(window as any).cdActive = (window as any).cdActive ?? false;

(window as any).swSecs = (window as any).swSecs ?? 0;
(window as any).swActive = (window as any).swActive ?? false;

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sc = s % 60;
  return `${m.toString().padStart(2, '0')}:${sc.toString().padStart(2, '0')}`;
}

// Tick loop
if (!(window as any).clockTickInterval) {
  (window as any).clockTickInterval = setInterval(() => {
    // Clock
    const clockEl = document.getElementById('lock-clock-time');
    const ampmEl = document.getElementById('lock-clock-ampm');
    if (clockEl && ampmEl) {
      const now = new Date();
      let h = now.getHours();
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      h = h ? h : 12;
      const m = now.getMinutes().toString().padStart(2, '0');
      clockEl.textContent = `${h}:${m}`;
      ampmEl.textContent = ampm;
    }

    // Pomodoro
    if ((window as any).pomoActive && (window as any).pomoLeft > 0) {
      (window as any).pomoLeft--;
      if (ipc && (window as any).pomoLeft % 10 === 0) ipc.send('add-stats', { count: 0, totalSecs: 10 }); // Sync to DB every 10s
      if (ipc && (window as any).pomoLeft === 0) ipc.send('add-stats', { count: 1, totalSecs: 0 }); // Session complete
    }
    const pEl = document.getElementById('pomo-time');
    if (pEl) pEl.textContent = fmt((window as any).pomoLeft);

    // Countdown
    if ((window as any).cdActive && (window as any).cdLeft > 0) {
      (window as any).cdLeft--;
      if (ipc && (window as any).cdLeft % 10 === 0) ipc.send('add-stats', { count: 0, totalSecs: 10 });
      const minInp = document.getElementById('cd-mins') as HTMLInputElement;
      const secInp = document.getElementById('cd-secs') as HTMLInputElement;
      if (minInp && secInp) {
        minInp.value = Math.floor((window as any).cdLeft / 60).toString().padStart(2, '0');
        secInp.value = ((window as any).cdLeft % 60).toString().padStart(2, '0');
      }
    }

    // Stopwatch
    if ((window as any).swActive) {
      (window as any).swSecs++;
      if (ipc && (window as any).swSecs % 10 === 0) ipc.send('add-stats', { count: 0, totalSecs: 10 });
    }
    const swEl = document.getElementById('sw-time');
    if (swEl) swEl.textContent = fmt((window as any).swSecs);

    // Broadcast state to notch
    if (ipc) {
      let activeType = 'none';
      let activeTime = 0;
      let activeState = false;
      
      if ((window as any).pomoActive) {
        activeType = 'pomodoro'; activeTime = (window as any).pomoLeft; activeState = true;
      } else if ((window as any).cdActive) {
        activeType = 'countdown'; activeTime = (window as any).cdLeft; activeState = true;
      } else if ((window as any).swActive) {
        activeType = 'stopwatch'; activeTime = (window as any).swSecs; activeState = true;
      } else if ((window as any).pomoLeft < ((window as any).pomoDuration || 25) * 60) {
        activeType = 'pomodoro'; activeTime = (window as any).pomoLeft; activeState = false;
      } else if ((window as any).cdLeft < 60 * 60) {
        activeType = 'countdown'; activeTime = (window as any).cdLeft; activeState = false;
      } else if ((window as any).swSecs > 0) {
        activeType = 'stopwatch'; activeTime = (window as any).swSecs; activeState = false;
      }
      
      ipc.send('sync-timer', { type: activeType, time: activeTime, active: activeState });
    }

  }, 1000);

  // Listen for toggle commands from notch
  if (ipc) {
    ipc.on('toggle-dashboard-timer', () => {
      // Toggle whatever timer is currently running or paused
      if ((window as any).pomoActive || (window as any).pomoLeft < ((window as any).pomoDuration || 25) * 60) {
        document.getElementById('btn-pomo-toggle')?.click();
      } else if ((window as any).cdActive || (window as any).cdLeft < 60 * 60) {
        document.getElementById('btn-cd-toggle')?.click();
      } else if ((window as any).swActive || (window as any).swSecs > 0) {
        document.getElementById('btn-sw-toggle')?.click();
      } else {
        // Default to starting Pomodoro
        document.getElementById('btn-pomo-toggle')?.click();
      }
    });
  }
}

// Controls (moved to bindEvents)


async function updateHeatmapLive() {
  if (!ipc) return;
  try {
    const stats = await ipc.invoke('get-stats');
    const cells = document.querySelectorAll('.heatmap-cell');
    if (!cells.length) return;
    
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const dayStats = stats[key];
    
    if (dayStats && dayStats.totalSecs) {
      let level = 0;
      const mins = dayStats.totalSecs / 60;
      if (mins > 60) level = 4;
      else if (mins > 30) level = 3;
      else if (mins > 10) level = 2;
      else level = 1;
      
      const lastCell = cells[cells.length - 1]; // The last cell is today
      lastCell.setAttribute('data-level', String(level));
      lastCell.setAttribute('title', `${key}: ${Math.round(mins)} mins`);
      
      const expandedTimer = document.getElementById('expanded-timer');
      if (expandedTimer) {
        expandedTimer.textContent = formatTime(dayStats.totalSecs);
      }
    }
  } catch(e) {}
}

render();
setInterval(updateHeatmapLive, 2000);

