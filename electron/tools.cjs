'use strict';
/**
 * Main-process side of the notch tools: hardware readings and clipboard history.
 * Clipboard history lives in memory only and is never written to disk.
 */
const { ipcMain, clipboard } = require('electron');
const si = require('systeminformation');

// ── Hardware ────────────────────────────────────────────────────────────────
let gpuCache = { at: 0, value: null };

async function hardware() {
  const [load, mem, net, fs, temp] = await Promise.all([
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
  const disk = Array.isArray(fs) ? fs.find((d) => /^c:/i.test(d.mount)) || fs[0] : null;
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

module.exports = { init };
