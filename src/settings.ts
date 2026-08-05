import './settings.css';

// IPC
let ipc: any = null;
try {
  if ((window as any).require) ipc = (window as any).require('electron').ipcRenderer;
} catch {}

const TABS = [
  { name: 'Dashboard', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>' },
  { name: 'General', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>' },
  { name: 'Appearance', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>' },
  { name: 'Media', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>' },
  { name: 'Calendar', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>' },
  { name: 'Battery', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="6" width="18" height="12" rx="2" ry="2"></rect><line x1="23" y1="13" x2="23" y2="11"></line></svg>' },
  { name: 'Shelf', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>' },
  { name: 'Shortcuts', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"></path></svg>' },
  { name: 'Extensions', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>' },
  { name: 'About', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>' }
];

let activeTab = 'Dashboard';
let currentConfig: any = {};

const root = document.getElementById('settings-root')!;

async function render() {
  let count = 0, secs = 0;
  let stats: any = {};
  let graphHtml = '';

  if (ipc) {
    try {
      currentConfig = await ipc.invoke('get-config') || {};
      stats = await ipc.invoke('get-stats') || {};
    } catch {}
  }

  // Generate Dashboard Stats & Graph
  if (activeTab === 'Dashboard') {
    const d = new Date();
    const todayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    if (stats && stats[todayKey]) {
      count = stats[todayKey].count || 0;
      secs = stats[todayKey].totalSecs || 0;
    }

    const last7Days = [];
    let maxSecs = 1;
    for (let i = 6; i >= 0; i--) {
      const dTemp = new Date();
      dTemp.setDate(dTemp.getDate() - i);
      const k = `${dTemp.getFullYear()}-${String(dTemp.getMonth() + 1).padStart(2, '0')}-${String(dTemp.getDate()).padStart(2, '0')}`;
      const s = stats[k]?.totalSecs || 0;
      const label = dTemp.toLocaleDateString('en-US', { weekday: 'short' });
      if (s > maxSecs) maxSecs = s;
      last7Days.push({ label, secs: s });
    }

    last7Days.forEach(day => {
      const pct = Math.max(2, Math.floor((day.secs / maxSecs) * 100));
      const isToday = day.label === d.toLocaleDateString('en-US', { weekday: 'short' });
      graphHtml += `
        <div class="bar-col">
          <div class="bar-track">
            <div class="bar-fill ${isToday ? 'today' : ''}" style="height: ${pct}%;">
              <div class="bar-tooltip">${Math.floor(day.secs / 60)}m</div>
            </div>
          </div>
          <div class="bar-label">${day.label}</div>
        </div>
      `;
    });
  }

  const m = Math.floor(secs / 60);
  const h = Math.floor(m / 60);
  const timeString = h > 0 ? `${h}h ${m%60}m` : `${m}m`;

  root.innerHTML = `
    <div class="sidebar">
      <div class="sidebar-header">
        <img src="/applogo.png" alt="Overlay" class="sidebar-logo">
        <span class="sidebar-title" style="font-weight: 600;">Overlay</span>
      </div>
      ${TABS.map(t => `
        <div class="nav-item ${t.name === activeTab ? 'active' : ''}" data-tab="${t.name}">
          ${t.icon}
          ${t.name}
        </div>
      `).join('')}
    </div>
    <div class="content">
      <div class="header">
        <h1 id="header-title">${activeTab}</h1>
      </div>
      <div class="pane">

        <!-- Dashboard Pane -->
        <div class="pane-section ${activeTab === 'Dashboard' ? 'active' : ''}">
          <div class="group">
            <h2>Your Focus Stats</h2>
            <div class="card" style="display: flex; gap: 24px; padding: 24px; margin-bottom: 24px;">
              <div style="flex:1;">
                <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 4px;">Sessions Today</div>
                <div style="font-size: 32px; font-weight: 600; color: var(--accent);" id="dash-sessions">${count}</div>
              </div>
              <div style="flex:1;">
                <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 4px;">Time Focused</div>
                <div style="font-size: 32px; font-weight: 600; color: var(--accent);" id="dash-time">${timeString}</div>
              </div>
            </div>

            <h2>Focus History (Last 7 Days)</h2>
            <div class="graph-card">
              <div class="graph-container">
                ${graphHtml}
              </div>
            </div>
          </div>
        </div>
        
        <!-- Appearance Pane -->
        <div class="pane-section ${activeTab === 'Appearance' ? 'active' : ''}">
          <div class="group">
            <h2>General</h2>
            <div class="card">
              <div class="row"><span class="row-label">Always show tabs</span><div class="switch on"></div></div>
              <div class="row"><span class="row-label">Settings icon in notch</span><div class="switch on"></div></div>
              <div class="row"><span class="row-label">Enable window shadow</span><div class="switch on" id="tog-shadow"></div></div>
              <div class="row"><span class="row-label">Corner radius scaling</span><div class="switch on"></div></div>
              <div class="row"><span class="row-label">Use simpler close animation</span><div class="switch on"></div></div>
            </div>
          </div>
          <div class="group">
            <h2>Media</h2>
            <div class="card">
              <div class="row"><span class="row-label">Enable colored spectrograms</span><div class="switch on"></div></div>
              <div class="row"><span class="row-label">Player tinting</span><div class="switch on"></div></div>
              <div class="row"><span class="row-label">Enable blur effect behind album art</span><div class="switch on"></div></div>
            </div>
          </div>
        </div>

        <!-- Media Pane -->
        <div class="pane-section ${activeTab === 'Media' ? 'active' : ''}">
          <div class="group">
            <h2>Media Source</h2>
            <div class="card" style="overflow: visible;">
              <div class="row" style="overflow: visible;">
                <span class="row-label">Music Source</span>
                <div class="custom-select" id="media-source">
                  <div class="select-trigger">
                    <div class="select-value" id="media-source-val">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                      Now Playing
                    </div>
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 8px; opacity: 0.5;"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                  <div class="select-dropdown">
                    <div class="select-option" data-value="now_playing">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                      Now Playing
                    </div>
                    <div class="select-option" data-value="spotify">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.24 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.84.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                      Spotify
                    </div>
                    <div class="select-option" data-value="apple_music">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M17.052 13.926c-.035-2.613 2.133-3.882 2.23-3.94-1.21-1.77-3.09-2.016-3.774-2.05-1.597-.162-3.118.939-3.927.939-.81 0-2.062-.916-3.376-.889-1.714.027-3.29.996-4.17 2.532-1.785 3.09-.457 7.666 1.28 10.17 .85 1.213 1.848 2.585 3.153 2.531 1.25-.054 1.737-.813 3.25-.813 1.503 0 1.96.813 3.277.787 1.341-.027 2.184-1.241 3.013-2.451 1.026-1.493 1.45-2.94 1.474-3.015-.032-.014-2.823-1.082-2.86-3.791zm-2.028-5.742c.691-.837 1.157-2.002 1.03-3.167-1.004.041-2.22.668-2.931 1.504-.567.653-1.127 1.841-.983 2.981 1.12.087 2.193-.48 2.884-1.318z"/></svg>
                      Apple Music
                    </div>
                    <div class="select-option" data-value="youtube">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                      YouTube
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="group">
            <h2>Media playback live activity</h2>
            <div class="card">
              <div class="row"><span class="row-label">Enable music live activity</span><div class="switch ${currentConfig.showMedia !== false ? 'on' : ''}" data-cfg="showMedia"></div></div>
              <div class="row"><span class="row-label">Enable sneak peek</span><div class="switch"></div></div>
            </div>
          </div>
        </div>

        <!-- Calendar Pane -->
        <div class="pane-section ${activeTab === 'Calendar' ? 'active' : ''}">
          <div class="group">
            <div class="card">
              <div class="row"><span class="row-label">Show calendar</span><div class="switch ${currentConfig.showCalendar !== false ? 'on' : ''}" data-cfg="showCalendar"></div></div>
              <div class="row"><span class="row-label">Hide completed reminders</span><div class="switch on"></div></div>
            </div>
          </div>
        </div>

        <!-- Battery Pane -->
        <div class="pane-section ${activeTab === 'Battery' ? 'active' : ''}">
          <div class="group">
            <h2>General</h2>
            <div class="card">
              <div class="row"><span class="row-label">Show battery indicator</span><div class="switch ${currentConfig.showBattery !== false ? 'on' : ''}" data-cfg="showBattery"></div></div>
              <div class="row"><span class="row-label">Show power status notifications</span><div class="switch"></div></div>
            </div>
          </div>
        </div>

        <!-- General Pane -->
        <div class="pane-section ${activeTab === 'General' ? 'active' : ''}">
          <div class="group">
            <h2>General Settings</h2>
            <div class="card">
              <div class="row"><span class="row-label">Show Pomodoro Timer</span><div class="switch ${currentConfig.showTimer !== false ? 'on' : ''}" data-cfg="showTimer"></div></div>
              <div class="row">
                <span class="row-label">Pomodoro Duration</span>
                <select class="select" id="pomo-duration">
                  <option value="15" ${currentConfig.pomodoroDuration === 15 ? 'selected' : ''}>15 minutes</option>
                  <option value="25" ${!currentConfig.pomodoroDuration || currentConfig.pomodoroDuration === 25 ? 'selected' : ''}>25 minutes</option>
                  <option value="45" ${currentConfig.pomodoroDuration === 45 ? 'selected' : ''}>45 minutes</option>
                  <option value="60" ${currentConfig.pomodoroDuration === 60 ? 'selected' : ''}>60 minutes</option>
                </select>
              </div>
              <div class="row"><span class="row-label">Launch on startup</span><div class="switch on"></div></div>
              <div class="row"><span class="row-label">Minimize to tray</span><div class="switch on"></div></div>
              <div class="row">
                <span class="row-label">Language</span>
                <select class="select">
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Shelf Pane -->
        <div class="pane-section ${activeTab === 'Shelf' ? 'active' : ''}">
          <div class="group">
            <h2>Shelf Settings</h2>
            <div class="card">
              <div class="row"><span class="row-label">Enable quick drop</span><div class="switch on"></div></div>
              <div class="row"><span class="row-label">Save shelf history</span><div class="switch"></div></div>
            </div>
          </div>
        </div>

        <!-- Shortcuts Pane -->
        <div class="pane-section ${activeTab === 'Shortcuts' ? 'active' : ''}">
          <div class="group">
            <h2>Global Shortcuts</h2>
            <div class="card">
              <div class="row"><span class="row-label">Toggle Overlay</span><span class="row-label" style="font-family:monospace; background:var(--border); padding:4px 8px; border-radius:4px;">Alt + Space</span></div>
              <div class="row"><span class="row-label">Lock In</span><span class="row-label" style="font-family:monospace; background:var(--border); padding:4px 8px; border-radius:4px;">Ctrl + Shift + F</span></div>
            </div>
          </div>
        </div>

        <!-- Extensions Pane -->
        <div class="pane-section ${activeTab === 'Extensions' ? 'active' : ''}">
          <div class="group">
            <h2>Installed Extensions</h2>
            <div class="card">
              <div class="row"><span class="row-label">GitHub Integration</span><div class="switch"></div></div>
              <div class="row"><span class="row-label">Discord Rich Presence</span><div class="switch on"></div></div>
            </div>
          </div>
        </div>

        <!-- About Pane -->
        <div class="pane-section ${activeTab === 'About' ? 'active' : ''}">
          <div class="group">
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 40px 0; gap: 16px;">
              <img src="/applogo.png" style="width: 80px; height: 80px; border-radius: 12px;"/>
              <h2 style="font-size: 20px; font-weight: 600; color: var(--text-main); margin-bottom: 0;"><span class="brand">Overlay</span></h2>
              <div style="color: var(--text-muted); font-size: 13px;">Version 1.0.0</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  // Bind tabs
  root.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => {
      activeTab = el.getAttribute('data-tab')!;
      render();
    });
  });

  // ── Attach Settings Interactions ──────────────────────────────────────────
  document.querySelectorAll('.switch[data-cfg]').forEach(el => {
    el.addEventListener('click', () => {
      const isOff = el.classList.contains('on');
      const cfgKey = el.getAttribute('data-cfg');
      if (cfgKey && ipc) {
        currentConfig[cfgKey] = !isOff;
        ipc.send('save-config', currentConfig);
        el.classList.toggle('on');
      }
    });
  });

  document.getElementById('pomo-duration')?.addEventListener('change', (e) => {
    if (ipc) {
      currentConfig.pomodoroDuration = parseInt((e.target as HTMLSelectElement).value, 10);
      ipc.send('save-config', currentConfig);
    }
  });

  // Bind Custom Select
  const sel = document.getElementById('media-source');
  if (sel) {
    const trigger = sel.querySelector('.select-trigger') as HTMLElement;
    const dropdown = sel.querySelector('.select-dropdown') as HTMLElement;
    const valDisplay = document.getElementById('media-source-val') as HTMLElement;
    const options = sel.querySelectorAll('.select-option');

    // Pre-select based on config
    const savedSrc = currentConfig.mediaSource || 'now_playing';
    options.forEach(opt => {
      if (opt.getAttribute('data-value') === savedSrc) {
        valDisplay.innerHTML = opt.innerHTML;
      }
    });

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });
    
    options.forEach(opt => {
      opt.addEventListener('click', () => {
        valDisplay.innerHTML = opt.innerHTML;
        dropdown.classList.remove('open');
        const val = opt.getAttribute('data-value');
        if (ipc) {
          currentConfig.mediaSource = val;
          ipc.send('dashboard-complete', currentConfig);
        }
      });
    });

    document.addEventListener('click', () => {
      dropdown.classList.remove('open');
    });
  }

}

render();
