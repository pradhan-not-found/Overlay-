'use strict';
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

const { app, BrowserWindow, ipcMain, shell, screen, nativeImage, Notification, Tray, Menu } = require('electron');
const path   = require('path');
const fs     = require('fs');
const si     = require('systeminformation');
const { exec, execSync } = require('child_process');
const db     = require('./db.cjs');
const count  = require('./count/index.cjs');
const lyrics = require('./lyrics.cjs');
const tools  = require('./tools.cjs');
const links  = require('./links.cjs');
const term   = require('./term.cjs');
const desk   = require('./desk.cjs');
const discord = require('./discord.cjs');
const kit    = require('./kit.cjs');

// ─── Auto Updater ─────────────────────────────────────────────────────────────
let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
  autoUpdater.autoDownload = true;         // Download automatically in background
  autoUpdater.autoInstallOnAppQuit = true;  // Install on next quit
  autoUpdater.allowDowngrade = false;
  autoUpdater.channel = 'latest';           // Use 'latest' release channel

  // The source repo is private, and GitHub never serves a private repo's release
  // files to the public. Installers are published to a separate public repo,
  // overlay-releases, which both the updater and the website download from.
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'pradhan-not-found',
    repo: 'overlay-releases',
    releaseType: 'release',
    private: false
  });

  if (!app.isPackaged) {
    // In dev mode, don't auto-check — just simulate
    autoUpdater.forceDevUpdateConfig = true;
  }
} catch(e) {
  console.warn('[Updater] electron-updater not available:', e.message);
}

function sendUpdateStatus(event, data) {
  [mainWindow, settingsWindow, dashWindow].forEach(win => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('update-status', { event, ...data });
    }
  });
}

function initAutoUpdater() {
  if (!autoUpdater) return;
  
  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for update…');
    sendUpdateStatus('checking', {});
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] Update available:', info.version);
    sendUpdateStatus('available', { version: info.version, releaseNotes: info.releaseNotes || '' });
    
    // Fire a native OS notification
    if (Notification.isSupported()) {
      const notif = new Notification({
        title: `Overlay ${info.version} is available`,
        body: 'Downloading update in the background…',
        icon: path.join(__dirname, '../build/icon.png')
      });
      notif.on('click', () => {
        if (settingsWindow && !settingsWindow.isDestroyed()) {
          settingsWindow.show();
          settingsWindow.focus();
        } else {
          openSettings();
        }
      });
      notif.show();
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('[Updater] Up to date:', info.version);
    sendUpdateStatus('not-available', { version: info.version });
  });

  autoUpdater.on('download-progress', (progress) => {
    const pct = Math.round(progress.percent);
    sendUpdateStatus('downloading', { percent: pct, bytesPerSecond: progress.bytesPerSecond, transferred: progress.transferred, total: progress.total });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] Update downloaded:', info.version);
    sendUpdateStatus('downloaded', { version: info.version });
    
    // Notify user it's ready
    if (Notification.isSupported()) {
      const notif = new Notification({
        title: `Overlay ${info.version} ready to install`,
        body: 'Click to restart and apply the update.',
        icon: path.join(__dirname, '../build/icon.png')
      });
      notif.on('click', () => {
        autoUpdater.quitAndInstall(false, true);
      });
      notif.show();
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('[Updater] Error:', err.message);
    sendUpdateStatus('error', { message: err.message });
  });
}

// Suppress noisy GPU disk cache errors in terminal
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-software-rasterizer');

// ─── Globals ──────────────────────────────────────────────────────────────────
let mainWindow  = null;
let dashWindow  = null;
let dragInterval = null;
let dragStart   = { x: 0, y: 0 };
let dragBounds  = { x: 0, y: 0, w: 0, h: 0 };
let tray = null;

function createTray() {
  if (tray) return;
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'tray.png')).resize({ width: 16, height: 16 }));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Overlay', click: () => { if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.show(); mainWindow.focus(); } else { createPillWindow(); } } },
    { label: 'Dashboard', click: () => createDashWindow() },
    { label: 'Settings', click: () => openSettings() },
    { type: 'separator' },
    { label: 'Quit Overlay', click: () => { app.isQuitting = true; app.quit(); } }
  ]);
  tray.setToolTip('Overlay');
  tray.setContextMenu(contextMenu);
}

const configPath = () => path.join(app.getPath('userData'), 'overlay_config.json');
const statsPath = () => path.join(app.getPath('userData'), 'overlay_stats.json');

