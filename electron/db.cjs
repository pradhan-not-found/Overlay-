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
  updateStats
};
