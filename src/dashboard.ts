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
    { name: 'Shortcut', target: '', iconUrl: '', icon: '' },
    { name: 'Shortcut', target: '', iconUrl: '', icon: '' },
    { name: 'Shortcut', target: '', iconUrl: '', icon: '' },
    { name: 'Shortcut', target: '', iconUrl: '', icon: '' }
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
        .streak-glow { text-shadow: 0 0 20px rgba(255, 149, 0, 0.6); color: #ff9500; }
        .timer-glow { text-shadow: 0 0 30px rgba(255, 255, 255, 0.2); font-variant-numeric: tabular-nums; }
      </style>
      ${headerHTML}
      <div class="fade-in" style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100vh; background: #000;">
        <div style="font-size: 20px; font-weight: 700; color: rgba(255,255,255,0.4); letter-spacing: 3px; text-transform: uppercase; margin-bottom: 32px;">Level ${level}</div>
        <div class="timer-glow" id="expanded-timer" style="font-size: 130px; font-weight: 800; color: #fff; letter-spacing: -0.04em; line-height: 1; margin-bottom: 40px;">
          ${formatTime(todaySecs)}
        </div>
        <div style="display: flex; align-items: center; gap: 12px; font-size: 28px; font-weight: 800;" class="streak-glow">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M17.5 10c0 3-2.5 5.5-5.5 5.5S6.5 13 6.5 10a5.5 5.5 0 0 1 11 0z" opacity="0.3"/><path d="M12 2c-3.3 4-5 8-5 11 0 2.8 2.2 5 5 5s5-2.2 5-5c0-3-1.7-7-5-11zm0 13c-1.1 0-2-.9-2-2 0-1.5 1.5-3.5 2-4.5.5 1 2 3 2 4.5 0 1.1-.9 2-2 2z"/></svg>
          ${streak} Day Streak
        </div>
      </div>
    `;
  } else {
    root.innerHTML = `
      ${headerHTML}
      <style>
        .shortcut-card:hover .btn-del-shortcut { display: flex !important; }
      </style>
      <div class="fade-in" style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%;">
        <div class="dash-header" style="border:none; margin-bottom: 24px; padding:0; flex-direction: column; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="/applogo.png" alt="Overlay Logo" class="dash-logo" />
            <div class="dash-title"><span class="brand">Overlay</span></div>
          </div>
        </div>
        
        <div style="width: 100%; max-width: 580px; margin-top: 16px;">
          <div class="section-title">Focus Activity Heatmap</div>
          <div class="heatmap-container">
            ${heatmapHTML}
          </div>

          <div class="section-title">Quick Shortcuts</div>
          <div class="shortcuts-grid" style="margin-bottom: 16px;">
            ${shortcutsHTML}
          </div>
          
          <div class="section-title">Add Shortcut</div>
          <div style="display:flex; gap:8px; margin-bottom: 24px;">
            <input type="text" id="new-sc-name" placeholder="Name" style="background:#111; border:1px solid rgba(255,255,255,0.1); padding:8px 12px; color:#fff; border-radius:6px; flex:1; font-family: inherit;">
            <input type="text" id="new-sc-target" placeholder="Target (.exe path or URL)" style="background:#111; border:1px solid rgba(255,255,255,0.1); padding:8px 12px; color:#fff; border-radius:6px; flex:2; font-family: inherit;">
            <button id="btn-add-sc" class="btn-primary" style="padding: 0 16px; border-radius:6px; font-weight:600;">Add</button>
          </div>
          
          <div style="display: flex; justify-content: center; margin-top: 32px;">
            <button class="btn-primary" id="btn-save" style="padding: 10px 24px; font-size: 15px;">Continue to Overlay</button>
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
        iconUrl = `https://www.google.com/s2/favicons?sz=64&domain_url=${url.hostname}`;
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

