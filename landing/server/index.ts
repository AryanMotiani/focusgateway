import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { runHelloScript } from '../scripts/hello';

export function createLandingApp(): express.Application {
  const app = express();
  app.use(express.json());

  runHelloScript();

  const featuresPath = path.join(__dirname, '../data/features.json');
  const featuresData = JSON.parse(fs.readFileSync(featuresPath, 'utf8'));

  app.get('/api/features', (req: Request, res: Response) => {
    res.json(featuresData);
  });

  app.post('/api/waitlist', (req: Request, res: Response) => {
    const { email, name, city } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'INVALID_EMAIL', message: 'Valid email address required' });
      return;
    }

    res.status(201).json({
      ok: true,
      message: 'Successfully added to waitlist',
      entry: { email, name: name || null, city: city || null, created_at: new Date().toISOString() },
    });
  });

  app.get('/api/globe-data', (req: Request, res: Response) => {
    res.json([
      { country: 'United States', count: 42, lat: 37.0902, lon: -95.7129 },
      { country: 'India', count: 28, lat: 20.5937, lon: 78.9629 },
      { country: 'United Kingdom', count: 15, lat: 55.3781, lon: -3.4360 },
      { country: 'Germany', count: 51.1657, lon: 10.4515 },
    ]);
  });

  return app;
}
