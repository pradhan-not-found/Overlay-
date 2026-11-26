/**
 * A local Overlay account. The name and a scrypt hash of the password live in
 * the app's database on this PC; nothing is sent anywhere. Signing out locks
 * the Dashboard and the notch until the password is entered again.
 */
const crypto = require('crypto');
const { ipcMain, BrowserWindow } = require('electron');
const db = require('./db.cjs');

const get = (k, d = '') => { try { return db.getSetting(k, d) ?? d; } catch { return d; } };
const set = (k, v) => { try { db.setSetting(k, v); } catch {} };

let failures = 0;
let lockedUntil = 0;

function account() {
  try { const a = JSON.parse(get('account', '')); return a && a.hash ? a : null; } catch { return null; }
}
const hash = (password, salt) => crypto.scryptSync(String(password), Buffer.from(salt, 'hex'), 64).toString('hex');

function state() {
  const a = account();
  return { hasAccount: !!a, signedIn: !!a && get('authSession', '') === '1', name: a ? a.name : '', since: a ? a.created : 0 };
}

function publish() {
  const s = state();
  for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send('auth-changed', s);
  return s;
}

function validName(name) { return typeof name === 'string' && name.trim().length >= 1 && name.trim().length <= 40; }
function validPassword(p) { return typeof p === 'string' && p.length >= 6 && p.length <= 200; }

function init() {
  ipcMain.handle('auth:state', () => state());

  ipcMain.handle('auth:create', (_e, p) => {
    if (account()) return { ok: false, error: 'An account already exists on this PC.' };
    if (!validName(p && p.name)) return { ok: false, error: 'Add your name.' };
    if (!validPassword(p && p.password)) return { ok: false, error: 'Use at least 6 characters.' };
    const salt = crypto.randomBytes(16).toString('hex');
    set('account', JSON.stringify({ name: p.name.trim(), salt, hash: hash(p.password, salt), created: Date.now() }));
    set('authSession', '1');
    return { ok: true, state: publish() };
  });

  ipcMain.handle('auth:signin', (_e, p) => {
    const a = account();
    if (!a) return { ok: false, error: 'Create an account first.' };
    if (Date.now() < lockedUntil) return { ok: false, error: `Too many tries. Wait ${Math.ceil((lockedUntil - Date.now()) / 1000)} s.` };
    const given = Buffer.from(hash(String(p && p.password || ''), a.salt), 'hex');
    const ok = crypto.timingSafeEqual(given, Buffer.from(a.hash, 'hex'));
    if (!ok) {
      failures++;
      if (failures >= 5) { lockedUntil = Date.now() + 30000; failures = 0; }
      return { ok: false, error: 'That password is not right.' };
    }
    failures = 0;
    set('authSession', '1');
    return { ok: true, state: publish() };
  });

  ipcMain.handle('auth:signout', () => { set('authSession', ''); return publish(); });

  ipcMain.handle('auth:password', (_e, p) => {
    const a = account();
    if (!a) return { ok: false, error: 'No account.' };
    const given = Buffer.from(hash(String(p && p.current || ''), a.salt), 'hex');
    if (!crypto.timingSafeEqual(given, Buffer.from(a.hash, 'hex'))) return { ok: false, error: 'Your current password is not right.' };
    if (!validPassword(p && p.next)) return { ok: false, error: 'Use at least 6 characters.' };
    const salt = crypto.randomBytes(16).toString('hex');
    set('account', JSON.stringify({ ...a, salt, hash: hash(p.next, salt) }));
    return { ok: true };
  });

  ipcMain.handle('auth:rename', (_e, name) => {
    const a = account();
    if (!a || !validName(name)) return { ok: false };
    set('account', JSON.stringify({ ...a, name: name.trim() }));
    return { ok: true, state: publish() };
  });
}

module.exports = { init, state };
