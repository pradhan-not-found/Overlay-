/**
 * What you are doing right now, for the closed notch: the app in front, and
 * whether it is a code editor, a terminal or a browser. One long-lived
 * PowerShell reports the foreground process only when it changes, so nothing
 * is spawned on a timer.
 */
const { spawn } = require('child_process');
const { BrowserWindow, ipcMain } = require('electron');

const CODE = /^(code|code - insiders|cursor|windsurf|zed|idea64|pycharm64|webstorm64|rider64|clion64|goland64|devenv|sublime_text|notepad\+\+|antigravity|antigravity ide|trae|kiro)$/i;
const TERM = /^(windowsterminal|wt|powershell|pwsh|cmd|conhost|alacritty|wezterm-gui|warp|tabby|hyper|mintty|openconsole)$/i;
const BROWSER = /^(chrome|msedge|firefox|brave|opera|opera_gx|vivaldi|arc|zen|librewolf|thorium|iexplore)$/i;

let proc = null;
let current = { app: '', kind: 'other' };
let restartTimer = null;

const kindOf = (name) => (CODE.test(name) ? 'code' : TERM.test(name) ? 'terminal' : BROWSER.test(name) ? 'browser' : 'other');

const SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -Namespace OvCtx -Name Win -MemberDefinition '[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);'
$last = ''
while ($true) {
  $h = [OvCtx.Win]::GetForegroundWindow()
  $p = [uint32]0
  [void][OvCtx.Win]::GetWindowThreadProcessId($h, [ref]$p)
  $n = ''
  if ($p -ne 0) { $n = (Get-Process -Id $p).ProcessName }
  if ($n -and $n -ne $last) { $last = $n; [Console]::Out.WriteLine($n); [Console]::Out.Flush() }
  Start-Sleep -Milliseconds 900
}`;

function publish() {
  for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send('context:app', current);
}

function start() {
  if (process.platform !== 'win32' || proc) return;
  proc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', SCRIPT], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
  let buf = '';
  proc.stdout.on('data', (chunk) => {
    buf += chunk.toString('utf8');
    const lines = buf.split(/\r?\n/);
    buf = lines.pop();
    for (const raw of lines) {
      const app = raw.trim();
      // Overlay itself coming to the front says nothing about what you are doing.
      if (!app || /^(electron|overlay)$/i.test(app)) continue;
      current = { app, kind: kindOf(app) };
      publish();
    }
  });
  proc.on('exit', () => {
    proc = null;
    clearTimeout(restartTimer);
    restartTimer = setTimeout(start, 5000);
  });
}

function init() {
  ipcMain.handle('context:app', () => current);
  start();
}

function stop() {
  clearTimeout(restartTimer);
  restartTimer = null;
  if (proc) { proc.removeAllListeners('exit'); proc.kill(); proc = null; }
}

module.exports = { init, stop };
