const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db;

function initDB() {
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
  `);
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
  clearLaps
};
