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
const auth   = require('./auth.cjs');
const context = require('./context.cjs');

// ─── Auto Updater ─────────────────────────────────────────────────────────────
let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
  // Small fixes download by themselves; a feature release waits for a click on Download (see update-available).
  autoUpdater.autoDownload = false;
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

// Every notification carries Overlay's own icon, so Windows never shows Electron's.
const NOTE_ICON = () => nativeImage.createFromPath(path.join(__dirname, '../build/icon.png'));
function notify(title, body, onClick) {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title: String(title).slice(0, 120), body: String(body || '').slice(0, 240), icon: NOTE_ICON(), silent: false });
  if (onClick) n.on('click', onClick);
  n.show();
}
ipcMain.on('notify', (_e, p) => {
  if (!p || typeof p.title !== 'string') return;
  notify(p.title, p.body, () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show(); });
});

// No release published yet (404, or an empty feed) means there is nothing newer.
function reportUpdateError(e) {
  const msg = String(e && e.message || e);
  if (/404|no published versions|cannot find latest|unable to find latest|HttpError: 404/i.test(msg)) {
    sendUpdateStatus('not-available', { version: app.getVersion() });
  } else {
    sendUpdateStatus('error', { message: msg });
  }
}

// The last update state, so a window opened later still knows it.
let lastUpdate = { event: 'idle' };
let lastChecked = 0;
function sendUpdateStatus(event, data) {
  lastUpdate = { event, ...data, at: Date.now() };
  if (event === 'not-available' || event === 'available' || event === 'error') lastChecked = Date.now();
  [mainWindow, settingsWindow, dashWindow].forEach(win => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('update-status', { event, ...data });
    }
  });
}

