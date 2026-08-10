import './dashboard.css';

// IPC
let ipc: any = null;
try {
  if ((window as any).require) ipc = (window as any).require('electron').ipcRenderer;
} catch {}

const root = document.getElementById('dash-root')!;
let isExpanded = false;


function formatTime(secs: number) {
  if (!secs) return '00:00:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
}

async function render() {
  let stats: any = {};
  let cfg: any = {};
  if (ipc) {
    try { 
      stats = await ipc.invoke('get-stats');
      cfg = await ipc.invoke('get-config');
    } catch(e) {}
  }


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

  const expandIcon = isExpanded 
    ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`
    : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`;

  const headerHTML = `
    <div style="position: absolute; top: 24px; right: 24px; cursor: pointer; z-index: 100; opacity: 0.6; transition: opacity 0.2s;" id="btn-toggle-expand" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'">
      ${expandIcon}
    </div>
  `;

  // Generate heatmap grid (last 60 days)
  let heatmapHTML = '<div class="heatmap-scroll"><div class="heatmap-grid">';
  const today = new Date();
  for (let i = 59; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    let level = 0;
    const dayStats = stats[key];
    if (dayStats && dayStats.totalSecs) {
      const mins = dayStats.totalSecs / 60;
      if (mins > 60) level = 4;
      else if (mins > 30) level = 3;
      else if (mins > 10) level = 2;
      else level = 1;
    }
    
    heatmapHTML += `<div class="heatmap-cell" data-level="${level}" title="${key}: ${dayStats ? Math.round(dayStats.totalSecs/60) : 0} mins"></div>`;
  }
  heatmapHTML += '</div></div>';

  const defaultShortcuts = [
    { name: 'Shortcut 1', target: '', iconUrl: '', icon: '' },
    { name: 'Shortcut 2', target: '', iconUrl: '', icon: '' },
    { name: 'Shortcut 3', target: '', iconUrl: '', icon: '' },
    { name: 'Shortcut 4', target: '', iconUrl: '', icon: '' }
  ];


  if ((!cfg.shortcuts || cfg.shortcuts.length === 0) && ipc) {
    cfg.shortcuts = defaultShortcuts;
    ipc.send('save-config', cfg);
  }
  const activeShortcuts = (cfg.shortcuts && cfg.shortcuts.length > 0) ? cfg.shortcuts : defaultShortcuts;

  let shortcutsHTML = '';
  for (const s of activeShortcuts) {
    const fallbackIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12h8M12 8v8"/></svg>`;

    const effectiveIconUrl = s.iconUrl;
    
    const iconContent = effectiveIconUrl
      ? `<img src="${effectiveIconUrl}" style="width:24px; height:24px; object-fit:contain; border-radius:4px;" />`
      : fallbackIcon;
    
    shortcutsHTML += `
      <div class="shortcut-card" data-target="${s.target}" style="position: relative;">
        <div class="shortcut-icon">
          ${iconContent}
        </div>
        <div class="shortcut-name">${s.name}</div>
        <button class="btn-del-shortcut" data-name="${s.name}" style="position: absolute; top: -6px; right: -6px; background: #ff4a4a; color: white; border: none; border-radius: 50%; width: 18px; height: 18px; display: none; cursor: pointer; align-items: center; justify-content: center; font-size: 10px;">X</button>
      </div>
    `;
  }

  
  if (isExpanded) {
    root.innerHTML = `
      <style>
        .streak-glow { text-shadow: 0 0 20px rgba(255, 149, 0, 0.4); }
        .timer-glow { font-variant-numeric: tabular-nums; }
        @font-face {
          font-family: 'HelveticaLogo';
          src: url('/fonts/Helvetica.ttf') format('truetype');
        }
        .lock-tab { padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 700; color: #a1a1aa; cursor: pointer; transition: 0.2s; }
        .lock-tab.active { background: rgba(255,255,255,0.1); color: #fff; }
        .mode-panel { display: none; flex-direction: column; align-items: center; justify-content: center; width: 100%; flex: 1; margin-top: 24px; }
        .mode-panel.active { display: flex; }
        .big-timer-btn { padding: 12px 32px; border-radius: 30px; font-size: 18px; font-weight: 800; cursor: pointer; border: none; color: #000; background: #fff; transition: transform 0.1s; outline: none; }
        .big-timer-btn:active { transform: scale(0.95); }
        .big-timer-btn.outline { background: transparent; border: 2px solid rgba(255,255,255,0.2); color: #fff; }
        input[type="number"]::-webkit-inner-spin-button, 
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      </style>
      ${headerHTML}
      <div class="fade-in" style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100vh; background: #111;">
        
        <div style="position: absolute; top: 24px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; background: rgba(0,0,0,0.5); padding: 4px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.05); z-index: 100;">
          <div class="lock-tab active" data-mode="clock">Clock</div>
          <div class="lock-tab" data-mode="pomodoro">Pomodoro</div>
          <div class="lock-tab" data-mode="countdown">Countdown</div>
          <div class="lock-tab" data-mode="stopwatch">Stopwatch</div>
        </div>

        <div class="mode-panel active" id="panel-clock">
          <div style="display:flex; align-items:baseline; justify-content:center; gap:16px;">
            <div id="lock-clock-time" style="font-size: 260px; font-weight: 900; color: #f4f4f5; letter-spacing: -0.05em; line-height: 1; font-family: 'HelveticaLogo', sans-serif;">--:--</div>
            <div id="lock-clock-ampm" style="font-size: 40px; font-weight: 700; color: #a1a1aa; letter-spacing: -0.02em; font-family: 'HelveticaLogo', sans-serif;">--</div>
          </div>
        </div>

        <div class="mode-panel" id="panel-pomodoro">
          <div id="pomo-time" class="timer-glow" style="font-size: 220px; font-weight: 900; color: #f4f4f5; letter-spacing: -0.05em; line-height: 1; font-family: 'HelveticaLogo', sans-serif;">25:00</div>
          <div style="display: flex; gap: 16px; margin-top: 32px;">
            <button class="big-timer-btn" id="btn-pomo-toggle">Lock In</button>
            <button class="big-timer-btn outline" id="btn-pomo-reset">Reset</button>
          </div>
        </div>

        <div class="mode-panel" id="panel-countdown">
          <div style="display:flex; align-items:center; justify-content:center; gap:8px;">
            <input type="number" id="cd-mins" value="60" style="font-size: 160px; font-weight: 900; color: #f4f4f5; letter-spacing: -0.05em; line-height: 1; font-family: 'HelveticaLogo', sans-serif; background: transparent; border: none; width: 220px; text-align: right; outline: none; border-bottom: 4px solid transparent; transition: 0.2s;" onfocus="this.style.borderBottom='4px solid #fff'" onblur="this.style.borderBottom='4px solid transparent'">
            <span style="font-size: 160px; font-weight: 900; color: #f4f4f5; letter-spacing: -0.05em; line-height: 1; font-family: 'HelveticaLogo', sans-serif; margin-bottom: 20px;">:</span>
            <input type="number" id="cd-secs" value="00" style="font-size: 160px; font-weight: 900; color: #f4f4f5; letter-spacing: -0.05em; line-height: 1; font-family: 'HelveticaLogo', sans-serif; background: transparent; border: none; width: 220px; text-align: left; outline: none; border-bottom: 4px solid transparent; transition: 0.2s;" onfocus="this.style.borderBottom='4px solid #fff'" onblur="this.style.borderBottom='4px solid transparent'">
          </div>
          <div style="display: flex; gap: 16px; margin-top: 16px;">
            <button class="big-timer-btn" id="btn-cd-toggle">Start</button>
            <button class="big-timer-btn outline" id="btn-cd-reset">Reset</button>
          </div>
        </div>

        <div class="mode-panel" id="panel-stopwatch">
          <div id="sw-time" class="timer-glow" style="font-size: 220px; font-weight: 900; color: #f4f4f5; letter-spacing: -0.05em; line-height: 1; font-family: 'HelveticaLogo', sans-serif;">00:00</div>
          <div style="display: flex; gap: 16px; margin-top: 32px;">
            <button class="big-timer-btn" id="btn-sw-toggle">Start</button>
            <button class="big-timer-btn outline" id="btn-sw-reset">Reset</button>
          </div>
        </div>

        <!-- Focus Stats Row -->
        <div style="display: flex; gap: 48px; margin-top: 64px; align-items: center; justify-content: center; font-family: 'HelveticaLogo', sans-serif; flex-shrink: 0;">
          
          <div style="display:flex; flex-direction:column; align-items:center; gap:10px;">
            <span style="font-size:15px; font-weight:800; color:#71717a; text-transform:uppercase; letter-spacing:0.15em;">Rank</span>
            <span style="font-size:28px; font-weight:900; color:#fff;">Level ${level}</span>
          </div>
          
          <div style="width:2px; height:40px; background:rgba(255,255,255,0.08); border-radius: 2px;"></div>
          
          <div style="display:flex; flex-direction:column; align-items:center; gap:10px;">
            <span style="font-size:15px; font-weight:800; color:#71717a; text-transform:uppercase; letter-spacing:0.15em;">Today's Focus</span>
            <span id="expanded-timer" class="timer-glow" style="font-size:28px; font-weight:900; color:#fff;">
              ${formatTime(todaySecs)}
            </span>
          </div>

          <div style="width:2px; height:40px; background:rgba(255,255,255,0.08); border-radius: 2px;"></div>
          
          <div style="display:flex; flex-direction:column; align-items:center; gap:10px;">
            <span style="font-size:15px; font-weight:800; color:#71717a; text-transform:uppercase; letter-spacing:0.15em;">Streak</span>
            <span class="streak-glow" style="display:flex; align-items:center; gap:8px; font-size:28px; font-weight:900; color:#ff9500;">
              <svg width="24" height="24" viewBox="0 0 448 512" fill="currentColor" stroke="none" style="position:relative; top:-2px;"><path d="M159.3 5.4c7.8-7.3 19.9-7.2 27.7 .1c27.6 25.9 53.5 53.8 77.7 84c11-14.4 23.5-30.1 37-42.9c7.9-7.4 20.1-7.4 28 .1c34.6 33 63.9 76.6 84.5 118c20.3 40.8 33.8 82.5 33.8 111.9C448 404.2 348.2 512 224 512C98.4 512 0 404.1 0 276.5c0-38.4 17.8-85.3 45.4-131.7C73.3 97.7 112.7 48.6 159.3 5.4zM225.7 416c25.3 0 47.7-7 68.8-21c42.1-29.4 53.4-88.2 28.1-134.4c-4.5-9-16-9.6-22.5-2l-25.2 29.3c-6.6 7.6-18.5 7.4-24.7-.5c-16.5-21-46-58.5-62.8-79.8c-6.3-8-18.3-8.1-24.7-.1c-33.8 42.5-50.8 69.3-50.8 99.4C112 375.4 162.6 416 225.7 416z"></path></svg>
              ${streak} Days
            </span>
          </div>
        </div>
      </div>
    `;
  } else {
    root.innerHTML = `
      ${headerHTML}
      <style>
        .shortcut-card {
          background: #1a1a1a; border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 16px;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.2s; cursor: pointer; position: relative;
        }
        .shortcut-card:hover { background: #222; transform: translateY(-2px); border-color: rgba(255,255,255,0.15); }
        .shortcut-card:hover .btn-del-shortcut { display: flex !important; }
        .section-title { font-family: 'HelveticaLogo', sans-serif; font-size: 16px; font-weight: 800; color: #f4f4f5; margin-bottom: 12px; letter-spacing: 0.05em; text-transform: uppercase; }
        input { font-family: 'HelveticaLogo', sans-serif; transition: all 0.2s; }
        input:focus { border-color: rgba(255,255,255,0.4) !important; outline: none; }
        .btn-primary { background: #fff; color: #000; border: none; font-family: 'HelveticaLogo', sans-serif; font-weight: 800; cursor: pointer; transition: transform 0.1s; }
        .btn-primary:active { transform: scale(0.95); }
        .btn-primary:hover { background: #f0f0f0; }
        .dash-title .brand { font-family: 'HelveticaLogo', sans-serif; font-weight: 900; font-size: 24px; letter-spacing: -0.02em; }
      </style>
      <div class="fade-in" style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; font-family: 'HelveticaLogo', sans-serif;">
        <div class="dash-header" style="border:none; margin-bottom: 32px; padding:0; flex-direction: column; gap: 8px;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
            <img src="/applogo.png" alt="Overlay Logo" class="dash-logo" style="width:32px; height:32px;" />
            <div class="dash-title"><span class="brand">Overlay Dashboard</span></div>
          </div>
          <div style="color: #a1a1aa; font-size: 13px; font-weight: 600;">Manage your shortcuts & focus data</div>
        </div>
        
        <div style="width: 100%; max-width: 600px; padding: 0 24px;">
          <div class="section-title">Focus Activity Heatmap</div>
          <div class="heatmap-container" style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 24px;">
            ${heatmapHTML}
          </div>

          <div class="section-title">Quick Shortcuts</div>
          <div class="shortcuts-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px;">
            ${shortcutsHTML}
          </div>
          
          <div class="section-title">Add Shortcut</div>
          <div style="display:flex; gap:12px; margin-bottom: 32px; background: rgba(255,255,255,0.03); padding: 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
            <input type="text" id="new-sc-name" placeholder="Shortcut Name" style="background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); padding: 12px 16px; color: #fff; border-radius: 8px; flex: 1; font-size: 14px;">
            <input type="text" id="new-sc-target" placeholder="Target (.exe path or URL)" style="background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); padding: 12px 16px; color: #fff; border-radius: 8px; flex: 2; font-size: 14px;">
            <button id="btn-add-sc" class="btn-primary" style="padding: 0 24px; border-radius: 8px; font-size: 15px;">Add</button>
          </div>
        </div>
      </div>
    `;
  }


  
  document.getElementById('btn-toggle-expand')?.addEventListener('click', () => {
    isExpanded = !isExpanded;
    render();
  });

  document.querySelectorAll('.shortcut-card').forEach(el => {
    el.addEventListener('click', () => {
      const target = el.getAttribute('data-target');
      if (ipc && target) {
        ipc.send('open-shortcut', target);
      }
    });
  });

  document.querySelectorAll('.btn-del-shortcut').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = el.getAttribute('data-name');
      const idx = activeShortcuts.findIndex((s: any) => s.name === name);
      if (idx > -1) {
        activeShortcuts.splice(idx, 1);
        cfg.shortcuts = activeShortcuts;
        if (ipc) ipc.send('save-config', cfg);
        render();
      }
    });
  });

  document.getElementById('btn-add-sc')?.addEventListener('click', async () => {
    const nameInput = document.getElementById('new-sc-name') as HTMLInputElement;
    const targetInput = document.getElementById('new-sc-target') as HTMLInputElement;
    const name = nameInput.value.trim();
    const target = targetInput.value.trim();
    if (!name || !target) return;

    let iconUrl = '';
    if (target.startsWith('http')) {
      try {
        const url = new URL(target);
        iconUrl = `https://www.google.com/s2/favicons?sz=128&domain_url=${url.hostname}`;
      } catch {}
    } else if (ipc) {
      iconUrl = await ipc.invoke('get-file-icon', target) || '';
    }

    const newShortcut = {
      name,
      target,
      iconUrl,
      icon: '<circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon>'
    };

    activeShortcuts.push(newShortcut);
    cfg.shortcuts = activeShortcuts;
    if (ipc) ipc.send('save-config', cfg);
    render();
  });

  document.getElementById('btn-save')!.addEventListener('click', () => {
    const config = { setupComplete: true };
    if (ipc) ipc.send('dashboard-complete', config);
  });
}


