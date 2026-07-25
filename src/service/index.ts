import dotenv from 'dotenv';
import { createApp } from './api/app';
import { getAppConfig } from '../config';

dotenv.config();

const config = getAppConfig();

export function startServer() {
  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(`[FocusGateway Service] Running on http://localhost:${config.port} (PID: ${process.pid})`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}
