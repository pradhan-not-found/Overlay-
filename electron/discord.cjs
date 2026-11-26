/**
 * Discord voice calls in the notch, through Discord's local RPC.
 *
 * The desktop app listens on a named pipe (\\.\pipe\discord-ipc-0 … 9). We
 * talk to it with the user's own Discord application: they paste its Client ID
 * and Client Secret once, Discord asks them to approve Overlay, and from then
 * on a refresh token keeps us signed in. Secrets are encrypted with the OS key
 * store (safeStorage) before they touch the settings table.
 *
 * What we read: the voice channel you are in, who is in it, who is talking,
 * and your own mute and deafen. What we change: mute, deafen, and leaving.
 */
const net = require('net');
const crypto = require('crypto');
const { ipcMain, safeStorage, BrowserWindow, shell } = require('electron');
const db = require('./db.cjs');

const OP = { HANDSHAKE: 0, FRAME: 1, CLOSE: 2, PING: 3, PONG: 4 };
const SCOPES = ['rpc', 'rpc.voice.read', 'rpc.voice.write', 'identify'];
const REDIRECT = 'http://localhost';
const RETRY_MS = 15000;

let sock = null;
let buf = Buffer.alloc(0);
let pending = new Map();
let retry = null;
let stopped = false;
let channelSubs = null; // channel id we hold per-channel subscriptions for
let state = blank();

function blank() {
  return { status: 'setup', user: null, channel: null, members: [], self: { mute: false, deaf: false }, error: '' };
}

// ── Settings, with secrets kept encrypted ────────────────────────────────────
const get = (k, d = '') => { try { return db.getSetting(k, d) ?? d; } catch { return d; } };
const set = (k, v) => { try { db.setSetting(k, v); } catch {} };
function putSecret(key, value) {
  if (!value) return set(key, '');
  const enc = safeStorage.isEncryptionAvailable() ? 'enc:' + safeStorage.encryptString(value).toString('base64') : '';
  set(key, enc); // never store a secret in the clear
}
function readSecret(key) {
  const raw = get(key, '');
  if (!raw.startsWith('enc:')) return '';
  try { return safeStorage.decryptString(Buffer.from(raw.slice(4), 'base64')); } catch { return ''; }
}
// Overlay's own Discord application, built into the app: people only click
// Connect and approve in Discord. The details come from electron/discord-app.json
// (kept out of git) or OVERLAY_DISCORD_ID and OVERLAY_DISCORD_SECRET.
const APP = (() => {
  let file = {};
  try { file = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'discord-app.json'), 'utf8')); } catch {}
  return {
    id: String(process.env.OVERLAY_DISCORD_ID || file.clientId || '').trim(),
    secret: String(process.env.OVERLAY_DISCORD_SECRET || file.clientSecret || '').trim(),
  };
})();
const clientId = () => APP.id;
const available = () => /^\d{15,22}$/.test(APP.id) && !!APP.secret;
// Connect is a choice: nothing talks to Discord until the person asks.
const wanted = () => get('discordConnect', '') === '1';

// ── State out to every window ────────────────────────────────────────────────
function publish(patch) {
  state = { ...state, ...patch };
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send('discord:state', state);
  }
}

// ── Pipe framing ─────────────────────────────────────────────────────────────
function write(op, payload) {
  if (!sock) return;
  const body = Buffer.from(JSON.stringify(payload), 'utf8');
  const head = Buffer.alloc(8);
  head.writeInt32LE(op, 0);
  head.writeInt32LE(body.length, 4);
  sock.write(Buffer.concat([head, body]));
}

function request(cmd, args = {}, evt) {
  return new Promise((resolve, reject) => {
    const nonce = crypto.randomUUID();
    const timer = setTimeout(() => { pending.delete(nonce); reject(new Error('timeout')); }, cmd === 'AUTHORIZE' ? 120000 : 10000);
    pending.set(nonce, { resolve, reject, timer });
    write(OP.FRAME, evt ? { cmd, args, evt, nonce } : { cmd, args, nonce });
  });
}
const subscribe = (evt, args = {}) => request('SUBSCRIBE', args, evt).catch(() => {});
const unsubscribe = (evt, args = {}) => request('UNSUBSCRIBE', args, evt).catch(() => {});

