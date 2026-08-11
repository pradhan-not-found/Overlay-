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
  { name: 'About', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>' }
];

let activeTab = 'Dashboard';
let currentConfig: any = {};
let appVersion = '1.0.0';
let updateState: {
  event: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  percent?: number;
  message?: string;
} = { event: 'idle' };

// Fetch app version from main process once
if (ipc) {
  ipc.invoke('get-app-version').then((v: string) => { appVersion = v; }).catch(() => {});

  // Listen for update events from the main process
  ipc.on('update-status', (_: any, status: any) => {
    updateState = status;
    // Re-render About pane inline without full re-render
    const aboutPane = document.querySelector('[data-pane="About"]') as HTMLElement;
    if (aboutPane && activeTab === 'About') {
      renderAboutContent(aboutPane);
    }
    // Show a notification badge on the About nav item
    const badge = document.getElementById('nav-update-badge');
    if (badge) {
      badge.style.display = (status.event === 'available' || status.event === 'downloaded') ? 'flex' : 'none';
    }
  });
}

function renderAboutContent(container: HTMLElement) {
  const isChecking    = updateState.event === 'checking';
  const isAvailable   = updateState.event === 'available';
  const isDownloading = updateState.event === 'downloading';
  const isDownloaded  = updateState.event === 'downloaded';
  const isUpToDate    = updateState.event === 'not-available';
  const isError       = updateState.event === 'error';

  const statusBadge = (() => {
    if (isChecking)    return `<span class="update-badge checking">Checking…</span>`;
    if (isAvailable)   return `<span class="update-badge available">v${updateState.version} available</span>`;
    if (isDownloading) return `<span class="update-badge downloading">Downloading ${updateState.percent ?? 0}%</span>`;
    if (isDownloaded)  return `<span class="update-badge downloaded">Ready to install</span>`;
    if (isUpToDate)    return `<span class="update-badge up-to-date">Up to date</span>`;
    if (isError)       return `<span class="update-badge error">Update error</span>`;
    return '';
  })();

  const progressBar = isDownloading ? `
    <div class="update-progress-track">
      <div class="update-progress-fill" style="width: ${updateState.percent ?? 0}%"></div>
    </div>
  ` : '';

  const actionBtn = (() => {
    if (isDownloaded) return `<button id="btn-install-update" class="update-btn primary">Restart &amp; Install Update</button>`;
    if (isChecking || isDownloading) return `<button class="update-btn" disabled style="opacity:0.5; cursor:not-allowed;">Checking…</button>`;
    return `<button id="btn-check-updates" class="update-btn">Check for Updates</button>`;
  })();

  container.innerHTML = `
    <div class="group">
      <div class="about-hero">
        <img src="/applogo.png" class="about-logo" />
        <div class="about-title-block">
          <h2 class="about-name"><span class="brand">Overlay</span></h2>
          <div class="about-version">Version ${appVersion}</div>
        </div>
      </div>

      <div class="update-card">
        <div class="update-card-header">
          <div class="update-card-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            Software Update
          </div>
          ${statusBadge}
        </div>
        ${progressBar}
        <div class="update-card-status">
          ${isDownloaded
            ? `<p>Overlay <strong>v${updateState.version}</strong> has been downloaded and is ready to install. Restart to apply the update.</p>`
            : isAvailable
            ? `<p>Overlay <strong>v${updateState.version}</strong> is being downloaded in the background. You'll be notified when it's ready.</p>`
            : isError
            ? `<p style="color: var(--accent-red, #ff453a);">Could not check for updates. Check your internet connection.</p>`
            : isUpToDate
            ? `<p>You're running the latest version of Overlay.</p>`
            : `<p>Click below to check if a new version is available.</p>`
          }
        </div>
        <div class="update-card-footer">
          ${actionBtn}
        </div>
      </div>

      <div class="about-links">
        <a href="#" id="link-github" class="about-link">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
          GitHub
        </a>
        <a href="#" id="link-changelog" class="about-link">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          Changelog
        </a>
      </div>
    </div>
  `;

  // Bind buttons
  document.getElementById('btn-check-updates')?.addEventListener('click', () => {
    if (ipc) ipc.send('check-for-updates');
    updateState = { event: 'checking' };
    renderAboutContent(container);
  });
  document.getElementById('btn-install-update')?.addEventListener('click', () => {
    if (ipc) ipc.send('install-update');
  });
  document.getElementById('link-github')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (ipc) ipc.send('open-external', 'https://github.com/pradhan-not-found/Overlay-');
  });
  document.getElementById('link-changelog')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (ipc) ipc.send('open-external', 'https://github.com/pradhan-not-found/Overlay-/releases');
  });
}

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

  let customShortcuts = currentConfig.shortcuts || [];



  root.innerHTML = `
    <div class="sidebar">
      <div class="sidebar-header">
        <img src="/applogo.png" alt="Overlay" class="sidebar-logo">
        <span class="sidebar-title" style="font-weight: 600;">Overlay</span>
      </div>
      ${TABS.map(t => `
        <div class="nav-item ${t.name === activeTab ? 'active' : ''}" data-tab="${t.name}" style="position:relative;">
          ${t.icon}
          ${t.name}
          ${t.name === 'About' ? `<span id="nav-update-badge" style="display:none; position:absolute; top:6px; right:8px; width:7px; height:7px; border-radius:50%; background:#ff9f0a; box-shadow:0 0 6px rgba(255,159,10,0.6);"></span>` : ''}
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
          <div class="group">
            <h2>Dashboard Custom Shortcuts</h2>
            <div class="card">
              ${customShortcuts.map((s: any, idx: number) => {
                const effectiveIconUrl = s.iconUrl;
                const fallbackIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12h8M12 8v8"/></svg>`;
                // For URL shortcuts, build a fallback to direct favicon.ico
                let directFavicon = '';
                try { if (s.target?.startsWith('http')) { const u = new URL(s.target); directFavicon = `${u.origin}/favicon.ico`; } } catch {}
                const iconHtml = effectiveIconUrl
                  ? `<img src="${effectiveIconUrl}" style="width:16px; height:16px; object-fit:contain; border-radius:2px;" onerror="this.onerror=null; ${directFavicon ? `this.src='${directFavicon}'` : `this.style.display='none'`};" />`
                  : fallbackIcon;
                return `
                <div class="row">
                  <span class="row-label" style="display:flex; align-items:center; gap:12px;">
                    ${iconHtml}
                    <span>${s.name} <span style="opacity:0.5; font-size: 11px; margin-left: 6px;">(${s.target})</span></span>
                  </span>
                  <button class="btn-del-shortcut" data-idx="${idx}" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                </div>
              `}).join('')}
            </div>
            <div class="card" style="margin-top: 16px; padding: 16px; display: flex; flex-direction: column; gap: 12px; background: rgba(255,255,255,0.02);">
              <div style="font-size: 13px; font-weight: 600;">Add New Shortcut</div>
              <input type="text" id="new-sc-name" placeholder="Name (e.g. Chrome)" style="background: #111; border: 1px solid var(--border); padding: 8px 12px; color: #fff; border-radius: 4px; outline: none; font-family: inherit; font-size: 13px;">
              <input type="text" id="new-sc-target" placeholder="Target (Path or URL)" style="background: #111; border: 1px solid var(--border); padding: 8px 12px; color: #fff; border-radius: 4px; outline: none; font-family: inherit; font-size: 13px;">
              <button id="btn-add-sc" style="background: var(--text-main); color: #000; border: none; padding: 8px 16px; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 13px; align-self: flex-start; transition: opacity 0.2s;">Add Shortcut</button>
            </div>
          </div>
        </div>

        <!-- About Pane -->
        <div class="pane-section ${activeTab === 'About' ? 'active' : ''}" data-pane="About">
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

  // Populate About pane (it's empty on render, filled dynamically)
  const aboutPane = root.querySelector('[data-pane="About"]') as HTMLElement;
  if (aboutPane) renderAboutContent(aboutPane);

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

  // Extension toggles — save to DB and update notch live
  document.querySelectorAll('.ext-toggle').forEach(el => {
    el.addEventListener('click', () => {
      const extId = el.getAttribute('data-ext-id');
      if (!extId || !ipc) return;
      const isOn = el.classList.contains('on');
      if (!currentConfig.extensions) currentConfig.extensions = {};
      currentConfig.extensions[extId] = { enabled: !isOn };
      ipc.send('save-config', currentConfig);
      el.classList.toggle('on');
      // Update the ACTIVE badge inline without re-rendering
      const badge = (el as HTMLElement).closest('.card')?.querySelector('span[style*="font-size: 10px"]') as HTMLElement | null;
      if (badge) {
        badge.style.display = !isOn ? '' : 'none';
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

  document.querySelectorAll('.btn-del-shortcut').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.getAttribute('data-idx') || '0', 10);
      const newShortcuts = [...customShortcuts];
      newShortcuts.splice(idx, 1);
      currentConfig.shortcuts = newShortcuts;
      if (ipc) {
        ipc.send('save-shortcuts', newShortcuts);
        ipc.send('dashboard-complete', currentConfig);
      }
      render();
    });
  });

  const btnAddSc = document.getElementById('btn-add-sc');
  if (btnAddSc) {
    btnAddSc.addEventListener('click', async () => {
      const nameInput = document.getElementById('new-sc-name') as HTMLInputElement;
      const targetInput = document.getElementById('new-sc-target') as HTMLInputElement;
      const name = nameInput.value.trim();
      const target = targetInput.value.trim();
      if (!name || !target) return;
      
      let iconUrl = '';
      if (target.startsWith('http')) {
        try {
          const url = new URL(target);
          const hostname = url.hostname;
          // Use Google's high-res favicon API (domain= is more reliable than domain_url=)
          // Also try the direct /favicon.ico as a fallback loaded in the img tag
          iconUrl = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${hostname}&size=128`;
        } catch {}
      } else if (ipc) {
        iconUrl = await ipc.invoke('get-file-icon', target) || '';
      }

      const newShortcuts = [...customShortcuts, {
        name,
        target,
        iconUrl,
        icon: '<circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon>'
      }];
      
      currentConfig.shortcuts = newShortcuts;
      if (ipc) {
        ipc.send('save-shortcuts', newShortcuts);
        ipc.send('save-config', currentConfig);
      }
      render();
    });
  }

}

// Deep-link support: open to a specific tab via URL hash (#tab=Shortcuts)
(window as any).__navigateToTab = (tab: string) => {
  const valid = TABS.find(t => t.name === tab);
  if (valid) {
    activeTab = valid.name;
    render();
  }
};

// Check URL hash on load
const hashTab = new URLSearchParams(location.hash.replace('#', '')).get('tab');
if (hashTab) {
  const validTab = TABS.find(t => t.name === hashTab);
  if (validTab) activeTab = validTab.name;
}

render();
