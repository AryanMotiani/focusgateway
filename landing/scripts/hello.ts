import fs from 'fs';
import path from 'path';

export interface LogEntry {
  message: string;
  started_at: string;
  node_version: string;
}

export function runHelloScript(): LogEntry {
  const logDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logEntry: LogEntry = {
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
