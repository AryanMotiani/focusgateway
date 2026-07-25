'use strict';

const fs = require('fs');
const path = require('path');
const { getDb, closeDb } = require('./sqlite');

/**
 * Runs the SQLite schema migration.
 * @param {string} [customPath]
 * @returns {Promise<boolean>}
 */
async function runMigrations(customPath) {
  const db = await getDb(customPath);
  const schemaPath = path.join(__dirname, 'sqlite_schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) return reject(err);
      resolve(true);
    });
  });
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Successfully applied SQLite schema migrations');
      return closeDb();
    })
    .catch(err => {
      console.error('SQLite migration failed:', err);
      process.exit(1);
    });
}

module.exports = { runMigrations };
