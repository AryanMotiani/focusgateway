import sqlite3 from 'sqlite3';
import { getAppConfig } from '../config';

const sqliteVerbose = sqlite3.verbose();
let dbInstance: sqlite3.Database | null = null;

export function getDb(customPath?: string): Promise<sqlite3.Database> {
  if (dbInstance) return Promise.resolve(dbInstance);

  const config = getAppConfig();
  const dbPath = customPath || config.dbPath;

  return new Promise((resolve, reject) => {
    const db = new sqliteVerbose.Database(dbPath, (err) => {
      if (err) return reject(err);

      db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
        if (pragmaErr) return reject(pragmaErr);
        dbInstance = db;
        resolve(db);
      });
    });
  });
}

export async function queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows as T[]);
    });
  });
}

export interface RunResult {
  lastID: number;
  changes: number;
}

export async function run(sql: string, params: any[] = []): Promise<RunResult> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(this: any, err: Error | null) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function closeDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!dbInstance) return resolve();
    dbInstance.close((err) => {
      dbInstance = null;
      if (err) return reject(err);
      resolve();
    });
  });
}