// Tab switching
document.querySelectorAll('.lock-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.lock-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.mode-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-' + tab.getAttribute('data-mode'))?.classList.add('active');
  });
});

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
      if (ipc && (window as any).pomoLeft % 10 === 0) ipc.send('save-session', { count: 0, totalSecs: 10 }); // Sync to DB every 10s
    }
    const pEl = document.getElementById('pomo-time');
    if (pEl) pEl.textContent = fmt((window as any).pomoLeft);

    // Countdown
    if ((window as any).cdActive && (window as any).cdLeft > 0) {
      (window as any).cdLeft--;
      if (ipc && (window as any).cdLeft % 10 === 0) ipc.send('save-session', { count: 0, totalSecs: 10 });
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
      if (ipc && (window as any).swSecs % 10 === 0) ipc.send('save-session', { count: 0, totalSecs: 10 });
    }
    const swEl = document.getElementById('sw-time');
    if (swEl) swEl.textContent = fmt((window as any).swSecs);

  }, 1000);
}

// Controls
document.getElementById('btn-pomo-toggle')?.addEventListener('click', () => {
  (window as any).pomoActive = !(window as any).pomoActive;
  document.getElementById('btn-pomo-toggle')!.textContent = (window as any).pomoActive ? "Pause" : "Resume";
});
document.getElementById('btn-pomo-reset')?.addEventListener('click', () => {
  (window as any).pomoActive = false;
  (window as any).pomoLeft = 25 * 60;
  document.getElementById('btn-pomo-toggle')!.textContent = "Lock In";
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