let idleInstall = 0;
// major.minor changed = new features; only the last number changed = a fix
function isFeatureRelease(v) {
  const [a, b] = String(v || '').split('.').map(Number);
  const [c, d] = app.getVersion().split('.').map(Number);
  return a > c || (a === c && b > d);
}
let downloading = false;
function startDownload() {
  if (!autoUpdater || downloading || lastUpdate.event === 'downloaded') return;
  downloading = true;
  sendUpdateStatus('downloading', { percent: 0, version: lastUpdate.version, feature: lastUpdate.feature });
  autoUpdater.downloadUpdate().catch((e) => reportUpdateError(e)).finally(() => { downloading = false; });
}
ipcMain.on('download-update', () => startDownload());
function initAutoUpdater() {
  if (!autoUpdater) return;
  
  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for update…');
    sendUpdateStatus('checking', {});
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] Update available:', info.version);
    // A fix (same major.minor) downloads and installs quietly. A feature release (major or minor
    // changed) is offered with a Download button; the download then runs in the background.
    const feature = isFeatureRelease(info.version);
    sendUpdateStatus('available', { version: info.version, feature, releaseNotes: info.releaseNotes || '' });
    // every update downloads quietly; the notch says What's new after it installs
    startDownload();
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('[Updater] Up to date:', info.version);
    sendUpdateStatus('not-available', { version: info.version });
  });

  autoUpdater.on('download-progress', (progress) => {
    const pct = Math.round(progress.percent);
    sendUpdateStatus('downloading', { percent: pct, version: lastUpdate.version, feature: lastUpdate.feature, bytesPerSecond: progress.bytesPerSecond, transferred: progress.transferred, total: progress.total });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] Update downloaded:', info.version);
    const feature = isFeatureRelease(info.version);
    sendUpdateStatus('downloaded', { version: info.version, feature });
    // no notification: it installs by itself when you step away or quit
    // Install on its own once the PC has been idle for five minutes: silent, and Overlay opens again by itself.
    clearInterval(idleInstall);
    idleInstall = setInterval(() => {
      try { if (require('electron').powerMonitor.getSystemIdleTime() >= 300) { clearInterval(idleInstall); installUpdate(); } } catch {}
    }, 60_000);
  });

  autoUpdater.on('error', (err) => {
    console.error('[Updater] Error:', err.message);
    reportUpdateError(err);
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

// Lock In lives in the notch: it runs there whether or not the Dashboard is open.
ipcMain.on('toggle-dashboard-timer', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('start-local-timer');
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
// One app icon everywhere: the multi-size .ico on Windows keeps the taskbar crisp.
const APP_ICON = () => nativeImage.createFromPath(path.join(__dirname, process.platform === 'win32' ? '../build/icon.ico' : '../applogo.png'));
const PAD = 32;
let settingsWindow = null;

// Settings live in the one Dashboard now; old callers land on the right page.
const SETTINGS_NAV = { Shortcuts: 'shortcuts', General: 'general', Appearance: 'notch', Media: 'media', Calendar: 'notch', Battery: 'notch', Shelf: 'notch', About: 'about', Dashboard: 'stats' };
function openSettings(tab) {
  createDashWindow({ nav: SETTINGS_NAV[tab] || 'general' });
}

// Launch at startup, for real.
ipcMain.handle('login-item:get', () => app.getLoginItemSettings().openAtLogin);
ipcMain.handle('login-item:set', (_e, on) => {
  app.setLoginItemSettings({ openAtLogin: !!on });
  try { db.setSetting('startupChosen', on ? 'on' : 'off'); } catch {}
  return app.getLoginItemSettings().openAtLogin;
});

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
    icon: APP_ICON(),
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
setInterval(pollBattery, 5000);

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
    // A Start menu shortcut has its own generic icon; use the app it points at.
    let target = path;
    if (/\.lnk$/i.test(String(path))) {
      try {
        const link = shell.readShortcutLink(path);
        const iconFile = link.icon ? String(link.icon).replace(/,\s*-?\d+$/, '') : '';
        target = (iconFile && fs.existsSync(iconFile) && iconFile) || (link.target && fs.existsSync(link.target) && link.target) || path;
      } catch { /* not a readable shortcut */ }
    }
    const icon = await app.getFileIcon(target, { size: 'large' });
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
    width: 1040, height: 700,
    // No title bar: the window controls float over the Dashboard's own top edge.
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#0a0a0a', symbolColor: '#a1a1aa', height: 38 },
    transparent: false,
    backgroundColor: '#111111',
    resizable: true,
    maximizable: true,
    fullscreenable: true,
    center: true,
    minWidth: 860,
    minHeight: 560,
    title: 'Overlay',
    autoHideMenuBar: true,
    show: false,
    icon: APP_ICON(),
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
// A development run gets its own ID, so it can never take over the installed app's name and icon.
const APP_ID = app.isPackaged ? 'com.pradhan.overlay' : 'com.pradhan.overlay.dev';
app.setName('Overlay');

function registerToastName() {
  try {
    const key = `HKCU\\Software\\Classes\\AppUserModelId\\${APP_ID}`;
    const icon = path.join(app.getPath('userData'), 'toast-icon.png');
    try { fs.writeFileSync(icon, fs.readFileSync(path.join(__dirname, '../build/icon.png'))); } catch {}
    const { execFile } = require('child_process');
    execFile('reg', ['add', key, '/v', 'DisplayName', '/t', 'REG_SZ', '/d', 'Overlay', '/f'], () => {});
    if (fs.existsSync(icon)) execFile('reg', ['add', key, '/v', 'IconUri', '/t', 'REG_SZ', '/d', icon, '/f'], () => {});
  } catch {}
}
function registerDevIdentity() {
  if (process.platform !== 'win32') return;
  registerToastName();
  try {
    const programs = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs');
    const link = path.join(programs, app.isPackaged ? 'Overlay.lnk' : 'Overlay (dev).lnk');
    // Windows names toasts and taskbar buttons after a shortcut with this ID; an old one that points
    // somewhere else (a development copy of electron.exe) would show 'Electron', so it goes.
    if (app.isPackaged) {
      for (const name of fs.readdirSync(programs)) {
        if (!name.toLowerCase().endsWith('.lnk') || name === 'Overlay.lnk') continue;
        const full = path.join(programs, name);
        try {
          const l = shell.readShortcutLink(full);
          if (l.appUserModelId === APP_ID && path.resolve(l.target) !== path.resolve(process.execPath)) fs.unlinkSync(full);
        } catch {}
      }
    }
    // The installer makes this shortcut; a copy run straight from a folder makes its own.
    if (app.isPackaged && fs.existsSync(link)) return;
    const icon = app.isPackaged ? process.execPath : path.join(__dirname, '../build/icon.ico');
    const options = {
      target: process.execPath,
      args: app.isPackaged ? '' : `"${path.join(__dirname, '..')}"`,
      cwd: path.join(__dirname, '..'),
      description: app.isPackaged ? 'Overlay' : 'Overlay (dev)',
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
    auth.init();
    context.init();
    app.once('before-quit', () => context.stop());
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

    // ── What's new: the first launch on a new version says so in the notch ──
    try {
      const now = app.getVersion();
      const before = db.getSetting('lastVersion', '');
      db.setSetting('lastVersion', now);
      if (before && before !== now) {
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('whats-new', { version: now, from: before });
        }, 5000);
      }
    } catch {}

    // ── Auto-update: wire up events then check after 10 s (let app load first) ──
    initAutoUpdater();
    if (app.isPackaged && autoUpdater) {
      const check = () => autoUpdater.checkForUpdates().catch(e => { console.warn('[Updater] check failed:', e.message); reportUpdateError(e); });
      setTimeout(check, 5_000);
      // Look again every 5 minutes, so a new build arrives soon after it is released,
      // and again when the PC wakes up.
      const again = () => { if (lastUpdate.event !== 'downloading' && lastUpdate.event !== 'downloaded') check(); };
      setInterval(again, 5 * 60 * 1000);
      try { require('electron').powerMonitor.on('resume', () => setTimeout(again, 20_000)); } catch {}
    }

    // First launch after installing: open the Dashboard to set up an account, and say where the notch is.
    if (app.isPackaged) {
      try {
        // people already using Overlay (startupChosen is set on every earlier launch) skip it
        if (!db.getSetting('welcomed', '') && !db.getSetting('startupChosen', '') && !process.argv.includes('--updated')) {
          db.setSetting('welcomed', String(Date.now()));
          setTimeout(() => {
            createDashWindow({ nav: 'general' });
            notify('Overlay is ready', 'Your notch is at the top of the screen. Hover it to open.');
          }, 1500);
        }
      } catch {}
    }

    // Start with Windows by default after installing; the Dashboard switch turns it off for good.
    if (app.isPackaged) {
      try {
        if (!db.getSetting('startupChosen', '')) {
          app.setLoginItemSettings({ openAtLogin: true });
          db.setSetting('startupChosen', 'default');
        }
      } catch {}
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
    autoUpdater.checkForUpdates().catch(e => reportUpdateError(e));
  } else {
    // Running from source: updates apply only to the installed app.
    sendUpdateStatus('not-available', { version: app.getVersion(), dev: true });
  }
});

// The notes for a version: its release page on the public downloads repository.
ipcMain.on('open-whats-new', () => {
  shell.openExternal('https://getoverlay.vercel.app/changelog');
});
ipcMain.handle('update:state', () => ({ ...lastUpdate, current: app.getVersion(), lastChecked, packaged: app.isPackaged }));

// Silent install, then Overlay opens again: no installer window during an update.
function installUpdate() {
  if (!autoUpdater) return;
  try { db.setSetting('updatedFrom', app.getVersion()); } catch {}
  autoUpdater.quitAndInstall(true, true);
}
ipcMain.on('install-update', () => {
  installUpdate();
});

