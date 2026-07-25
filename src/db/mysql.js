'use strict';

require('dotenv').config();
const mysql = require('mysql2/promise');

/**
 * Singleton MySQL connection pool.
 * Used by all service modules and migrations.
 */
let pool = null;

/**
 * Returns the shared connection pool, creating it on first call.
 * @returns {import('mysql2/promise').Pool}
 */
function getPool() {
  if (pool) return pool;

  pool = mysql.createPool({
    host:               process.env.DB_HOST     || 'localhost',
    port:               parseInt(process.env.DB_PORT || '3306', 10),
    user:               process.env.DB_USER     || 'root',
    password:           process.env.DB_PASSWORD || '',
    database:           process.env.DB_NAME     || 'focusgateway',
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,
    timezone:           'local',  // reads system clock, no UTC conversion
  });

  return pool;
}

/**
 * Run a single query on the pool.
 * @param {string} sql
 * @param {any[]} [params]
 * @returns {Promise<[any[], any]>}
 */
async function query(sql, params = []) {
  const pool = getPool();
  return pool.execute(sql, params);
}

/**
 * Close the pool (graceful shutdown).
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { getPool, query, closePool };
