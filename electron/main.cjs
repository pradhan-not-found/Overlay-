const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 150,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Always keep on top across all workspaces (desktops)
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  
  // Position it at the top center of the primary display
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;
  
  mainWindow.setPosition(Math.round(width / 2 - 300), 20); // 20px from top

  // In development, load from vite dev server
  const startUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  mainWindow.loadURL(startUrl);

  // uncomment to open devtools
  // mainWindow.webContents.openDevTools({ mode: 'detach' });

  // Handle IPC for resizing the window when pill expands/contracts
  ipcMain.on('resize-window', (event, { width, height }) => {
    mainWindow.setSize(width, height);
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