function onData(chunk) {
  buf = Buffer.concat([buf, chunk]);
  while (buf.length >= 8) {
    const op = buf.readInt32LE(0);
    const len = buf.readInt32LE(4);
    if (buf.length < 8 + len) return;
    const body = buf.subarray(8, 8 + len).toString('utf8');
    buf = buf.subarray(8 + len);
    let msg = null;
    try { msg = JSON.parse(body); } catch { continue; }
    if (op === OP.PING) { write(OP.PONG, msg); continue; }
    if (op === OP.CLOSE) { fail(msg && msg.message ? msg.message : 'Discord closed the connection.'); continue; }
    handle(msg);
  }
}

function handle(msg) {
  if (msg.nonce && pending.has(msg.nonce)) {
    const p = pending.get(msg.nonce);
    pending.delete(msg.nonce);
    clearTimeout(p.timer);
    if (msg.evt === 'ERROR') p.reject(new Error(msg.data && msg.data.message ? msg.data.message : 'Discord refused.'));
    else p.resolve(msg.data);
    return;
  }
  if (msg.cmd !== 'DISPATCH') return;
  const d = msg.data || {};
  switch (msg.evt) {
    case 'READY': void signIn(); break;
    case 'VOICE_CHANNEL_SELECT': void loadChannel(); break;
    case 'VOICE_SETTINGS_UPDATE': publish({ self: { mute: !!d.mute, deaf: !!d.deaf } }); break;
    case 'SPEAKING_START':
    case 'SPEAKING_STOP': {
      const talking = msg.evt === 'SPEAKING_START';
      publish({ members: state.members.map((m) => (m.id === d.user_id ? { ...m, speaking: talking } : m)) });
      break;
    }
    case 'VOICE_STATE_CREATE':
    case 'VOICE_STATE_UPDATE': {
      const m = member(d);
      const rest = state.members.filter((x) => x.id !== m.id);
      const old = state.members.find((x) => x.id === m.id);
      publish({ members: [...rest, { ...m, speaking: old ? old.speaking : false }].sort(byName) });
      break;
    }
    case 'VOICE_STATE_DELETE': {
      const id = d.user && d.user.id;
      publish({ members: state.members.filter((x) => x.id !== id) });
      break;
    }
  }
}

