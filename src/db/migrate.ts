import fs from 'fs';
import path from 'path';
import { getDb, closeDb } from './sqlite';

export async function runMigrations(customPath?: string): Promise<boolean> {
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
