'use strict';

const fs = require('fs');
const path = require('path');
const { getPool, closePool } = require('./mysql');

/**
 * Executes seed SQL scripts.
 */
async function runSeed() {
  const pool = getPool();
  const seedPath = path.join(__dirname, 'seed.sql');
  const sql = fs.readFileSync(seedPath, 'utf8');

  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    await pool.query(statement);
  }
}

if (require.main === module) {
  runSeed()
    .then(() => {
      console.log('Successfully seeded database default data');
      return closePool();
    })
    .catch(err => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}

module.exports = { runSeed };