function readConfig() {
  try {
    if (fs.existsSync(configPath())) return JSON.parse(fs.readFileSync(configPath(), 'utf8'));
  } catch {}
  return {};
}
function writeConfig(data) {
  try { fs.writeFileSync(configPath(), JSON.stringify(data, null, 2)); } catch {}
}

function readStats() {
  try {
    if (fs.existsSync(statsPath())) return JSON.parse(fs.readFileSync(statsPath(), 'utf8'));
  } catch {}
  return {};
}
function writeStats(data) {
  try { fs.writeFileSync(statsPath(), JSON.stringify(data, null, 2)); } catch {}
}

// ─── Native Media Key Helper ──────────────────────────────────────────────────
const loudness = require('loudness');
const MEDIA_KEYS_EXE = path.join(app.getPath('userData'), 'mk.exe');
if (!fs.existsSync(MEDIA_KEYS_EXE)) {
  const cs = path.join(app.getPath('userData'), 'mk.cs');
  fs.writeFileSync(cs, `using System;using System.Runtime.InteropServices;class MK{[DllImport("user32.dll")]public static extern void keybd_event(byte b,byte s,uint f,UIntPtr e);static void Main(string[] a){byte v=byte.Parse(a[0]);keybd_event(v,0,0,UIntPtr.Zero);keybd_event(v,0,2,UIntPtr.Zero);}}`);
  try {
    execSync(`"C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe" /nologo /out:"${MEDIA_KEYS_EXE}" "${cs}"`);
  } catch (e) {
    console.error('Failed to compile mk.exe', e);
  }
}

function pressMediaKey(vk) {
  if (fs.existsSync(MEDIA_KEYS_EXE)) exec(`"${MEDIA_KEYS_EXE}" ${vk}`);
}

const PS_SPOTIFY = `Get-Process -Name Spotify -ErrorAction SilentlyContinue | Select-Object -ExpandProperty MainWindowTitle | Select-Object -First 1`;

// ─── Media polling (Streaming) ────────────────────────────────────────────────
let lastMediaInfo = null;

function startMediaPolling() {
  const wms = require('windows-media-sessions');
  
  const updateMedia = (sessions) => {
    let activeSession = sessions.find(s => s.playbackStatus === 'playing') || sessions[0];
    
    if (activeSession) {
      const tl = activeSession.timeline || {};
      const info = {
        artist: activeSession.artist || '',
        title: activeSession.title || '',
        album: activeSession.albumTitle || '',
        isPlaying: activeSession.playbackStatus === 'playing',
        albumArt: activeSession.thumbnail || null,
        sourceApp: activeSession.sourceAppDisplayName || activeSession.sourceAppUserModelId || 'Unknown',
        positionMs: typeof tl.positionMs === 'number' ? tl.positionMs : null,
        durationMs: typeof tl.durationMs === 'number' ? tl.durationMs : null,
        receivedAt: Date.now(),
      };
      const trackChanged = !lastMediaInfo || lastMediaInfo.title !== info.title || lastMediaInfo.artist !== info.artist;
      lastMediaInfo = info;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('media-info', info);
      }
      if (trackChanged && info.title) {
        lyrics.getLyrics(info).then((res) => {
          if (!res || !mainWindow || mainWindow.isDestroyed()) return;
          if (!lastMediaInfo || lastMediaInfo.title !== info.title) return;
          mainWindow.webContents.send('media-lyrics', { title: info.title, ...res });
        });
      }
    } else {
      const info = { artist: '', title: '', isPlaying: false, albumArt: null, sourceApp: '' };
      lastMediaInfo = info;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('media-info', info);
      }
    }
  };

  wms.onSessionsChanged(updateMedia);
  
  // Fetch initial state
  try {
    updateMedia(wms.getActiveSessions());
  } catch(e) {}
}

// DB IPC Handlers
ipcMain.handle('get-events', () => {
  return db.getEvents();
});

ipcMain.on('add-event', (event, ev) => {
  try { db.addEvent(ev); } catch (err) { console.error('DB Add Event Error:', err); }
});

ipcMain.on('delete-event', (event, id) => {
  try { db.deleteEvent(id); } catch (err) { console.error('DB Delete Event Error:', err); }
});

ipcMain.handle('get-setting', (event, key, defaultValue) => {
  try { return db.getSetting(key, defaultValue); } catch (err) { return defaultValue; }
});

/** Tell every window except the sender that something changed, so the notch
 *  and the Dashboard always show the same data. */
