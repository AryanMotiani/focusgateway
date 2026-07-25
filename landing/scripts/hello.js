'use strict';

const fs = require('fs');
const path = require('path');

function runHelloScript() {
  const logDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logEntry = {
    message: 'Hello from FocusGateway Landing Server',
    started_at: new Date().toISOString(),
    node_version: process.version,
  };

  const logPath = path.join(logDir, 'startup.json');
  fs.writeFileSync(logPath, JSON.stringify(logEntry, null, 2), 'utf8');

  console.log('Hello from FocusGateway Landing Server!');
  return logEntry;
}

if (require.main === module) {
  runHelloScript();
}

module.exports = { runHelloScript };
