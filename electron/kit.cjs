/**
 * Downloads, Ports and Find for the notch. Everything stays on this PC.
 *
 * Downloads lists the newest files in the Downloads folder and lets you drag
 * one straight out of the notch. Ports lists the local servers that are
 * listening and can stop one. Find searches file names in your own folders.
 */
const { ipcMain, shell, app } = require('electron');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();
const DOWNLOADS = path.join(HOME, 'Downloads');
const FOLDERS = ['Desktop', 'Documents', 'Downloads', 'Pictures', 'Music', 'Videos'];
// OneDrive often holds Desktop, Documents and Pictures instead of the home folder.
const ROOTS = [...FOLDERS.map((d) => path.join(HOME, d)), ...['Desktop', 'Documents', 'Pictures'].map((d) => path.join(HOME, 'OneDrive', d))]
  .filter((d, i, all) => fs.existsSync(d) && all.indexOf(d) === i);
// Windows' own services: listed nowhere, never stoppable from the notch.
const SYSTEM = /^(system|svchost|lsass|wininit|services|spoolsv|smss|csrss|winlogon|dwm|explorer|searchindexer|msmpeng|nissrv|securityhealthservice|wmiprvse|dashost|fontdrvhost|unknown)$/i;
const SKIP = new Set(['node_modules', '.git', '$RECYCLE.BIN', 'AppData', '.cache', '.vscode', '__pycache__', 'dist', 'build']);

// Only files we handed to the window may be opened, revealed or dragged.
const known = new Set();
const remember = (rows) => { rows.forEach((r) => known.add(r.path)); return rows; };
const inHome = (p) => typeof p === 'string' && path.resolve(p).toLowerCase().startsWith(HOME.toLowerCase() + path.sep);
const allowed = (p) => known.has(p) && inHome(p) && fs.existsSync(p);

function run(cmd, args) {
  return new Promise((resolve) => {
    execFile(cmd, args, { windowsHide: true, timeout: 8000, maxBuffer: 8_000_000 }, (err, out) => resolve(err ? '' : String(out || '')));
  });
}

async function downloads() {
  let names = [];
  try { names = await fs.promises.readdir(DOWNLOADS); } catch { return []; }
  const rows = [];
  for (const name of names) {
    if (name.startsWith('.') || /\.(crdownload|part|tmp)$/i.test(name) || name === 'desktop.ini') continue;
    const p = path.join(DOWNLOADS, name);
    try {
      const st = await fs.promises.stat(p);
      if (st.isFile()) rows.push({ name, path: p, size: st.size, at: st.mtimeMs });
    } catch {}
  }
  rows.sort((a, b) => b.at - a.at);
  return remember(rows.slice(0, 14));
}

// ── Ports ────────────────────────────────────────────────────────────────────
let lastPids = new Set();
async function ports() {
  const [net, tasks] = await Promise.all([run('netstat', ['-ano', '-p', 'tcp']), run('tasklist', ['/FO', 'CSV', '/NH'])]);
  const names = new Map();
  for (const line of tasks.split(/\r?\n/)) {
    const m = line.match(/^"([^"]+)","(\d+)"/);
    if (m) names.set(Number(m[2]), m[1].replace(/\.exe$/i, ''));
  }
  const seen = new Map();
  for (const line of net.split(/\r?\n/)) {
    const m = line.trim().match(/^TCP\s+(\S+):(\d+)\s+\S+\s+LISTENING\s+(\d+)$/i);
    if (!m) continue;
    const host = m[1], port = Number(m[2]), pid = Number(m[3]);
    // Developer servers: local or all interfaces, above the system range.
    // Ports 49152 and up are Windows' dynamic range: background services, not your servers.
    if (port < 1024 || port >= 49152 || pid <= 4) continue;
    if (!/^(127\.0\.0\.1|0\.0\.0\.0|\[::\]|\[::1\])$/.test(host)) continue;
    if (SYSTEM.test(names.get(pid) || 'unknown')) continue;
    if (!seen.has(port)) seen.set(port, { port, pid, name: names.get(pid) || 'Unknown', local: host !== '0.0.0.0' && host !== '[::]' });
  }
  const rows = [...seen.values()].sort((a, b) => a.port - b.port);
  lastPids = new Set(rows.map((r) => r.pid));
  return rows;
}

function stopPort(pid) {
  pid = Number(pid);
  // Only a process we just listed, never the system or ourselves.
  if (!lastPids.has(pid) || pid <= 4 || pid === process.pid) return false;
  try { process.kill(pid); return true; } catch { return false; }
}

// ── Find ─────────────────────────────────────────────────────────────────────
async function find(q) {
  q = String(q || '').trim().toLowerCase();
  if (q.length < 2) return [];
  const out = [];
  const started = Date.now();
  const walk = async (dir, depth) => {
    if (out.length >= 40 || depth > 5 || Date.now() - started > 2500) return;
    let entries = [];
    try { entries = await fs.promises.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (out.length >= 40) return;
      if (e.name.startsWith('.') || SKIP.has(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.name.toLowerCase().includes(q)) {
        let st = null;
        try { st = await fs.promises.stat(p); } catch {}
        out.push({ name: e.name, path: p, dir: path.relative(HOME, dir) || '~', folder: e.isDirectory(), size: st ? st.size : 0, at: st ? st.mtimeMs : 0 });
      }
      if (e.isDirectory()) await walk(p, depth + 1);
    }
  };
  for (const root of ROOTS) await walk(root, 0);
  // Names that start with the query first, then the newest.
  out.sort((a, b) => (b.name.toLowerCase().startsWith(q) - a.name.toLowerCase().startsWith(q)) || b.at - a.at);
  return remember(out);
}

function init() {
  ipcMain.handle('kit:downloads', () => downloads());
  ipcMain.handle('kit:ports', () => ports());
  ipcMain.handle('kit:stop-port', (_e, pid) => stopPort(pid));
  ipcMain.handle('kit:find', (_e, q) => find(q));
  ipcMain.handle('kit:open', (_e, p) => (allowed(p) ? shell.openPath(p).then(() => true) : false));
  ipcMain.handle('kit:reveal', (_e, p) => { if (allowed(p)) shell.showItemInFolder(p); return allowed(p); });
  ipcMain.handle('kit:open-url', (_e, port) => {
    port = Number(port);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) return false;
    return shell.openExternal(`http://localhost:${port}`).then(() => true);
  });
  // Drag a file out of the notch into any app.
  ipcMain.on('kit:drag', async (e, p) => {
    if (!allowed(p)) return;
    try {
      const icon = await app.getFileIcon(p, { size: 'normal' });
      e.sender.startDrag({ file: p, icon });
    } catch {}
  });
}

module.exports = { init };
