#!/usr/bin/env node
'use strict';

/**
 * FocusGateway Emergency Recovery Script
 * Zero external dependencies.
 * Restores hosts file by removing FocusGateway blocks when background service is unreachable/crashed.
 */

const fs   = require('fs');
const http = require('http');
const path = require('path');

const HEALTH_URL  = 'http://localhost:7000/api/health';
const HOSTS_PATHS = {
  win32:  'C:\\Windows\\System32\\drivers\\etc\\hosts',
  darwin: '/etc/hosts',
  linux:  '/etc/hosts',
};

const MARKER_BEGIN = '# FocusGateway BEGIN — do not edit this block manually';
const MARKER_END   = '# FocusGateway END';

function getHostsPath() {
  return HOSTS_PATHS[process.platform] || '/etc/hosts';
}

function isServiceRunning() {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_URL, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function cleanHostsContent(content) {
  const lines = content.split(/\r?\n/);
  let inside = false;
  const cleaned = [];

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
      cleaned.push(line);
    }
  }

  return cleaned.join('\n');
}

async function runRecovery(customPath) {
  const hostsPath = customPath || getHostsPath();
  const running = await isServiceRunning();

  if (running) {
    return {
      success: false,
      refused: true,
      message: 'Service is running normally. Emergency recovery refused.',
    };
  }

  try {
    const raw = fs.readFileSync(hostsPath, 'utf8');
    const cleaned = cleanHostsContent(raw);

    const tmpPath = hostsPath + '.fg-recovery-tmp';
    fs.writeFileSync(tmpPath, cleaned, 'utf8');
    fs.renameSync(tmpPath, hostsPath);

    return {
      success: true,
      refused: false,
      message: 'Successfully removed FocusGateway entries from hosts file.',
    };
  } catch (err) {
    return {
      success: false,
      refused: false,
      error: err.message,
    };
  }
}

if (require.main === module) {
  console.log('FocusGateway Emergency Recovery Script');
  runRecovery()
    .then(result => {
      console.log(result.message || result.error);
      process.exit(result.success ? 0 : 1);
    });
}

module.exports = {
  getHostsPath,
  isServiceRunning,
  cleanHostsContent,
  runRecovery,
};
