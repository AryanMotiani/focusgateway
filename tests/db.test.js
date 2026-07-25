'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const { runMigrations } = require('../src/db/migrate');
const { getDb, queryAll, run, closeDb } = require('../src/db/sqlite');

describe('Ticket 1 — SQLite Embedded Database Unit Tests', () => {
  const testDbPath = path.join(os.tmpdir(), `fg-test-db-${Date.now()}.db`);

  afterAll(async () => {
    await closeDb();
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch {}
    }
  });

  test('runMigrations initializes SQLite tables and default tags', async () => {
    await runMigrations(testDbPath);

    const tags = await queryAll('SELECT * FROM tags WHERE is_default = 1 ORDER BY id ASC;');
    expect(tags.length).toBe(7);
    expect(tags[0].name).toBe('School');
    expect(tags[1].name).toBe('Work');
  });

  test('SQLite module executes queries and inserts cleanly', async () => {
    const insertRes = await run(
      'INSERT INTO tasks (title, priority, deadline) VALUES (?, ?, ?);',
      ['Test Task', 'high', '2026-12-31T23:59:59.000Z']
    );

    expect(insertRes.lastID).toBeGreaterThan(0);

    const tasks = await queryAll('SELECT * FROM tasks WHERE id = ?;', [insertRes.lastID]);
    expect(tasks.length).toBe(1);
    expect(tasks[0].title).toBe('Test Task');
    expect(tasks[0].priority).toBe('high');
  });
});
