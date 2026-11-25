'use strict';

const { ipcMain, desktopCapturer, dialog, shell, safeStorage, session } = require('electron');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const db = require('./db.cjs');

const dayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function ps(script) {
  return new Promise((resolve) => {
    execFile('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, timeout: 8000 }, (err, stdout) => {
      resolve(err ? '' : String(stdout || '').trim());
    });
  });
}

function pictures() {
  const home = os.homedir();
  return path.join(home, 'Pictures');
}

function shotDir() {
  const dir = path.join(pictures(), 'Overlay');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function recDir() {
  const dir = path.join(os.homedir(), 'Music', 'Overlay');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function foreground() {
  const name = await ps(`
$sig = '[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint proc);'
Add-Type -Namespace OvFg -Name Win -MemberDefinition $sig
$hwnd = [OvFg.Win]::GetForegroundWindow()
$proc = [uint32]0
[void][OvFg.Win]::GetWindowThreadProcessId($hwnd, [ref]$proc)
if ($proc -eq 0) { '' } else { (Get-Process -Id $proc -ErrorAction SilentlyContinue).ProcessName }
`);
  return name.split(/\r?\n/).pop().trim();
}

function addScreen(name, secs) {
  if (!name || secs <= 0 || secs > 120) return;
  const key = `screentime:${dayKey()}`;
  let data = { apps: {}, hour: {} };
  try { data = JSON.parse(db.getSetting(key, '') || '') || data; } catch { /* fresh day */ }
  data.apps = data.apps || {};
  data.hour = data.hour || {};
  data.apps[name] = (data.apps[name] || 0) + secs;
  const hour = String(new Date().getHours());
  data.hour[hour] = (data.hour[hour] || 0) + secs;
  db.setSetting(key, JSON.stringify(data));
}

let lastApp = '';
let lastAt = Date.now();
function sample() {
  const now = Date.now();
  const secs = Math.round((now - lastAt) / 1000);
  const prev = lastApp;
  lastAt = now;
  if (prev) addScreen(prev, secs);
  foreground().then((name) => { lastApp = name || prev; }).catch(() => {});
}

function imagesIn(dir, out, depth) {
  if (depth < 0 || out.length >= 24) return;
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (out.length >= 24) return;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.')) imagesIn(full, out, depth - 1);
    else if (/\.(png|jpe?g|webp|bmp)$/i.test(entry.name)) out.push(full);
  }
}

function seal(text) {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows has no encryption key for this user.');
  return safeStorage.encryptString(String(text)).toString('base64');
}
function open(blob) {
  if (!blob) return '';
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows has no encryption key for this user.');
  return safeStorage.decryptString(Buffer.from(blob, 'base64'));
}

function init() {
  try {
    session.defaultSession.setPermissionRequestHandler((_wc, permission, allow) => {
      allow(permission === 'media' || permission === 'mediaKeySystem' || permission === 'display-capture');
    });
  } catch { /* session not ready */ }

  setInterval(sample, 20_000);
  setTimeout(sample, 4000);

  ipcMain.handle('desk:screen', () => {
    const raw = db.getSetting(`screentime:${dayKey()}`, '');
    try { return raw ? JSON.parse(raw) : { apps: {}, hour: {} }; } catch { return { apps: {}, hour: {} }; }
  });

  ipcMain.handle('desk:shot', async () => {
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } });
    const source = sources[0];
    if (!source) throw new Error('No screen.');
    const file = path.join(shotDir(), `shot-${Date.now()}.png`);
    fs.writeFileSync(file, source.thumbnail.toPNG());
    return file;
  });

  ipcMain.handle('desk:reveal', (_e, file) => {
    if (typeof file === 'string' && fs.existsSync(file)) shell.showItemInFolder(file);
  });

  ipcMain.handle('desk:save-media', (_e, payload) => {
    const name = String(payload?.name || 'clip').replace(/[^\w.\-]+/g, '');
    const buf = Buffer.from(String(payload?.data || ''), 'base64');
    if (!buf.length || buf.length > 80_000_000) throw new Error('That recording is empty or too large.');
    const file = path.join(payload?.kind === 'audio' ? recDir() : shotDir(), name);
    fs.writeFileSync(file, buf);
    return file;
  });

  ipcMain.handle('desk:walls', () => {
    const found = [];
    imagesIn(pictures(), found, 1);
    return found.map((file) => ({ file, name: path.basename(file) }));
  });

  ipcMain.handle('desk:pick-wall', async () => {
    const picked = await dialog.showOpenDialog({
      title: 'Choose a wallpaper',
      properties: ['openFile'],
      filters: [{ name: 'Pictures', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }],
    });
    return picked.canceled ? '' : picked.filePaths[0] || '';
  });

  ipcMain.handle('desk:set-wall', async (_e, file) => {
    const target = path.resolve(String(file || ''));
    if (!target.startsWith(path.parse(target).root) || !fs.existsSync(target)) throw new Error('That picture is not on this PC.');
    const safe = target.replace(/'/g, "''");
    const code = await ps(`
Add-Type -Namespace OvWall -Name Win -MemberDefinition '[DllImport("user32.dll", CharSet=CharSet.Auto)] public static extern int SystemParametersInfo(int a, int b, string c, int d);'
[OvWall.Win]::SystemParametersInfo(20, 0, '${safe}', 3)
`);
    return code;
  });

  ipcMain.handle('desk:quotes', async (_e, symbols) => {
    const list = (Array.isArray(symbols) ? symbols : []).map((s) => String(s).trim().toUpperCase()).filter((s) => /^[A-Z0-9.\-^=]{1,12}$/.test(s)).slice(0, 12);
    if (!list.length) return [];
    const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(list.join(','))}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) throw new Error('Quotes are unavailable.');
    const json = await res.json();
    return (json.quoteResponse?.result || []).map((q) => ({
      symbol: q.symbol,
      name: q.shortName || q.symbol,
      price: q.regularMarketPrice,
      change: q.regularMarketChangePercent,
    }));
  });

  ipcMain.handle('desk:ask', async (_e, payload) => {
    const key = open(db.getSetting('askKey', ''));
    if (!key) return { error: 'key' };
    const base = String(db.getSetting('askBase', 'https://api.openai.com/v1') || 'https://api.openai.com/v1').replace(/\/$/, '');
    const model = String(db.getSetting('askModel', 'gpt-4o-mini') || 'gpt-4o-mini');
    const messages = Array.isArray(payload?.messages) ? payload.messages.slice(-12) : [];
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { error: json.error?.message || 'The model refused the request.' };
    return { text: json.choices?.[0]?.message?.content || '' };
  });

  ipcMain.handle('desk:ask-key', (_e, payload) => {
    const key = String(payload?.key || '').trim();
    if (key) db.setSetting('askKey', seal(key));
    if (payload?.base) db.setSetting('askBase', String(payload.base).trim());
    if (payload?.model) db.setSetting('askModel', String(payload.model).trim());
    return true;
  });

  ipcMain.handle('desk:ask-ready', () => Boolean(db.getSetting('askKey', '')));

  ipcMain.handle('desk:vault-list', () => {
    try { return JSON.parse(db.getSetting('vaultItems', '[]') || '[]').map(({ secret, ...rest }) => rest); } catch { return []; }
  });

  ipcMain.handle('desk:vault-put', (_e, item) => {
    const list = JSON.parse(db.getSetting('vaultItems', '[]') || '[]');
    const next = {
      id: item?.id || Math.random().toString(36).slice(2, 10),
      name: String(item?.name || '').slice(0, 80),
      user: String(item?.user || '').slice(0, 120),
      secret: seal(String(item?.secret || '')),
    };
    const at = list.findIndex((row) => row.id === next.id);
    if (at >= 0) list[at] = next;
    else list.unshift(next);
    db.setSetting('vaultItems', JSON.stringify(list.slice(0, 200)));
    return list.map(({ secret, ...rest }) => rest);
  });

  ipcMain.handle('desk:vault-open', (_e, id) => {
    const list = JSON.parse(db.getSetting('vaultItems', '[]') || '[]');
    const row = list.find((item) => item.id === id);
    return row ? open(row.secret) : '';
  });

  ipcMain.handle('desk:vault-drop', (_e, id) => {
    const list = JSON.parse(db.getSetting('vaultItems', '[]') || '[]').filter((item) => item.id !== id);
    db.setSetting('vaultItems', JSON.stringify(list));
    return list.map(({ secret, ...rest }) => rest);
  });

  ipcMain.handle('desk:notices', () => ps(`
try {
  [Windows.UI.Notifications.Management.UserNotificationListener, Windows.UI.Notifications, ContentType=WindowsRuntime] | Out-Null
  $listener = [Windows.UI.Notifications.Management.UserNotificationListener]::Current
  $access = $listener.RequestAccessAsync().GetAwaiter().GetResult()
  if ($access.ToString() -ne 'Allowed') { Write-Output 'DENIED'; exit }
  $kind = [Windows.UI.Notifications.NotificationKinds]::Toast
  $notes = $listener.GetNotificationsAsync($kind).GetAwaiter().GetResult()
  foreach ($note in $notes) {
    $title = ''
    $body = ''
    foreach ($el in $note.Notification.Visual.GetBinding([Windows.UI.Notifications.KnownNotificationBindings]::ToastGeneric).GetTextElements()) {
      if (-not $title) { $title = $el.Text } else { $body = ($body + ' ' + $el.Text).Trim() }
    }
    $app = $note.AppInfo.DisplayInfo.DisplayName
    Write-Output (($app -replace '\\|','/') + '|' + ($title -replace '\\|','/') + '|' + ($body -replace '\\|','/'))
  }
} catch { Write-Output 'DENIED' }
`));

  ipcMain.handle('desk:agents', () => {
    const root = path.join(os.homedir(), '.cursor', 'projects');
    const found = [];
    let projects = [];
    try { projects = fs.readdirSync(root, { withFileTypes: true }); } catch { return []; }
    for (const project of projects) {
      if (!project.isDirectory()) continue;
      const dir = path.join(root, project.name, 'agent-transcripts');
      let files = [];
      try { files = fs.readdirSync(dir); } catch { continue; }
      for (const file of files) {
        if (!file.endsWith('.jsonl')) continue;
        const full = path.join(dir, file);
        let stat;
        try { stat = fs.statSync(full); } catch { continue; }
        found.push({ project: project.name, file: full, at: stat.mtimeMs });
      }
    }
    found.sort((a, b) => b.at - a.at);
    return found.slice(0, 16);
  });
}

module.exports = { init };