function broadcastExcept(sender, channel, ...args) {
  for (const w of BrowserWindow.getAllWindows()) {
    if (w.isDestroyed() || w.webContents === sender) continue;
    w.webContents.send(channel, ...args);
  }
}

// One click on the Overlay mark: rescan AI usage, refresh limits, then tell
// every window (notch and Dashboard) to reload everything from the database.
let syncing = null;
ipcMain.handle('sync:all', async () => {
  if (!syncing) {
    syncing = (async () => {
      const started = Date.now();
      let ai = null;
      try { ai = await count.refreshAll(); } catch (e) { console.warn('[Sync] AI usage:', e.message); }
      for (const w of BrowserWindow.getAllWindows()) {
        if (!w.isDestroyed()) w.webContents.send('sync-all');
      }
      return { at: Date.now(), ms: Date.now() - started, sources: ai ? ai.sources.length : 0, today: ai ? ai.today : 0 };
    })().finally(() => { syncing = null; });
  }
  return syncing;
});

ipcMain.on('set-setting', (event, key, value) => {
  try { db.setSetting(key, value); } catch (err) { console.error('DB Set Setting Error:', err); }
  broadcastExcept(event.sender, 'setting-changed', key, String(value));
});

// Timer sync IPC handlers (Dashboard <-> Notch)
ipcMain.on('sync-timer', (event, state) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('sync-timer', state);
  }
});

ipcMain.on('toggle-dashboard-timer', () => {
  if (dashWindow && !dashWindow.isDestroyed()) {
    // Dashboard is open — let it handle the toggle and sync back
    dashWindow.webContents.send('toggle-dashboard-timer');
  } else {
    // Dashboard is closed — tell the notch to run its own local timer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('start-local-timer');
    }
  }
});

// Media key IPC handlers
ipcMain.on('media-play-pause', () => pressMediaKey(179));
ipcMain.on('media-next',       () => pressMediaKey(176));
ipcMain.on('media-prev',       () => pressMediaKey(177));

// ─── Volume ───────────────────────────────────────────────────────────────────
ipcMain.handle('get-volume', async () => {
  try {
    const vol = await loudness.getVolume();
    return vol / 100;
  } catch { return 0.5; }
});

ipcMain.on('set-volume', async (_e, level) => {
  try {
    await loudness.setVolume(Math.round(level * 100));
  } catch {}
});

ipcMain.on('toggle-mute', async () => {
  try {
    const muted = await loudness.getMuted();
    await loudness.setMuted(!muted);
  } catch {}
});

// ─── Pill window ──────────────────────────────────────────────────────────────
const PAD = 32;
let settingsWindow = null;

function openSettings(tab) {
  const hash = tab ? `#tab=${tab}` : '';
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    presentWindow(settingsWindow);
    if (tab) settingsWindow.webContents.executeJavaScript(`window.__navigateToTab && window.__navigateToTab('${String(tab).replace(/'/g, '')}')`);
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 700,
    height: 550,
    icon: nativeImage.createFromPath(path.join(__dirname, '../applogo.png')),
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#000000', symbolColor: '#ffffff' },
    show: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  settingsWindow.once('ready-to-show', () => presentWindow(settingsWindow));
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (app.isPackaged) {
    settingsWindow.loadFile(path.join(__dirname, '../dist/settings.html'), { hash: hash.slice(1) });
  } else {
    settingsWindow.loadURL((devUrl || 'http://localhost:5173') + '/settings.html' + hash);
  }
  settingsWindow.on('closed', () => { settingsWindow = null; });
}

ipcMain.on('open-settings', (_e, tab) => openSettings(tab));

function createPillWindow() {
  // Initialize Database
  try {
    db.initDB();
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }

  const primary = screen.getPrimaryDisplay();
  const { bounds } = primary;

  // One transparent, click-through window over the whole display. The notch
  // moves, expands and docks inside it with CSS, so nothing ever resizes and
  // the motion stays smooth. The page asks for the mouse only over the notch.
  mainWindow = new BrowserWindow({
    width:  bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    frame:       false,
    transparent: true,
    alwaysOnTop: true,
    resizable:   false,
    movable:     false,
    hasShadow:   false,
    skipTaskbar: true,
    icon: nativeImage.createFromPath(path.join(__dirname, '../applogo.png')),
    webPreferences: {
      nodeIntegration:  true,
      contextIsolation: false,
    },
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  mainWindow.on('blur', () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('window-blur'); });

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    mainWindow.loadURL(devUrl);
  }

  mainWindow.on('closed', () => { mainWindow = null; });
  // Dev only: OVERLAY_PREVIEW=cycle opens the notch and steps through its tools.
  if (process.env.OVERLAY_PREVIEW && !app.isPackaged) {
    mainWindow.webContents.once('did-finish-load', () => setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('preview', process.env.OVERLAY_PREVIEW);
    }, 2500));
  }
  
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (typeof level === 'object') {
      console.log(`[FRONTEND ${level.level}] ${level.message} (${level.sourceId}:${level.line})`);
    } else {
      console.log(`[FRONTEND ${level}] ${message} (${sourceId}:${line})`);
    }
  });
}

