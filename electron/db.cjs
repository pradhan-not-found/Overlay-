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
    )
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

module.exports = {
  initDB,
  getEvents,
  addEvent,
  deleteEvent
};
