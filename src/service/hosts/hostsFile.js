'use strict';

const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const os = require('os');

const MARKER_BEGIN = '# FocusGateway BEGIN — do not edit this block manually';
const MARKER_END   = '# FocusGateway END';

/**
 * Platform-specific hosts file path.
 * @returns {string}
 */
function getHostsPath() {
  if (process.platform === 'win32') {
    const windir = process.env.WINDIR || 'C:\\Windows';
    return path.join(windir, 'System32', 'drivers', 'etc', 'hosts');
  }
  return '/etc/hosts';
}

/**
 * Reads hosts file content.
 * @param {string} [customPath]
 * @returns {Promise<string>}
 */
async function readHostsFile(customPath) {
  const filePath = customPath || getHostsPath();
  return fs.readFile(filePath, 'utf8');
}

/**
 * Extracts user-defined lines (preserving anything outside FocusGateway markers).
 * @param {string} content
 * @returns {string[]}
 */
function extractUserLines(content) {
  const lines = content.split(/\r?\n/);
  let inside = false;
  const result = [];

  for (const line of lines) {
    if (line.includes(MARKER_BEGIN)) {
      inside = true;
      continue;
    }
    if (line.includes(MARKER_END)) {
      inside = false;
      continue;
    }
    if (!inside) {
      result.push(line);
    }
  }

  return result;
}

/**
 * Builds FocusGateway block string from a domain list.
 * @param {string[]} domains
 * @returns {string}
 */
function buildBlock(domains = []) {
  if (!domains.length) return '';

  const lines = [MARKER_BEGIN];
  const uniqueDomains = Array.from(new Set(domains.map(d => d.toLowerCase().trim())));

  for (const domain of uniqueDomains) {
    lines.push(`127.0.0.1 ${domain}`);
  }

  lines.push(MARKER_END);
  return lines.join('\n');
}

/**
 * Performs atomic write to hosts file using temp file rename pattern.
 * @param {string} newContent
 * @param {string} [customPath]
 * @returns {Promise<void>}
 */
async function atomicWrite(newContent, customPath) {
  const targetPath = customPath || getHostsPath();
  const tmpPath = targetPath + '.fg-tmp';

  await fs.writeFile(tmpPath, newContent, 'utf8');

  try {
    const fh = await fs.open(tmpPath, 'r+');
    await fh.sync();
    await fh.close();
  } catch (err) {
    // Ignore sync errors if platform unsupported in test mocks
  }

  await fs.rename(tmpPath, targetPath);
}

/**
 * Clears FocusGateway block from hosts file.
 * @param {string} [customPath]
 * @returns {Promise<void>}
 */
async function clearBlock(customPath) {
  const filePath = customPath || getHostsPath();
  const raw = await readHostsFile(filePath);
  const userLines = extractUserLines(raw);
  const cleanContent = userLines.join('\n');
  await atomicWrite(cleanContent, filePath);
}

/**
 * Saves a backup copy of current hosts file to app-data / designated path.
 * @param {string} backupDir
 * @param {string} [customHostsPath]
 * @returns {Promise<string>} Backup filepath
 */
async function backupHostsFile(backupDir, customHostsPath) {
  const hostsPath = customHostsPath || getHostsPath();
  const raw = await readHostsFile(hostsPath);
  if (!fsSync.existsSync(backupDir)) {
    fsSync.mkdirSync(backupDir, { recursive: true });
  }
  const target = path.join(backupDir, 'hosts.backup');
  await fs.writeFile(target, raw, 'utf8');
  return target;
}

module.exports = {
  MARKER_BEGIN,
  MARKER_END,
  getHostsPath,
  readHostsFile,
  extractUserLines,
  buildBlock,
  atomicWrite,
  clearBlock,
  backupHostsFile,
};
