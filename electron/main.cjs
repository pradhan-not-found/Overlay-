const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: 440,
    height: 48,
    x: Math.round((width - 440) / 2),
    y: 12,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: false,
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Always keep on top across all workspaces (desktops)
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // In development, load from vite dev server; in production, load the built file
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    const startUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    mainWindow.loadURL(startUrl);
  }

  // uncomment to open devtools
  // mainWindow.webContents.openDevTools({ mode: 'detach' });

  // Handle IPC for resizing the window symmetrically on X, anchored at Y
  ipcMain.on('resize-window', (event, { width, height }) => {
    const bounds = mainWindow.getBounds();
    const x = Math.round(bounds.x + (bounds.width - width) / 2);
    mainWindow.setBounds({ x, y: bounds.y, width, height }, true);
  });

  // Handle custom IPC dragging (flawless on Windows, immune to DPI scale drift)
  let dragInterval = null;
  ipcMain.on('start-drag', (event) => {
    const { screen } = require('electron');
    const point = screen.getCursorScreenPoint();
    const bounds = mainWindow.getBounds();
    startX = point.x;
    startY = point.y;
    startBounds = bounds;
    
    if (dragInterval) clearInterval(dragInterval);
    
    dragInterval = setInterval(() => {
      const currentPoint = screen.getCursorScreenPoint();
      const deltaX = currentPoint.x - startX;
      const deltaY = currentPoint.y - startY;
      mainWindow.setBounds({
        x: startBounds.x + deltaX,
        y: startBounds.y + deltaY,
        width: startBounds.width,
        height: startBounds.height
      });
    }, 16); // 60fps tracking
  });

  ipcMain.on('stop-drag', () => {
    if (dragInterval) {
      clearInterval(dragInterval);
      dragInterval = null;
    }
  });

  ipcMain.on('open-external', (event, url) => {
    require('electron').shell.openExternal(url);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
