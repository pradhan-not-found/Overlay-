'use strict';
/**
 * Main-process side of the notch tools: hardware readings and clipboard history.
 * Clipboard history lives in memory only and is never written to disk.
 */
const { ipcMain, clipboard, shell, nativeImage } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const si = require('systeminformation');

// ── Hardware ────────────────────────────────────────────────────────────────
let gpuCache = { at: 0, value: null };

async function hardware() {
  const [load, mem, net, disks, temp] = await Promise.all([
    si.currentLoad().catch(() => null),
    si.mem().catch(() => null),
    si.networkStats().catch(() => []),
    si.fsSize().catch(() => []),
    si.cpuTemperature().catch(() => null),
  ]);
  if (Date.now() - gpuCache.at > 30_000) {
    gpuCache = { at: Date.now(), value: await si.graphics().catch(() => null) };
  }
  const gpu = gpuCache.value && gpuCache.value.controllers
    ? gpuCache.value.controllers.find((c) => typeof c.utilizationGpu === 'number') || gpuCache.value.controllers[0]
    : null;
  const iface = Array.isArray(net) ? net.find((n) => n.operstate === 'up') || net[0] : null;
  const disk = Array.isArray(disks) ? disks.find((d) => /^c:/i.test(d.mount)) || disks[0] : null;
  return {
    cpu: load ? Math.round(load.currentLoad) : null,
    cores: load && Array.isArray(load.cpus) ? load.cpus.map((c) => Math.round(c.load)) : [],
    temp: temp && typeof temp.main === 'number' && temp.main > 0 ? Math.round(temp.main) : null,
    memUsed: mem ? mem.active : null,
    memTotal: mem ? mem.total : null,
    gpu: gpu ? { name: gpu.model || 'GPU', load: typeof gpu.utilizationGpu === 'number' ? gpu.utilizationGpu : null, vram: gpu.vram || null } : null,
    net: iface ? { name: iface.iface, rx: Math.max(0, iface.rx_sec || 0), tx: Math.max(0, iface.tx_sec || 0) } : null,
    disk: disk ? { mount: disk.mount, used: disk.used, size: disk.size } : null,
  };
}

// ── Clipboard ───────────────────────────────────────────────────────────────
const clips = [];
let lastText = '';
let paused = false;

function pollClipboard() {
  if (paused) return;
  let text = '';
  try { text = clipboard.readText(); } catch { return; }
  if (!text || text === lastText) return;
  lastText = text;
  if (text.length > 20_000) return;
  const existing = clips.findIndex((c) => c.text === text);
  if (existing >= 0) clips.splice(existing, 1);
  clips.unshift({ id: Date.now() + Math.random(), text, at: Date.now() });
  if (clips.length > 40) clips.length = 40;
}

function init() {
  ipcMain.handle('hw:sample', () => hardware());
  ipcMain.handle('clip:list', () => ({ paused, items: clips }));
  ipcMain.handle('clip:copy', (_e, id) => {
    const item = clips.find((c) => c.id === id);
    if (!item) return false;
    lastText = item.text;
    clipboard.writeText(item.text);
    return true;
  });
  ipcMain.handle('clip:remove', (_e, id) => {
    const i = clips.findIndex((c) => c.id === id);
    if (i >= 0) clips.splice(i, 1);
    return { paused, items: clips };
  });
  ipcMain.handle('clip:clear', () => { clips.length = 0; return { paused, items: clips }; });
  ipcMain.handle('clip:pause', (_e, value) => { paused = Boolean(value); return { paused, items: clips }; });
  try { lastText = clipboard.readText(); } catch {}
  setInterval(pollClipboard, 900);
}

// ── Launcher: apps from the Start menu ──────────────────────────────────────
let appsCache = { at: 0, list: [] };
function listApps() {
  if (Date.now() - appsCache.at < 5 * 60_000 && appsCache.list.length) return appsCache.list;
  const roots = [
    path.join(process.env.ProgramData || 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
  ];
  const seen = new Map();
  const walk = (dir, depth) => {
    if (depth > 4) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { walk(full, depth + 1); continue; }
      if (!/\.(lnk|url|appref-ms)$/i.test(e.name)) continue;
      const name = e.name.replace(/\.(lnk|url|appref-ms)$/i, '');
      if (/uninstall|readme|help|documentation|license|website|release notes/i.test(name)) continue;
      if (!seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), { name, path: full });
    }
  };
  roots.forEach((r) => walk(r, 0));
  appsCache = { at: Date.now(), list: [...seen.values()].sort((a, b) => a.name.localeCompare(b.name)) };
  return appsCache.list;
}

function initFiles() {
  ipcMain.handle('apps:list', () => listApps());
  ipcMain.handle('open-path', async (_e, target) => {
    if (typeof target !== 'string' || !target) return 'No path';
    if (/^https?:\/\//i.test(target)) { await shell.openExternal(target); return ''; }
    return shell.openPath(target);
  });
  ipcMain.handle('reveal-path', (_e, target) => { if (typeof target === 'string' && fs.existsSync(target)) shell.showItemInFolder(target); });
  ipcMain.handle('path-info', (_e, target) => {
    try { const st = fs.statSync(target); return { exists: true, size: st.size, dir: st.isDirectory() }; } catch { return { exists: false }; }
  });
  // Drag a shelved file back out of the notch into any app.
  const dragIcon = nativeImage.createFromPath(path.join(__dirname, 'tray.png')).resize({ width: 32, height: 32 });
  ipcMain.on('shelf:drag', (event, file) => {
    if (typeof file !== 'string' || !fs.existsSync(file)) return;
    event.sender.startDrag({ file, icon: dragIcon });
  });
}

module.exports = { init: () => { init(); initFiles(); } };
