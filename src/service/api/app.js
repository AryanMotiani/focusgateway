'use strict';

const express = require('express');
const { requireAuth, requireAdmin } = require('../auth/middleware');
const { issueToken } = require('../auth/jwtAuth');

function createApp() {
  const app = express();

  app.use(express.json());

  // Localhost CORS security
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      return res.status(403).json({ error: 'FORBIDDEN_ORIGIN', message: 'Localhost access only' });
    }
    next();
  });

  // Health endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      pid: process.pid,
      uptime: process.uptime(),
    });
  });

  // Auth
  app.post('/api/auth/login', (req, res) => {
    const token = issueToken('standard', '24h');
    res.json({ token, role: 'standard' });
  });

  app.post('/api/auth/pin', (req, res) => {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ error: 'PIN_REQUIRED' });
    }
    const token = issueToken('admin', '15m');
    res.json({ token, role: 'admin' });
  });

  // Route modules
  app.use('/api/rules', require('./routes/rules'));
  app.use('/api/tasks', require('./routes/tasks'));

  return app;
}

module.exports = { createApp };