function member(vs) {
  const u = vs.user || {};
  const v = vs.voice_state || {};
  return {
    id: u.id,
    name: vs.nick || u.global_name || u.username || 'Someone',
    avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64` : '',
    mute: !!(v.mute || v.self_mute || vs.mute),
    deaf: !!(v.deaf || v.self_deaf),
    speaking: false,
  };
}
const byName = (a, b) => a.name.localeCompare(b.name);

// ── Sign in: refresh token first, the approval prompt only when needed ──────
async function token(params) {
  const secret = APP.secret;
  if (!secret) throw new Error('Discord is not available in this build.');
  const body = new URLSearchParams({ client_id: clientId(), client_secret: secret, redirect_uri: REDIRECT, ...params });
  const res = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) throw new Error(json.error_description || 'Discord did not accept the app details.');
  if (json.refresh_token) putSecret('discordRefresh', json.refresh_token);
  return json.access_token;
}

async function signIn() {
  try {
    let access = '';
    const refresh = readSecret('discordRefresh');
    if (refresh) access = await token({ grant_type: 'refresh_token', refresh_token: refresh }).catch(() => '');
    if (!access) {
      publish({ status: 'authorize', error: '' });
      const { code } = await request('AUTHORIZE', { client_id: clientId(), scopes: SCOPES });
      access = await token({ grant_type: 'authorization_code', code });
    }
    const auth = await request('AUTHENTICATE', { access_token: access });
    const u = auth.user || {};
    publish({ status: 'ready', error: '', user: { id: u.id, name: u.global_name || u.username || 'You' } });
    await subscribe('VOICE_CHANNEL_SELECT');
    await subscribe('VOICE_SETTINGS_UPDATE');
    const vs = await request('GET_VOICE_SETTINGS').catch(() => null);
    if (vs) publish({ self: { mute: !!vs.mute, deaf: !!vs.deaf } });
    await loadChannel();
  } catch (e) {
    const text = String(e && e.message || e);
    // A cancelled approval or wrong details: forget the token so the next try asks again.
    if (/invalid|unauthor|denied|cancel|secret|accept/i.test(text)) putSecret('discordRefresh', '');
    fail(text);
  }
}

async function loadChannel() {
  const ch = await request('GET_SELECTED_VOICE_CHANNEL').catch(() => null);
  const id = ch && ch.id;
  if (channelSubs && channelSubs !== id) {
    for (const evt of ['SPEAKING_START', 'SPEAKING_STOP', 'VOICE_STATE_CREATE', 'VOICE_STATE_UPDATE', 'VOICE_STATE_DELETE']) {
      void unsubscribe(evt, { channel_id: channelSubs });
    }
    channelSubs = null;
  }
  if (!id) { publish({ channel: null, members: [] }); return; }
  let guild = '';
  if (ch.guild_id) {
    const g = await request('GET_GUILD', { guild_id: ch.guild_id }).catch(() => null);
    guild = g && g.name ? g.name : '';
  }
  publish({
    channel: { id, name: ch.name || (ch.type === 3 ? 'Group call' : 'Call'), guild: guild || (ch.guild_id ? '' : 'Direct call') },
    members: (ch.voice_states || []).map(member).sort(byName),
  });
  if (channelSubs !== id) {
    channelSubs = id;
    for (const evt of ['SPEAKING_START', 'SPEAKING_STOP', 'VOICE_STATE_CREATE', 'VOICE_STATE_UPDATE', 'VOICE_STATE_DELETE']) {
      await subscribe(evt, { channel_id: id });
    }
  }
}

// ── Connection ───────────────────────────────────────────────────────────────
function fail(message) {
  close();
  // A wrong Client ID will never work on retry: back to setup with a clear line.
  if (/client.?id/i.test(message)) {
    publish({ ...blank(), status: 'unavailable', error: 'Discord did not accept this build of Overlay.' });
    return;
  }
  publish({ status: 'error', error: message, channel: null, members: [] });
  schedule();
}

function close() {
  for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error('closed')); }
  pending = new Map();
  channelSubs = null;
  buf = Buffer.alloc(0);
  if (sock) { sock.removeAllListeners(); sock.destroy(); sock = null; }
}

function schedule() {
  clearTimeout(retry);
  if (!stopped && available() && wanted()) retry = setTimeout(connect, RETRY_MS);
}

function tryPipe(n) {
  return new Promise((resolve) => {
    const s = net.createConnection(`\\\\?\\pipe\\discord-ipc-${n}`);
    s.once('connect', () => resolve(s));
    s.once('error', () => resolve(null));
  });
}

async function connect() {
  clearTimeout(retry);
  close();
  if (!available()) { publish({ ...blank(), status: 'unavailable' }); return; }
  if (!wanted()) { publish({ ...blank(), status: 'setup' }); return; }
  publish({ status: 'connecting', error: '' });
  for (let n = 0; n < 10; n++) {
    const s = await tryPipe(n);
    if (!s) continue;
    sock = s;
    sock.on('data', onData);
    sock.on('close', () => { if (sock === s) { sock = null; publish({ status: 'closed', channel: null, members: [] }); schedule(); } });
    sock.on('error', () => {});
    write(OP.HANDSHAKE, { v: 1, client_id: clientId() });
    return;
  }
  publish({ status: 'closed', channel: null, members: [] });
  schedule();
}

function init() {
  ipcMain.handle('discord:state', () => state);
  // One click: remember the choice and connect; Discord shows its own approval.
  ipcMain.handle('discord:connect', () => {
    if (!available()) return { ok: false, error: 'Discord is not available in this build.' };
    set('discordConnect', '1');
    void connect();
    return { ok: true };
  });
  ipcMain.handle('discord:forget', () => {
    set('discordConnect', '');
    putSecret('discordRefresh', '');
    close();
    publish(available() ? blank() : { ...blank(), status: 'unavailable' });
    return true;
  });
  ipcMain.handle('discord:retry', () => { void connect(); return true; });
  ipcMain.handle('discord:mute', () => request('SET_VOICE_SETTINGS', { mute: !state.self.mute }).then((d) => { publish({ self: { mute: !!d.mute, deaf: !!d.deaf } }); return true; }).catch(() => false));
  ipcMain.handle('discord:deaf', () => request('SET_VOICE_SETTINGS', { deaf: !state.self.deaf }).then((d) => { publish({ self: { mute: !!d.mute, deaf: !!d.deaf } }); return true; }).catch(() => false));
  ipcMain.handle('discord:leave', () => request('SELECT_VOICE_CHANNEL', { channel_id: null, force: true }).then(() => { publish({ channel: null, members: [] }); return true; }).catch(() => false));
  void connect();
}

function stop() {
  stopped = true;
  clearTimeout(retry);
  close();
}

module.exports = { init, stop };