// ── Drag ──────────────────────────────────────────────────────────────────
ipcMain.on('set-interactive', (_e, on) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.setIgnoreMouseEvents(!on, { forward: true });
});

/** Settings and Lock In sit above the full-screen notch, or a click never reaches them. */
function presentWindow(win) {
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  win.setAlwaysOnTop(true, 'screen-saver');
  win.show();
  win.focus();
}

ipcMain.on('start-drag', (_e, origin) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  dragStart = origin;
  dragBounds = (() => { const b = mainWindow.getBounds(); return { x: b.x, y: b.y, w: b.width, h: b.height }; })();

  if (dragInterval) clearInterval(dragInterval);
  dragInterval = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) { clearInterval(dragInterval); return; }
    const cur = screen.getCursorScreenPoint();
    const primary = screen.getPrimaryDisplay().bounds;
    let nx = dragBounds.x + (cur.x - dragStart.x);
    let ny = dragBounds.y + (cur.y - dragStart.y);
    const docked = ny <= primary.y - PAD + 30;
    
    // Lock to screen edges (accounting for invisible PAD)
    const minX = primary.x - PAD;
    const maxX = primary.x + primary.width - dragBounds.w + PAD;
    const minY = primary.y - PAD;
    const maxY = primary.y + primary.height - dragBounds.h + PAD;

    if (nx < minX) nx = minX;
    if (nx > maxX) nx = maxX;
    if (ny < minY) ny = minY;
    if (ny > maxY) ny = maxY;

    if (docked) {
      ny = primary.y - PAD;
    }
    mainWindow.setBounds({ x: nx, y: ny, width: dragBounds.w, height: dragBounds.h });
    mainWindow.webContents.send('docked-state', docked);
  }, 16);
});

ipcMain.on('stop-drag', () => {
  if (dragInterval) { clearInterval(dragInterval); dragInterval = null; }
});

// ── Resize (expand / collapse) ────────────────────────────────────────────
ipcMain.on('resize-window', () => { /* the notch sizes itself with CSS */ });

// ── Count sidebar: the notch unfolds into a full-height panel on the right ──
ipcMain.on('count-sidebar', (_e, open) => {
  if (open && mainWindow && !mainWindow.isDestroyed()) mainWindow.focus();
});

ipcMain.on('toggle-calendar-mode', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const primary = screen.getPrimaryDisplay().bounds;
  const winW = 420 + PAD * 2;
  const winH = primary.height + PAD; // Full height
  const newX = primary.x + primary.width - winW + PAD; 
  const newY = primary.y - PAD;
  mainWindow.setBounds({ x: newX, y: newY, width: winW, height: winH }, true);
});

// ── Battery ───────────────────────────────────────────────────────────────
const pollBattery = async () => {
  try {
    const b = await si.battery();
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('battery-status', b);
  } catch {}
};
pollBattery();
setInterval(pollBattery, 15000);

// ── Media polling (Streaming) ───────────────────────────────────────────────
startMediaPolling();

// ─── Misc IPC ──────────────────────────────────────────────────────────────
ipcMain.on('open-external', (_e, url) => shell.openExternal(url));
ipcMain.on('open-dashboard', (_e, options) => createDashWindow(options));
ipcMain.handle('get-config', () => {
  const cfg = readConfig();
  const shortcuts = db.getShortcuts();
  if (shortcuts && shortcuts.length > 0) cfg.shortcuts = shortcuts;
  return cfg;
});

// ─── Database & Stats ──────────────────────────────────────────────────────
ipcMain.on('save-session', (_e, { count, totalSecs }) => {
  const d = new Date();
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  db.updateStats(key, count, totalSecs);
});

ipcMain.on('add-stats', (event, { count, totalSecs }) => {
  setImmediate(() => broadcastExcept(null, 'stats-changed'));
  const d = new Date();
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  db.addStats(key, count, totalSecs);
});

