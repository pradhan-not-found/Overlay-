import './dashboard.css';

// IPC
let ipc: any = null;
try {
  if ((window as any).require) ipc = (window as any).require('electron').ipcRenderer;
} catch {}

const root = document.getElementById('dash-root')!;

async function render() {
  let stats: any = {};
  if (ipc) {
    try { stats = await ipc.invoke('get-stats'); } catch(e) {}
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
    { name: 'Google Chrome', target: 'chrome.exe', icon: '<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle><line x1="21.17" y1="8" x2="12" y2="8"></line><line x1="3.95" y1="6.06" x2="8.54" y2="14"></line><line x1="10.88" y1="21.94" x2="15.46" y2="14"></line>' },
    { name: 'Spotify', target: 'spotify.exe', icon: '<path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.6 14.45c-.2.3-.55.4-.85.2-2.35-1.45-5.3-1.75-8.8-.95-.35.1-.65-.15-.75-.5-.1-.35.15-.65.5-.75 3.8-.85 7.1-.5 9.7 1.15.3.15.4.55.2 1zM18 13.5c-.25.35-.7.5-1.05.25-2.7-1.65-6.8-2.15-9.95-1.15-.4.1-.8-.1-.9-.5-.1-.4.1-.8.5-.9 3.6-1.1 8.2-.5 11.2 1.35.3.15.45.6.2.95zm.1-2.85C14.5 8.1 8.2 7.9 5.2 8.8c-.5.15-1-.15-1.15-.65-.15-.5.15-1 .65-1.15 3.55-1 10.4-.75 13.7 1.25.4.25.6.8.35 1.25-.25.4-.8.55-1.25.3z"/>' },
    { name: 'GitHub', target: 'https://github.com', icon: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>' },
    { name: 'VS Code', target: 'code', icon: '<polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line>' }
  ];

  let shortcutsHTML = '';
  for (const s of defaultShortcuts) {
    shortcutsHTML += `
      <div class="shortcut-card" data-target="${s.target}">
        <div class="shortcut-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${s.icon}</svg>
        </div>
        <div class="shortcut-name">${s.name}</div>
      </div>
    `;
  }

  root.innerHTML = `
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
        <div class="shortcuts-grid">
          ${shortcutsHTML}
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

  document.getElementById('btn-save')!.addEventListener('click', () => {
    const config = { setupComplete: true };
    if (ipc) ipc.send('dashboard-complete', config);
  });
}

render();

