import request from 'supertest';
import { createApp } from '../src/service/api/app';

describe('Ticket 3 — API Contract Integration Tests (TypeScript)', () => {
  let app: any;
  let standardToken: string;
  let adminToken: string;

  beforeAll(async () => {
    app = createApp();

    const loginRes = await request(app).post('/api/auth/login');
    standardToken = loginRes.body.token;

    const pinRes = await request(app).post('/api/auth/pin').send({ pin: '1234' });
    adminToken = pinRes.body.token;
  });

  test('GET /api/health responds with PID and uptime', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.pid).toBe('number');
  });

  test('POST /api/rules creates a rule', async () => {
    const res = await request(app)
      .post('/api/rules')
      .set('Authorization', `Bearer ${standardToken}`)
      .send({
        mode: 'hard_block',
        window_start: '10:00',
        window_end: '12:00',
        active_days: '1,2,3',
        sites: [{ bundle_key: 'twitter' }],
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });

  test('POST /api/rules rejects empty task pool for task_gated mode', async () => {
    const res = await request(app)
      .post('/api/rules')
      .set('Authorization', `Bearer ${standardToken}`)
      .send({
        mode: 'task_gated',
        window_start: '14:00',
        window_end: '16:00',
        active_days: '1,2,3',
        sites: [{ bundle_key: 'reddit' }],
        task_ids: [],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('EMPTY_TASK_POOL');
  });

  test('PATCH /api/rules/:id blocks non-admin edits on live rules', async () => {
    const res = await request(app)
      .patch('/api/rules/1')
      .set('Authorization', `Bearer ${standardToken}`)
      .send({ label: 'Unauthorized change' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('REQUIRES_ADMIN');
  });

  test('POST /api/tasks creates task and subtask with deadline validation', async () => {
    const parentRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${standardToken}`)
      .send({
        title: 'Parent Task',
        deadline: '2026-12-31T23:59:59.000Z',
      });

    expect(parentRes.status).toBe(201);
    const parentId = parentRes.body.id;

    const invalidSubtaskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${standardToken}`)
      .send({
        title: 'Subtask Too Late',
        parent_task_id: parentId,
        deadline: '2027-01-01T00:00:00.000Z',
      });

    expect(invalidSubtaskRes.status).toBe(400);
    expect(invalidSubtaskRes.text).toContain('DEADLINE_AFTER_PARENT');
  });
});