ipcMain.handle('get-stats', () => {
  return db.getStats();
});

// ─── Lap IPC ──────────────────────────────────────────────────────────────────
ipcMain.on('add-lap', (_e, lap) => {
  try { db.addLap(lap); } catch (err) { console.error('DB Add Lap Error:', err); }
});

ipcMain.handle('get-laps', (_e, date) => {
  try { return db.getLaps(date); } catch { return []; }
});

ipcMain.on('clear-laps', (_e, date) => {
  try { db.clearLaps(date); } catch (err) { console.error('DB Clear Laps Error:', err); }
});

// Launch Windows Snipping Tool via URI
ipcMain.on('take-screenshot', () => {
  exec('explorer ms-screenclip:');
});

ipcMain.on('save-shortcuts', (_e, shortcuts) => {
  db.clearShortcuts();
  (shortcuts || []).forEach(s => db.addShortcut(s));
  const saved = db.getShortcuts();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('widget-config', { shortcuts: saved });
  }
});

ipcMain.on('open-shortcut', (_e, target) => {
  if (!target) return;
  const value = String(target);
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    shell.openExternal(value).catch((err) => console.error('Failed to open shortcut:', err));
    return;
  }
  const looksLikePath = /[\\/]/.test(value) || /\.[a-z0-9]{1,8}$/i.test(value);
  if (looksLikePath) {
    shell.openPath(value).then((err) => {
      if (err) console.error('Failed to open shortcut:', err);
    });
    return;
  }
  exec(`start "" "${value.replace(/"/g, '')}"`, (err) => {
    if (err) console.error('Failed to open shortcut:', err);
  });
});

ipcMain.handle('get-file-icon', async (_e, path) => {
  try {
    const icon = await app.getFileIcon(path, { size: 'normal' });
    return icon.toDataURL();
  } catch (err) {
    console.error('Failed to get file icon for', path, err);
    return null;
  }
});

// ─── Dashboard window ─────────────────────────────────────────────────────────
function createDashWindow(options) {
  const nav = options && typeof options.nav === 'string' ? options.nav.replace(/[^a-z]/g, '') : '';
  if (nav) { try { db.setSetting('dashboard-nav', nav); } catch {} }
  if (nav && dashWindow && !dashWindow.isDestroyed()) {
    dashWindow.webContents.executeJavaScript(`document.querySelector('.nav-item[data-nav="${nav}"]')?.click()`).catch(() => {});
  }
  if (dashWindow && !dashWindow.isDestroyed()) { 
    if (options && options.expand) dashWindow.webContents.executeJavaScript('window.location.search = "?expand=true";');
    presentWindow(dashWindow);
    return; 
  }
  dashWindow = new BrowserWindow({
    width: 720, height: 560,
    frame: true,
    transparent: false,
    backgroundColor: '#111111',
    resizable: true,
    maximizable: true,
    fullscreenable: true,
    center: true,
    minWidth: 640,
    minHeight: 480,
    title: 'Overlay — Focus',
    autoHideMenuBar: true,
    show: false,
    icon: nativeImage.createFromPath(path.join(__dirname, '../applogo.png')),
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  const dashUrl = app.isPackaged
    ? path.join(__dirname, '../dist/dashboard.html')
    : devUrl + '/dashboard.html';

  dashWindow.once('ready-to-show', () => presentWindow(dashWindow));
  console.log('[Dashboard] Loading:', dashUrl);

  if (app.isPackaged) {
    dashWindow.loadFile(dashUrl);
  } else {
    dashWindow.loadURL(dashUrl).catch(err => {
      console.error('[Dashboard] Failed to load URL:', err.message);
    });
  }

  dashWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error(`[Dashboard] Page failed to load: ${code} ${desc} at ${url}`);
    // Retry once after 1s if vite server wasn't ready
    setTimeout(() => {
      if (dashWindow && !dashWindow.isDestroyed()) {
        dashWindow.loadURL(devUrl + '/dashboard.html').catch(() => {});
      }
    }, 1000);
  });

  dashWindow.on('closed', () => { dashWindow = null; });
}

