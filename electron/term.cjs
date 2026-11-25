'use strict';
/** One PowerShell process for the notch. Variables, cd and the working folder stay between commands. */
const { ipcMain } = require('electron');
const { spawn } = require('child_process');
const os = require('os');

let cwd = os.homedir();
let child = null;
let outBuf = '';
let errBuf = '';
const waiters = [];
const MARK = '__OV_DONE__';

function start() {
  if (child && !child.killed) return child;
  child = spawn(
    'powershell.exe',
    ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', '-'],
    { cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] },
  );
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { outBuf += chunk; pump(); });
  child.stderr.on('data', (chunk) => { errBuf += chunk; });
  child.on('exit', () => {
    child = null;
    const pending = waiters.splice(0);
    pending.forEach((done) => done({ cwd, out: '', err: 'PowerShell stopped.', code: 1 }));
  });
  return child;
}

function pump() {
  if (!waiters.length) return;
  const at = outBuf.indexOf(MARK);
  if (at < 0) return;
  const body = outBuf.slice(0, at).replace(/\s+$/, '');
  const rest = outBuf.slice(at);
  const nl = rest.indexOf('\n');
  if (nl < 0) return;
  const marker = rest.slice(0, nl);
  outBuf = rest.slice(nl + 1);
  const parts = marker.split('|');
  const next = (parts[1] || '').trim();
  const code = Number(parts[2] || 0);
  if (next) cwd = next;
  const done = waiters.shift();
  setTimeout(() => {
    const err = errBuf.replace(/\s+$/, '');
    errBuf = '';
    done({ cwd, out: body, err, code: Number.isFinite(code) ? code : 0 });
    pump();
  }, 30);
}

function run(line) {
  const text = String(line || '').replace(/\r/g, '').trim();
  if (!text) return Promise.resolve({ cwd, out: '', err: '', code: 0 });
  if (text.length > 8000) return Promise.resolve({ cwd, out: '', err: 'That command is too long.', code: 1 });
  start();
  return new Promise((resolve) => {
    waiters.push(resolve);
    const b64 = Buffer.from(text, 'utf16le').toString('base64');
    const wrapped = [
      `$__ov = [Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('${b64}'))`,
      'Invoke-Expression $__ov',
      `Write-Output ('${MARK}|' + (Get-Location).Path + '|' + $LASTEXITCODE)`,
    ].join('; ');
    child.stdin.write(wrapped + '\r\n');
  });
}

function init() {
  ipcMain.handle('term:cwd', () => cwd);
  ipcMain.handle('term:run', (_e, line) => run(line));
}

module.exports = { init };
