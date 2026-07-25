import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export interface AppConfig {
  appDir: string;
  dbPath: string;
  jwtSecret: string;
  port: number;
}

let cachedConfig: AppConfig | null = null;

export function getAppDataDir(): string {
  if (process.env.NODE_ENV === 'test') {
    const testDir = path.join(__dirname, '../.test_appdata');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    return testDir;
  }

  let baseDir: string;
  if (process.platform === 'win32') {
    baseDir = process.env.APPDATA || path.join(process.env.USERPROFILE || 'C:\\', 'AppData', 'Roaming');
  } else if (process.platform === 'darwin') {
    baseDir = path.join(process.env.HOME || '/tmp', 'Library', 'Application Support');
  } else {
    baseDir = process.env.XDG_CONFIG_HOME || path.join(process.env.HOME || '/tmp', '.config');
  }

  const appDir = path.join(baseDir, 'FocusGateway');
  if (!fs.existsSync(appDir)) {
    fs.mkdirSync(appDir, { recursive: true });
  }

  return appDir;
}

export function getAppConfig(): AppConfig {
  if (cachedConfig && process.env.NODE_ENV !== 'test') {
    return cachedConfig;
  }

  const appDir = getAppDataDir();
  const configPath = path.join(appDir, 'config.json');

  let config: Record<string, string> = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
      config = {};
    }
  }

  let updated = false;

  if (!config.jwt_secret) {
    config.jwt_secret = crypto.randomBytes(32).toString('hex');
    updated = true;
  }

  if (updated) {
    try {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    } catch {}
  }

  cachedConfig = {
    appDir,
    dbPath: process.env.DB_PATH || path.join(appDir, 'focusgateway.db'),
    jwtSecret: process.env.JWT_SECRET || config.jwt_secret,
    port: parseInt(process.env.SERVICE_PORT || '7000', 10),
  };

  return cachedConfig;
}