// ─── Misc IPC ──────────────────────────────────────────────────────────────
ipcMain.on('dashboard-complete', (_e, cfg) => {
  if (cfg.shortcuts) {
    db.clearShortcuts();
    cfg.shortcuts.forEach(s => db.addShortcut(s));
    delete cfg.shortcuts;
  }
  writeConfig({ ...readConfig(), ...cfg, setupComplete: true });
  if (dashWindow && !dashWindow.isDestroyed()) dashWindow.close();
  const finalCfg = readConfig();
  finalCfg.shortcuts = db.getShortcuts();
  
  if (!mainWindow || mainWindow.isDestroyed()) {
    createPillWindow();
    mainWindow.webContents.once('did-finish-load', () => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('widget-config', finalCfg);
    });
  } else {
    mainWindow.show();
    mainWindow.webContents.send('widget-config', finalCfg);
  }
});

ipcMain.on('save-config', (_e, cfg) => {
  if (cfg.shortcuts) {
    db.clearShortcuts();
    cfg.shortcuts.forEach(s => db.addShortcut(s));
    delete cfg.shortcuts;
  }
  const finalCfg = { ...readConfig(), ...cfg };
  writeConfig(finalCfg);
  finalCfg.shortcuts = db.getShortcuts();
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('widget-config', finalCfg);
});

// ─── App identity ─────────────────────────────────────────────────────────────
// Windows names a notification after the Start menu shortcut that carries the
// app's ID. The installer makes one; when running from source we make our own,
// so notifications say "Overlay" with the Overlay icon instead of "Electron".
const APP_ID = 'com.pradhan.overlay';
app.setName('Overlay');

function registerDevIdentity() {
  if (process.platform !== 'win32' || app.isPackaged) return;
  try {
    const link = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Overlay.lnk');
    const icon = path.join(__dirname, '../build/icon.ico');
    const options = {
      target: process.execPath,
      args: `"${path.join(__dirname, '..')}"`,
      cwd: path.join(__dirname, '..'),
      description: 'Overlay',
      icon,
      iconIndex: 0,
      appUserModelId: APP_ID,
    };
    shell.writeShortcutLink(link, fs.existsSync(link) ? 'replace' : 'create', options);
  } catch (e) {
    console.warn('[Overlay] Could not register the notification identity:', e.message);
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    } else {
      createPillWindow();
    }
  });

  app.whenReady().then(() => {
    app.setAppUserModelId(APP_ID);
    registerDevIdentity();
    try { db.initDB(); } catch (err) { console.error('Failed to initialize database:', err); }
    createTray();
    count.init();
    tools.init();
    links.init();
    term.init();
    desk.init();
    discord.init();
    kit.init();
    app.once('before-quit', () => discord.stop());
    const cfg = readConfig();
    
    if (!cfg.setupComplete) {
      setTimeout(() => createDashWindow(), 800);
    } else {
      createPillWindow();
      mainWindow.webContents.once('did-finish-load', () => {
        cfg.shortcuts = db.getShortcuts();
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('widget-config', cfg);
      });
    }

    // Dev only: OVERLAY_DASH=ai opens the Dashboard on that page.
    if (process.env.OVERLAY_DASH && !app.isPackaged) {
      setTimeout(() => {
        createDashWindow();
        dashWindow?.webContents.once('did-finish-load', () => setTimeout(() => {
          dashWindow?.webContents.executeJavaScript(`document.querySelector('.nav-item[data-nav="${String(process.env.OVERLAY_DASH).replace(/[^a-z]/g, '')}"]')?.click()`);
        }, 4000));
      }, 1500);
    }

    // ── Auto-update: wire up events then check after 10 s (let app load first) ──
    initAutoUpdater();
    if (app.isPackaged && autoUpdater) {
      setTimeout(() => {
        autoUpdater.checkForUpdates().catch(e => console.warn('[Updater] check failed:', e.message));
      }, 10_000);
    }

    app.on('activate', () => {
      if (!mainWindow || mainWindow.isDestroyed()) createPillWindow();
      else mainWindow.show();
    });
  });

  app.on('window-all-closed', () => {
    // Let the app run in the system tray in the background
  });

  ipcMain.on('hide-overlay', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.hide();
    }
  });
}

// ─── Update IPC handlers ───────────────────────────────────────────────────────
ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.on('check-for-updates', () => {
  if (!autoUpdater) return;
  if (app.isPackaged) {
    autoUpdater.checkForUpdates().catch(e => {
      sendUpdateStatus('error', { message: e.message });
    });
  } else {
    // In dev, simulate the response
    sendUpdateStatus('not-available', { version: app.getVersion() });
  }
});

ipcMain.on('install-update', () => {
  if (autoUpdater) autoUpdater.quitAndInstall(false, true);
});

