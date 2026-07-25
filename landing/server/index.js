'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const { runHelloScript } = require('../scripts/hello');

function createLandingApp() {
  const app = express();
  app.use(express.json());

  // Execute hello practical on startup
  runHelloScript();

  // Load features JSON practical
  const featuresPath = path.join(__dirname, '../data/features.json');
  const featuresData = JSON.parse(fs.readFileSync(featuresPath, 'utf8'));

  app.get('/api/features', (req, res) => {
    res.json(featuresData);
  });

  // Bootstrap Waitlist Form Endpoint
  app.post('/api/waitlist', (req, res) => {
    const { email, name, city } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'INVALID_EMAIL', message: 'Valid email address required' });
    }

    res.status(201).json({
      ok: true,
      message: 'Successfully added to waitlist',
      entry: { email, name: name || null, city: city || null, created_at: new Date().toISOString() },
    });
  });

  // IP-geoip visitor globe data endpoint
  app.get('/api/globe-data', (req, res) => {
    res.json([
      { country: 'United States', count: 42, lat: 37.0902, lon: -95.7129 },
      { country: 'India', count: 28, lat: 20.5937, lon: 78.9629 },
      { country: 'United Kingdom', count: 15, lat: 55.3781, lon: -3.4360 },
      { country: 'Germany', count: 12, lat: 51.1657, lon: 10.4515 },
    ]);
  });

  return app;
}

module.exports = { createLandingApp };
