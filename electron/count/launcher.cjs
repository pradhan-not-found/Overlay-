'use strict';
/**
 * Finds each AI tool's CLI (on PATH, in common install folders, or bundled
 * inside an editor extension) and opens it in a terminal in the project.
 */
const { app } = require('electron');
const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { NAMES } = require('./sources.cjs');

const win = process.platform === 'win32';
const home = (...p) => path.join(os.homedir(), ...p);
const EXT_DIRS = ['.vscode', '.cursor', '.antigravity', '.antigravity-ide', '.windsurf', '.vscode-insiders', '.kiro'].map((d) => home(d, 'extensions'));

const CLI = {
  'claude-code': { bin: 'claude', ext: { prefix: 'anthropic.claude-code-', rel: ['resources', 'native-binary', win ? 'claude.exe' : 'claude'] } },
  codex: { bin: 'codex', ext: { prefix: 'openai.chatgpt-', rel: ['bin'] } },
  'gemini-cli': { bin: 'gemini' },
  opencode: { bin: 'opencode' },
  cursor: { bin: 'cursor' },
};

function onPath(bin) {
  try {
    const out = execFileSync(win ? 'where.exe' : 'which', [bin], { encoding: 'utf8', timeout: 3000, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    const list = out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    return win ? list.find((l) => /\.(exe|cmd|bat)$/i.test(l)) || null : list[0] || null;
  } catch { return null; }
}

function codexIn(dir) {
  const name = win ? 'codex.exe' : 'codex';
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isFile() && e.name === name) return full;
      if (e.isDirectory() && fs.existsSync(path.join(full, name))) return path.join(full, name);
    }
  } catch {}
  return null;
}

function fromExtensions(kind) {
  const spec = CLI[kind] && CLI[kind].ext;
  if (!spec) return null;
  const found = [];
  for (const root of EXT_DIRS) {
    let entries = [];
    try { entries = fs.readdirSync(root).filter((n) => n.startsWith(spec.prefix)); } catch { continue; }
    for (const entry of entries) {
      const base = path.join(root, entry, ...spec.rel);
      const file = kind === 'codex' ? codexIn(base) : fs.existsSync(base) ? base : null;
      if (file) { try { found.push({ file, mtime: fs.statSync(file).mtimeMs }); } catch {} }
    }
  }
  found.sort((a, b) => b.mtime - a.mtime);
  return found[0] ? found[0].file : null;
}

function known(kind) {
  const list = [];
  if (kind === 'claude-code') list.push(home('.local', 'bin', win ? 'claude.exe' : 'claude'), home('.claude', 'local', win ? 'claude.exe' : 'claude'));
  if (win && CLI[kind]) list.push(path.join(process.env.APPDATA || home('AppData', 'Roaming'), 'npm', `${CLI[kind].bin}.cmd`));
  return list.find((f) => fs.existsSync(f)) || null;
}

function loggedIn(kind) {
  const ex = (...p) => fs.existsSync(home(...p));
  if (kind === 'claude-code') {
    if (ex('.claude', '.credentials.json')) return true;
    try { return Boolean(JSON.parse(fs.readFileSync(home('.claude.json'), 'utf8')).oauthAccount); } catch { return false; }
  }
  if (kind === 'codex') return ex('.codex', 'auth.json');
  if (kind === 'gemini-cli') return ex('.gemini', 'oauth_creds.json') || Boolean(process.env.GEMINI_API_KEY);
  if (kind === 'opencode') return ex('.local', 'share', 'opencode', 'auth.json');
  return kind === 'cursor';
}

let cache = null;
function tools(force = false) {
  if (!force && cache && Date.now() - cache.at < 60_000) return cache.list;
  const list = Object.keys(CLI).map((kind) => {
    const command = onPath(CLI[kind].bin) || known(kind) || fromExtensions(kind);
    const signedIn = loggedIn(kind);
    return { kind, name: NAMES[kind], command, loggedIn: signedIn, ready: Boolean(command) && signedIn };
  });
  cache = { at: Date.now(), list };
  return list;
}

const psq = (v) => `'${String(v).replace(/'/g, "''")}'`;
const shq = (v) => `'${String(v).replace(/'/g, `'\\''`)}'`;

function args(kind, prompt) {
  if (kind === 'gemini-cli') return ['-i', prompt];
  if (kind === 'opencode') return ['--prompt', prompt];
  if (kind === 'cursor') return [];
  return [prompt];
}

function launch(kind, cwd, prompt) {
  const tool = tools().find((t) => t.kind === kind);
  if (!tool || !tool.command) throw new Error(`${NAMES[kind]} is not installed as a command-line tool on this computer.`);
  if (!fs.existsSync(cwd)) throw new Error(`The project folder ${cwd} no longer exists.`);
  if (kind === 'cursor') { spawn(tool.command, [cwd], { detached: true, stdio: 'ignore', shell: win, windowsHide: true }).unref(); return; }

  const a = args(kind, prompt);
  const title = `${NAMES[kind]} · ${path.basename(cwd)}`;
  if (win) {
    const dir = path.join(app.getPath('userData'), 'launch');
    fs.mkdirSync(dir, { recursive: true });
    const script = path.join(dir, `${kind}.ps1`);
    fs.writeFileSync(script, '﻿' + [
      `$Host.UI.RawUI.WindowTitle = ${psq(title)}`,
      `Set-Location -LiteralPath ${psq(cwd)}`,
      `Write-Host ${psq(`Overlay handed this task to ${NAMES[kind]}.`)} -ForegroundColor Cyan`,
      `& ${psq(tool.command)} ${a.map(psq).join(' ')}`,
    ].join('\r\n'), 'utf8');
    const ps = ['powershell.exe', '-NoLogo', '-NoExit', '-ExecutionPolicy', 'Bypass', '-File', script];
    const wt = onPath('wt');
    if (wt) spawn(wt, ['-w', 'new', 'new-tab', '--title', title, '-d', cwd, ...ps], { detached: true, stdio: 'ignore' }).unref();
    else spawn('cmd.exe', ['/c', 'start', '""', ...ps], { cwd, detached: true, stdio: 'ignore', windowsHide: true }).unref();
    return;
  }
  const line = `cd ${shq(cwd)} && ${shq(tool.command)} ${a.map(shq).join(' ')}`;
  if (process.platform === 'darwin') {
    const apple = line.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    spawn('osascript', ['-e', `tell application "Terminal" to do script "${apple}"`, '-e', 'tell application "Terminal" to activate'], { detached: true, stdio: 'ignore' }).unref();
    return;
  }
  const term = onPath('x-terminal-emulator') || onPath('gnome-terminal') || onPath('konsole') || onPath('xterm');
  if (!term) throw new Error('No terminal emulator was found.');
  spawn(term, [term.endsWith('gnome-terminal') ? '--' : '-e', 'bash', '-lc', `${line}; exec bash`], { detached: true, stdio: 'ignore' }).unref();
}

module.exports = { tools, launch };
