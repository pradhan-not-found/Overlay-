'use strict';
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

const { app, BrowserWindow, ipcMain, shell, screen, nativeImage, Notification } = require('electron');
const path   = require('path');
const fs     = require('fs');
const si     = require('systeminformation');
const { exec, execSync } = require('child_process');
const db     = require('./db.cjs');

// ─── Auto Updater ─────────────────────────────────────────────────────────────
let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
  autoUpdater.autoDownload = true;         // Download automatically in background
  autoUpdater.autoInstallOnAppQuit = true;  // Install on next quit
  autoUpdater.allowDowngrade = false;
  autoUpdater.channel = 'latest';           // Use 'latest' release channel

  // Private repo with PUBLIC releases — no token needed for release downloads.
  // GitHub allows making individual releases publicly visible even on private repos.
  // Just mark each release as "Public" when you publish it on GitHub.
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'pradhan-not-found',
    repo: 'Overlay-',
    releaseType: 'release',
    private: false  // Releases are publicly accessible
  });

  if (!app.isPackaged) {
    // In dev mode, don't auto-check — just simulate
    autoUpdater.forceDevUpdateConfig = true;
  }
} catch(e) {
  console.warn('[Updater] electron-updater not available:', e.message);
}

function sendUpdateStatus(event, data) {
  // Broadcast to all relevant windows
  [settingsWindow].forEach(win => {
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
        icon: path.join(__dirname, '../applogo.png')
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
        icon: path.join(__dirname, '../applogo.png')
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
      const info = {
        artist: activeSession.artist || '',
        title: activeSession.title || '',
        isPlaying: activeSession.playbackStatus === 'playing',
        albumArt: activeSession.thumbnail || null,
        sourceApp: activeSession.sourceAppDisplayName || activeSession.sourceAppUserModelId || 'Unknown'
      };
      lastMediaInfo = info;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('media-info', info);
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

function openSettings() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 700,
    height: 550,
    icon: nativeImage.createFromPath(path.join(__dirname, '../applogo.png')),
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#000000', symbolColor: '#ffffff' },
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (app.isPackaged) {
    settingsWindow.loadFile(path.join(__dirname, '../dist/settings.html'));
  } else {
    settingsWindow.loadURL((devUrl || 'http://localhost:5173') + '/settings.html');
  }
}

ipcMain.on('open-settings', openSettings);

function createPillWindow() {
  // Initialize Database
  try {
    db.initDB();
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }

  const primary = screen.getPrimaryDisplay();
  const { bounds } = primary;
  const W = 280, H = 44;
  const winW = W + PAD * 2;
  const winH = H + PAD * 2;

  mainWindow = new BrowserWindow({
    width:  winW,
    height: winH,
    x: Math.round(bounds.x + (bounds.width - winW) / 2),
    y: bounds.y - PAD,
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

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    mainWindow.loadURL(devUrl);
  }

  mainWindow.on('closed', () => { mainWindow = null; });
  
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (typeof level === 'object') {
      console.log(`[FRONTEND ${level.level}] ${level.message} (${level.sourceId}:${level.line})`);
    } else {
      console.log(`[FRONTEND ${level}] ${message} (${sourceId}:${line})`);
    }
  });
}

// ── Drag ──────────────────────────────────────────────────────────────────
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
ipcMain.on('resize-window', (_e, { width, height }) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const winW = width + PAD * 2;
  const winH = height + PAD * 2;
  const cur     = mainWindow.getBounds();
  const primary = screen.getPrimaryDisplay().bounds;
  const newX    = Math.round(cur.x + (cur.width - winW) / 2);
  const docked  = cur.y <= primary.y - PAD + 30;
  const newY    = docked ? (primary.y - PAD) : Math.round(cur.y + (cur.height - winH) / 2);
  mainWindow.setBounds({ x: newX, y: newY, width: winW, height: winH }, false);
  mainWindow.webContents.send('docked-state', docked);
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
ipcMain.on('open-dashboard', () => createDashWindow());
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

ipcMain.handle('get-stats', () => {
  return db.getStats();
});

// Launch Windows Snipping Tool via URI
ipcMain.on('take-screenshot', () => {
  exec('explorer ms-screenclip:');
});

ipcMain.on('save-shortcuts', (_e, shortcuts) => {
  db.clearShortcuts();
  shortcuts.forEach(s => db.addShortcut(s));
});

ipcMain.on('open-shortcut', (_e, target) => {
  if (!target) return;
  if (target.startsWith('http://') || target.startsWith('https://')) {
    shell.openExternal(target);
  } else {
    // Execute local app path or command
    exec(`start "" "${target}"`, (err) => {
      if (err) console.error('Failed to open shortcut:', err);
    });
  }
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
function createDashWindow() {
  if (dashWindow && !dashWindow.isDestroyed()) { dashWindow.focus(); return; }
  dashWindow = new BrowserWindow({
    width: 720, height: 540,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#000000', symbolColor: '#ffffff' },
    transparent: false,
    backgroundColor: '#000000',
    resizable: false,
    center: true,
    title: 'Overlay — Dashboard',
    autoHideMenuBar: true,
    icon: nativeImage.createFromPath(path.join(__dirname, '../applogo.png')),
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (app.isPackaged) dashWindow.loadFile(path.join(__dirname, '../dist/dashboard.html'));
  else dashWindow.loadURL((devUrl || 'http://localhost:5173') + '/dashboard.html');
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
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('widget-config', finalCfg);
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

// ─── Lifecycle ────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  app.setAppUserModelId('com.overlay.app');
  const cfg = readConfig();
  createPillWindow();
  if (!cfg.setupComplete) {
    setTimeout(() => createDashWindow(), 800);
  } else {
    mainWindow.webContents.once('did-finish-load', () => {
      cfg.shortcuts = db.getShortcuts();
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('widget-config', cfg);
    });
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
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

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

