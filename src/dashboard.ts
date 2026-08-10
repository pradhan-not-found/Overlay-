import './dashboard.css';

// IPC
let ipc: any = null;
try {
  if ((window as any).require) ipc = (window as any).require('electron').ipcRenderer;
} catch {}

const root = document.getElementById('dash-root')!;

async function render() {
  let stats: any = {};
  let cfg: any = {};
  if (ipc) {
    try { 
      stats = await ipc.invoke('get-stats');
      cfg = await ipc.invoke('get-config');
    } catch(e) {}
  }

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

  root.innerHTML = `
    <style>
      .shortcut-card:hover .btn-del-shortcut { display: flex !important; }
    </style>
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%;">
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
    }
  } catch(e) {}
}

render();
setInterval(updateHeatmapLive, 2000);

