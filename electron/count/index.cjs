'use strict';
/**
 * Count engine for Overlay: local AI usage, plan limits, and one-click
 * handoff between coding agents. Everything runs on this machine.
 */
const { app, ipcMain, clipboard, Notification, BrowserWindow, nativeImage } = require('electron');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const src = require('./sources.cjs');
const launcher = require('./launcher.cjs');
const db = require('../db.cjs');

const SWITCHABLE = ['claude-code', 'codex', 'cursor', 'gemini-cli', 'opencode'];
const CONTEXT_FILE = { 'claude-code': 'CLAUDE.md', codex: 'AGENTS.md', 'gemini-cli': 'GEMINI.md', cursor: 'AGENTS.md', opencode: 'AGENTS.md' };
const START = '<!-- overlay:handoff:start -->';
const END = '<!-- overlay:handoff:end -->';

const DEFAULTS = { autoSwitch: true, switchAt: 95, writeContextFile: true, hidden: [], lastSwitchKey: null };

let settings = { ...DEFAULTS };
let detected = [];
const rows = new Map();
const prints = new Map();
let limits = [];
let lastSwitch = null;
let syncing = false;
let lastRemote = 0;

const settingsFile = () => path.join(app.getPath('userData'), 'count.json');
function loadSettings() {
  try { settings = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) }; } catch { settings = { ...DEFAULTS }; }
}
function saveSettings() {
  try { fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2)); } catch {}
}

function broadcast() {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send('count:update');
  }
}

async function sync(onlyChanged = false) {
  if (syncing) return;
  syncing = true;
  try {
    detected = src.detect(settings.hidden);
    for (const s of detected) {
      const print = src.fingerprint(s.kind);
      if (onlyChanged && prints.get(s.kind) === print) continue;
      prints.set(s.kind, print);
      try {
        const scanned = await src.scan(s.kind);
        rows.set(s.kind, scanned);
        try { db.storeUsage(s.kind, scanned); } catch (e) { console.warn('[Count] could not store usage', e.message); }
      } catch (e) { console.warn('[Count] scan failed', s.kind, e.message); }
    }
    for (const kind of [...rows.keys()]) if (!detected.some((d) => d.kind === kind)) rows.delete(kind);
  } finally {
    syncing = false;
  }
}

