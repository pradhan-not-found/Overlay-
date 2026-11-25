const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db;

function initDB() {
  if (db) return db;
  const dbPath = path.join(app.getPath('userData'), 'overlay_db.sqlite');
  db = new Database(dbPath, { verbose: null });

  // Initialize tables
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS shortcuts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      target TEXT NOT NULL,
      iconUrl TEXT,
      icon TEXT
    );
    CREATE TABLE IF NOT EXISTS stats (
      date_key TEXT PRIMARY KEY,
      count INTEGER DEFAULT 0,
      totalSecs INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS laps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_date TEXT NOT NULL,
      lap_num INTEGER NOT NULL,
      split_secs INTEGER NOT NULL,
      elapsed_secs INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ai_usage (
      day TEXT NOT NULL,
      kind TEXT NOT NULL,
      model TEXT NOT NULL,
      input INTEGER NOT NULL DEFAULT 0,
      cache INTEGER NOT NULL DEFAULT 0,
      output INTEGER NOT NULL DEFAULT 0,
      usd REAL NOT NULL DEFAULT 0,
      exact INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (day, kind, model)
    );
    CREATE INDEX IF NOT EXISTS idx_ai_usage_day ON ai_usage(day);
    CREATE TABLE IF NOT EXISTS ai_limits (
      ts INTEGER NOT NULL,
      kind TEXT NOT NULL,
      label TEXT NOT NULL,
      pct REAL NOT NULL,
      resets_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_ai_limits ON ai_limits(kind, label, ts);
  `);
  return db;
}

// ── AI usage history ─────────────────────────────────────────────────────────
// Daily totals per tool and model. A rescan replaces the days it can still see
// in the tool's own logs and keeps older days, so history outlives log rotation.
function storeUsage(kind, rows) {
  if (!rows.length) return;
  const folded = new Map();
  for (const r of rows) {
    const key = `${r.day}|${r.model}`;
    const f = folded.get(key) || { day: r.day, model: r.model, input: 0, cache: 0, output: 0, usd: 0, exact: 1 };
    f.input += r.input; f.cache += r.cache; f.output += r.output; f.usd += r.usd;
    if (!r.exact) f.exact = 0;
    folded.set(key, f);
  }
  const days = [...new Set([...folded.values()].map((f) => f.day))];
  const del = db.prepare('DELETE FROM ai_usage WHERE kind = ? AND day = ?');
  const ins = db.prepare('INSERT INTO ai_usage (day, kind, model, input, cache, output, usd, exact) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  db.transaction(() => {
    for (const d of days) del.run(kind, d);
    for (const f of folded.values()) ins.run(f.day, kind, f.model, Math.round(f.input), Math.round(f.cache), Math.round(f.output), f.usd, f.exact);
  })();
}

function getUsage(sinceDay) {
  return db.prepare('SELECT day, kind, model, input, cache, output, usd, exact FROM ai_usage WHERE day >= ? ORDER BY day').all(sinceDay);
}

function firstUsageDay() {
  const row = db.prepare('SELECT MIN(day) AS d FROM ai_usage').get();
  return row ? row.d : null;
}

// ── Plan limit readings ──────────────────────────────────────────────────────
function storeLimit(kind, label, pct, resetsAt) {
  const last = db.prepare('SELECT ts, pct FROM ai_limits WHERE kind = ? AND label = ? ORDER BY ts DESC LIMIT 1').get(kind, label);
  // Keep a reading when it moves, or every 15 minutes, so the history stays small.
  if (last && Math.abs(last.pct - pct) < 0.5 && Date.now() - last.ts < 15 * 60_000) return;
  db.prepare('INSERT INTO ai_limits (ts, kind, label, pct, resets_at) VALUES (?, ?, ?, ?, ?)').run(Date.now(), kind, label, pct, resetsAt || null);
  db.prepare('DELETE FROM ai_limits WHERE ts < ?').run(Date.now() - 30 * 86_400_000);
}

function getLimits(since) {
  return db.prepare('SELECT ts, kind, label, pct, resets_at FROM ai_limits WHERE ts >= ? ORDER BY ts').all(since);
}

function getEvents() {
  const stmt = db.prepare('SELECT * FROM events');
  return stmt.all();
}

function addEvent(event) {
  const stmt = db.prepare('INSERT INTO events (id, title, date) VALUES (@id, @title, @date)');
  stmt.run(event);
}

function deleteEvent(id) {
  const stmt = db.prepare('DELETE FROM events WHERE id = ?');
  stmt.run(id);
}

function getShortcuts() {
  const stmt = db.prepare('SELECT * FROM shortcuts');
  return stmt.all();
}

function addShortcut(shortcut) {
  const stmt = db.prepare('INSERT OR REPLACE INTO shortcuts (id, name, target, iconUrl, icon) VALUES (@id, @name, @target, @iconUrl, @icon)');
  stmt.run({
    id: shortcut.id || shortcut.name,
    name: shortcut.name,
    target: shortcut.target,
    iconUrl: shortcut.iconUrl || '',
    icon: shortcut.icon || ''
  });
}

function deleteShortcut(id) {
  const stmt = db.prepare('DELETE FROM shortcuts WHERE id = ?');
  stmt.run(id);
}

function clearShortcuts() {
  db.prepare('DELETE FROM shortcuts').run();
}

function getStats() {
  const rows = db.prepare('SELECT * FROM stats').all();
  const stats = {};
  for (const row of rows) {
    stats[row.date_key] = { count: row.count, totalSecs: row.totalSecs };
  }
  return stats;
}

function updateStats(dateKey, count, totalSecs) {
  const stmt = db.prepare('INSERT OR REPLACE INTO stats (date_key, count, totalSecs) VALUES (@date_key, @count, @totalSecs)');
  stmt.run({ date_key: dateKey, count, totalSecs });
}

function addStats(dateKey, count, totalSecs) {
  const existing = db.prepare('SELECT count, totalSecs FROM stats WHERE date_key = ?').get(dateKey);
  if (existing) {
    const newCount = existing.count + count;
    const newSecs = existing.totalSecs + totalSecs;
    db.prepare('UPDATE stats SET count = ?, totalSecs = ? WHERE date_key = ?').run(newCount, newSecs, dateKey);
  } else {
    db.prepare('INSERT INTO stats (date_key, count, totalSecs) VALUES (?, ?, ?)').run(dateKey, count, totalSecs);
  }
}

function getSetting(key, defaultValue = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : defaultValue;
}

function setSetting(key, value) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
}

function addLap(lap) {
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  db.prepare('INSERT INTO laps (session_date, lap_num, split_secs, elapsed_secs) VALUES (?, ?, ?, ?)')
    .run(date, lap.lap_num, lap.split_secs, lap.elapsed_secs);
}

function getLaps(date) {
  return db.prepare('SELECT * FROM laps WHERE session_date = ? ORDER BY lap_num ASC').all(date);
}

function clearLaps(date) {
  db.prepare('DELETE FROM laps WHERE session_date = ?').run(date);
}

module.exports = {
  initDB,
  getEvents,
  addEvent,
  deleteEvent,
  getShortcuts,
  addShortcut,
  deleteShortcut,
  clearShortcuts,
  getStats,
  updateStats,
  addStats,
  getSetting,
  setSetting,
  addLap,
  getLaps,
  clearLaps,
  storeUsage,
  getUsage,
  firstUsageDay,
  storeLimit,
  getLimits
};
