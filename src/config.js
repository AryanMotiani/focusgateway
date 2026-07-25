'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

let cachedConfig = null;

/**
 * Resolves the OS-standard app-data directory for FocusGateway.
 * Windows: %APPDATA%\FocusGateway
 * macOS: ~/Library/Application Support/FocusGateway
 * Linux: ~/.config/FocusGateway
 */
function getAppDataDir() {
  if (process.env.NODE_ENV === 'test') {
    const testDir = path.join(__dirname, '../.test_appdata');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    return testDir;
  }

  let baseDir;
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

/**
 * Loads or generates a persistent machine-specific config file (config.json).
 */
function getAppConfig() {
  if (cachedConfig && process.env.NODE_ENV !== 'test') {
    return cachedConfig;
  }

  const appDir = getAppDataDir();
  const configPath = path.join(appDir, 'config.json');

  let config = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
      config = {};
    }
  }

  let updated = false;

  // Auto-generate JWT secret on first launch
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

module.exports = { getAppDataDir, getAppConfig };