async function claudeRemote() {
  const files = [path.join(os.homedir(), '.claude', '.credentials.json'), path.join(os.homedir(), '.config', 'claude', '.credentials.json')];
  let token = '';
  for (const f of files) {
    try { token = JSON.parse(fs.readFileSync(f, 'utf8')).claudeAiOauth.accessToken || ''; } catch {}
    if (token) break;
  }
  if (!token) return [];
  const res = await fetch('https://api.anthropic.com/api/oauth/usage', {
    headers: { Authorization: `Bearer ${token}`, 'anthropic-beta': 'oauth-2025-04-20' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return [];
  const body = await res.json();
  const win = (label, w) => {
    if (!w) return null;
    const reset = typeof w.resets_at === 'string' ? Date.parse(w.resets_at) : null;
    return { kind: 'claude-code', source: 'Claude', label, usedPercent: Math.min(100, Math.max(0, Number(w.utilization) || 0)), resetsAt: Number.isFinite(reset) ? reset : null };
  };
  return [win('Session', body.five_hour), win('Weekly', body.seven_day)].filter(Boolean);
}

async function refreshLimits(force = false) {
  const next = [];
  // Claude's usage endpoint uses your existing Claude login; poll it gently.
  const prevClaude = limits.filter((l) => l.kind === 'claude-code');
  let claude = prevClaude;
  if (force || Date.now() - lastRemote > 60_000) {
    try { claude = await claudeRemote(); lastRemote = Date.now(); } catch { claude = prevClaude; }
  }
  try {
    const hit = await src.claudeLimitHit();
    if (hit && !(hit.resetsAt && hit.resetsAt < Date.now())) {
      const s = claude.find((l) => l.label === 'Session');
      if (s) { s.usedPercent = 100; s.resetsAt = hit.resetsAt || s.resetsAt; }
      else claude = [{ kind: 'claude-code', source: 'Claude', label: 'Session', usedPercent: 100, resetsAt: hit.resetsAt }, ...claude];
    }
  } catch {}
  next.push(...claude);
  try {
    const c = await src.codexLimits();
    if (c && c.session) next.push({ kind: 'codex', source: 'Codex', label: 'Session', ...c.session });
    if (c && c.weekly) next.push({ kind: 'codex', source: 'Codex', label: 'Weekly', ...c.weekly });
  } catch {}
  limits = next;
  for (const l of limits) { try { db.storeLimit(l.kind, l.label, l.usedPercent, l.resetsAt); } catch {} }
  checkAutoSwitch();
}

const peak = (kind) => Math.max(0, ...limits.filter((l) => l.kind === kind).map((l) => l.usedPercent));

function currentTool() {
  // the tool whose logs moved most recently, read live (a big log never refreshes 'detected' on its own)
  let live = {};
  try { live = src.lastActivity(detected.map((d) => d.kind)); } catch {}
  for (const d of detected) if (live[d.kind]) d.lastActive = Math.max(d.lastActive || 0, live[d.kind]);
  const list = detected.filter((d) => SWITCHABLE.includes(d.kind)).sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
  return list[0] ? list[0].kind : null;
}

function nextTool(from) {
  const ready = launcher.tools().filter((t) => t.ready && t.kind !== from && SWITCHABLE.includes(t.kind)).map((t) => t.kind);
  const pool = ready.length ? ready : detected.map((d) => d.kind).filter((k) => k !== from && SWITCHABLE.includes(k));
  return pool.sort((a, b) => peak(a) - peak(b) || SWITCHABLE.indexOf(a) - SWITCHABLE.indexOf(b))[0] || null;
}

function git(cwd, argv) {
  return new Promise((resolve) => {
    execFile('git', argv, { cwd, timeout: 6000, maxBuffer: 400_000, windowsHide: true }, (err, out) => resolve(err ? '' : String(out).trim()));
  });
}

async function brief(from, to, ctx, reason) {
  const cwd = ctx && ctx.cwd;
  const [branch, status, commits] = cwd
    ? await Promise.all([git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']), git(cwd, ['status', '--short']), git(cwd, ['log', '-5', '--pretty=format:%h %s'])])
    : ['', '', ''];
  const list = (items, empty) => (items && items.length ? items.map((i) => `- ${i}`).join('\n') : `- ${empty}`);
  return [
    `## Handoff from ${src.NAMES[from]} to ${src.NAMES[to]}`,
    '',
    `_${reason} Prepared locally by Overlay on ${new Date().toLocaleString()}. Nothing left this machine._`,
    '',
    '### What I was asked to do',
    list(ctx && ctx.prompts.slice(-5), 'No recent prompts were found.'),
    '',
    '### Where the last session stopped',
    (ctx && ctx.lastReply) || 'No final reply was recorded.',
    '',
    '### Files touched',
    list(ctx && ctx.files, 'None recorded.'),
    '',
    '### Repository',
    cwd ? `- Folder: \`${cwd}\`` : '- Folder unknown',
    branch ? `- Branch: \`${branch}\`` : '',
    status ? `- Uncommitted:\n\n\`\`\`\n${status.split('\n').slice(0, 30).join('\n')}\n\`\`\`` : '- Working tree clean or not a git repository.',
    commits ? `- Recent commits:\n\n\`\`\`\n${commits}\n\`\`\`` : '',
    '',
    '### Next step',
    'Continue the task above from where it stopped. Check the uncommitted changes first, then carry on with the most recent request.',
  ].filter((l) => l !== '').join('\n');
}

function writeManaged(file, text) {
  const block = `${START}\n${text}\n${END}`;
  if (!fs.existsSync(file)) { fs.writeFileSync(file, block + '\n', 'utf8'); return; }
  const cur = fs.readFileSync(file, 'utf8');
  const s = cur.indexOf(START); const e = cur.indexOf(END);
  fs.writeFileSync(file, s >= 0 && e > s ? cur.slice(0, s) + block + cur.slice(e + END.length) : `${cur.trimEnd()}\n\n${block}\n`, 'utf8');
}

function starter(from, contextFile, text) {
  const intro = `I was working on this in ${src.NAMES[from]} and hit a usage limit, so I'm continuing here.`;
  if (contextFile) return `${intro} Read the "Handoff from ${src.NAMES[from]}" section in ${contextFile}, check the uncommitted changes, then continue the task where it stopped. Briefly confirm what you're picking up before you start.`;
  const flat = text.replace(/```/g, '').replace(/\s*\n+\s*/g, ' · ').replace(/["`$]/g, "'").slice(0, 5000);
  return `${intro} Here is the handoff: ${flat} — Continue the task where it stopped. Briefly confirm what you're picking up before you start.`;
}

async function handoff(from, to, reason, launch) {
  const target = to || nextTool(from);
  if (!target) throw new Error('No other AI tool was found on this machine.');
  const ctx = await src.latestSession(from);
  const text = await brief(from, target, ctx, reason);
  const name = CONTEXT_FILE[target];
  const cwd = ctx && ctx.cwd && fs.existsSync(ctx.cwd) ? ctx.cwd : os.homedir();
  let file = null;
  // Only a switch you start yourself writes into the project. Automatic ones
  // prepare the context and wait for your click, so nothing lands in a repo unasked.
  if (launch && settings.writeContextFile && ctx && ctx.cwd && name && fs.existsSync(ctx.cwd)) {
    file = path.join(ctx.cwd, name);
    writeManaged(file, text);
  }
  clipboard.writeText(text);
  const prompt = starter(from, file ? name : null, text);
  if (launch) launcher.launch(target, cwd, prompt);
  lastSwitch = { at: Date.now(), from, to: target, project: ctx && ctx.cwd, file, reason, launched: Boolean(launch) };

  if (!launch && Notification.isSupported()) {
    const canLaunch = launcher.tools().some((t) => t.kind === target && t.command);
    const note = new Notification({
      title: canLaunch ? `Continue in ${src.NAMES[target]}` : `Switch to ${src.NAMES[target]}`,
      body: canLaunch ? `${reason} Click to open ${src.NAMES[target]} in ${path.basename(cwd)} with your context.` : `${reason} Your context is on the clipboard.`,
      icon: nativeImage.createFromPath(path.join(__dirname, '../../build/icon.png')),
    });
    note.on('click', () => {
      if (!canLaunch) return;
      try { launcher.launch(target, cwd, prompt); lastSwitch.launched = true; broadcast(); } catch {}
    });
    note.show();
  }
  broadcast();
  return lastSwitch;
}

function checkAutoSwitch() {
  if (!settings.autoSwitch) return;
  const at = Math.min(100, Math.max(50, settings.switchAt || 95));
  const hit = limits.filter((l) => l.usedPercent >= at && (!l.resetsAt || l.resetsAt > Date.now())).sort((a, b) => b.usedPercent - a.usedPercent)[0];
  if (!hit) return;
  const key = `${hit.kind}:${hit.label}:${hit.resetsAt ? Math.round(hit.resetsAt / 600_000) : new Date().toDateString()}`;
  if (settings.lastSwitchKey === key) return;
  settings.lastSwitchKey = key;
  saveSettings();
  handoff(hit.kind, null, `${hit.source} ${hit.label.toLowerCase()} limit is at ${Math.round(hit.usedPercent)}%.`, false).catch(() => {});
}

function shiftDay(days) {
  const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - days);
  return src.dayKey(d);
}

function snapshot() {
  const today = shiftDay(0); const week = shiftDay(6); const prevWeekStart = shiftDay(13); const month = `${today.slice(0, 7)}-01`;
  const totals = { today: 0, week: 0, prevWeek: 0, month: 0, monthUsd: 0 };
  const byDay = new Map(); const models = new Map();
  const sources = detected.map((d) => ({ ...d, today: 0, todayUsd: 0, week: 0, weekUsd: 0, month: 0, estimated: false }));
  for (const s of sources) {
    for (const r of rows.get(s.kind) || []) {
      const t = r.input + r.cache + r.output;
      if (!r.exact) s.estimated = true;
      if (r.day === today) { totals.today += t; s.today += t; s.todayUsd += r.usd; }
      if (r.day >= week) { totals.week += t; s.week += t; s.weekUsd += r.usd; }
      else if (r.day >= prevWeekStart) totals.prevWeek += t;
      if (r.day >= month) {
        totals.month += t; totals.monthUsd += r.usd; s.month += t;
        const m = models.get(r.model) || { model: r.model, kind: s.kind, tokens: 0 };
        m.tokens += t; models.set(r.model, m);
      }
      if (r.day >= shiftDay(29)) {
        const parts = byDay.get(r.day) || {};
        parts[s.kind] = (parts[s.kind] || 0) + t;
        byDay.set(r.day, parts);
      }
    }
  }
  const daily = Array.from({ length: 30 }, (_, i) => { const day = shiftDay(29 - i); return { day, parts: byDay.get(day) || {} }; });
  const current = currentTool();
  return {
    ...totals,
    daily,
    sources: sources.sort((a, b) => b.month - a.month),
    models: [...models.values()].sort((a, b) => b.tokens - a.tokens).slice(0, 5),
    limits,
    tools: launcher.tools(),
    current,
    next: nextTool(current),
    lastSwitch,
    settings: { autoSwitch: settings.autoSwitch, switchAt: settings.switchAt, writeContextFile: settings.writeContextFile },
    syncing,
  };
}

/** Stored history for the Dashboard: per day, per tool, per model, plus limit readings. */
function history(days = 30) {
  const n = Math.min(365, Math.max(7, Number(days) || 30));
  const since = shiftDay(n - 1);
  const rowsDb = db.getUsage(since);
  const byDay = new Map();
  const byKind = new Map();
  const byModel = new Map();
  for (const r of rowsDb) {
    const t = r.input + r.cache + r.output;
    const d = byDay.get(r.day) || {};
    d[r.kind] = (d[r.kind] || 0) + t;
    byDay.set(r.day, d);
    const k = byKind.get(r.kind) || { kind: r.kind, name: src.NAMES[r.kind] || r.kind, tokens: 0, input: 0, cache: 0, output: 0, usd: 0, estimated: false };
    k.tokens += t; k.input += r.input; k.cache += r.cache; k.output += r.output; k.usd += r.usd; if (!r.exact) k.estimated = true;
    byKind.set(r.kind, k);
    const m = byModel.get(r.model) || { model: r.model, kind: r.kind, tokens: 0, usd: 0 };
    m.tokens += t; m.usd += r.usd;
    byModel.set(r.model, m);
  }
  const daily = Array.from({ length: n }, (_, i) => { const day = shiftDay(n - 1 - i); return { day, parts: byDay.get(day) || {} }; });
  return {
    days: n,
    since: db.firstUsageDay(),
    daily,
    kinds: [...byKind.values()].sort((a, b) => b.tokens - a.tokens),
    models: [...byModel.values()].sort((a, b) => b.tokens - a.tokens).slice(0, 8),
    limitHistory: db.getLimits(Date.now() - 7 * 86_400_000),
  };
}

function init() {
  loadSettings();
  ipcMain.handle('count:history', (_e, days) => history(days));
  ipcMain.handle('count:snapshot', () => snapshot());
  // When each tool last wrote to its log; the notch keeps a working agent in view.
  ipcMain.handle('count:active', () => src.lastActivity(src.SOURCES.map((d) => d.kind)));
  ipcMain.handle('count:refresh', async () => { await sync(); await refreshLimits(true); broadcast(); return snapshot(); });
  ipcMain.handle('count:continue', async (_e, from, to) => {
    const kind = from || currentTool();
    if (!kind) throw new Error('No AI tool activity found yet.');
    const reason = peak(kind) >= 80 ? `${src.NAMES[kind]} is at ${Math.round(peak(kind))}% of its limit.` : 'Switched by hand.';
    return handoff(kind, to || null, reason, true);
  });
  ipcMain.handle('count:settings', (_e, patch) => {
    if (patch && typeof patch === 'object') {
      if ('autoSwitch' in patch) settings.autoSwitch = Boolean(patch.autoSwitch);
      if ('writeContextFile' in patch) settings.writeContextFile = Boolean(patch.writeContextFile);
      if ('switchAt' in patch) settings.switchAt = Math.min(100, Math.max(50, Math.round(Number(patch.switchAt) || 95)));
      saveSettings();
    }
    broadcast();
    return snapshot();
  });

  const tick = async (changed) => { await sync(changed); await refreshLimits(); broadcast(); };
  setTimeout(() => tick(false), 1500);
  // Local logs are cheap to fingerprint, so a limit hit in one tool can
  // trigger a handoff to another within a minute.
  setInterval(() => tick(true), 20_000);
}

/** Rescan every AI tool and refresh plan limits now. */
async function refreshAll() {
  await sync();
  await refreshLimits(true);
  broadcast();
  return snapshot();
}

module.exports = { init, snapshot, refreshAll };
