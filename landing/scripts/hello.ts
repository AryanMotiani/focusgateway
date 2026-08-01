export interface LogEntry {
  message: string;
  started_at: string;
  node_version: string;
}

export function runHelloScript(): LogEntry {
  return {
    message: 'Hello from FocusGateway Landing Server',
    started_at: new Date().toISOString(),
    node_version: process.version,
  };
}

if (require.main === module) {
  runHelloScript();
}
