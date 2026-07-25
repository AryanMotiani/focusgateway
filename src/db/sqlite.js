'use strict';

const sqlite3 = require('sqlite3').verbose();
const { getAppConfig } = require('../config');

let dbInstance = null;

/**
 * Returns the singleton SQLite database connection.
 * @param {string} [customPath]
 * @returns {Promise<sqlite3.Database>}
 */
function getDb(customPath) {
  if (dbInstance) return Promise.resolve(dbInstance);

  const config = getAppConfig();
  const dbPath = customPath || config.dbPath;

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) return reject(err);

      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
        if (pragmaErr) return reject(pragmaErr);
        dbInstance = db;
        resolve(db);
      });
    });
  });
}

/**
 * Execute an SQL query returning all rows.
 * @param {string} sql
 * @param {any[]} [params]
 * @returns {Promise<any[]>}
 */
async function queryAll(sql, params = []) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

/**
 * Execute an SQL statement (INSERT, UPDATE, DELETE, CREATE).
 * @param {string} sql
 * @param {any[]} [params]
 * @returns {Promise<{lastID: number, changes: number}>}
 */
async function run(sql, params = []) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Close SQLite database connection.
 */
function closeDb() {
  return new Promise((resolve, reject) => {
    if (!dbInstance) return resolve();
    dbInstance.close((err) => {
      dbInstance = null;
      if (err) return reject(err);
      resolve();
    });
  });
}

module.exports = { getDb, queryAll, run, closeDb };
