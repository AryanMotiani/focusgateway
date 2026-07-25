'use strict';

require('dotenv').config();
const { createApp } = require('./api/app');

const PORT = process.env.SERVICE_PORT || 7000;

function startServer() {
  const app = createApp();

  const server = app.listen(PORT, () => {
    console.log(`[FocusGateway Service] Running on http://localhost:${PORT} (PID: ${process.pid})`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
