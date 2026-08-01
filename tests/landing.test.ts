import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createLandingApp } from '../landing/server/index';
import { runHelloScript } from '../landing/scripts/hello';

describe('Ticket 7 — Landing Page Technical Spec Unit & API Tests (TypeScript)', () => {
  let app: any;

  beforeAll(() => {
    app = createLandingApp();
  });

  test('runHelloScript returns startup entry', () => {
    const entry = runHelloScript();
    expect(entry.message).toBe('Hello from FocusGateway Landing Server');
    expect(entry.started_at).toBeDefined();
  });

  test('GET /api/features loads features.json data', async () => {
    const res = await request(app).get('/api/features');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(6);
    expect(res.body[0].title).toBe('Smart Site Blocking');
  });

  test('POST /api/waitlist validates email format', async () => {
    const invalidRes = await request(app)
      .post('/api/waitlist')
      .send({ email: 'invalid-email' });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.error).toBe('INVALID_EMAIL');

    const validRes = await request(app)
      .post('/api/waitlist')
      .send({ email: 'student@university.edu', name: 'Alex' });

    expect(validRes.status).toBe(201);
    expect(validRes.body.ok).toBe(true);
  });

  test('GET /api/globe-data returns country centroid coordinates', async () => {
    const res = await request(app).get('/api/globe-data');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].country).toBeDefined();
    expect(res.body[0].lat).toBeDefined();
    expect(res.body[0].lon).toBeDefined();
  });
});
