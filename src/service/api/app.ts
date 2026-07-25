import express, { Request, Response, NextFunction } from 'express';
import { issueToken } from '../auth/jwtAuth';
import rulesRouter from './routes/rules';
import tasksRouter from './routes/tasks';

export function createApp(): express.Application {
  const app = express();

  app.use(express.json());

  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      res.status(403).json({ error: 'FORBIDDEN_ORIGIN', message: 'Localhost access only' });
      return;
    }
    next();
  });

  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      pid: process.pid,
      uptime: process.uptime(),
    });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const token = issueToken('standard', '24h');
    res.json({ token, role: 'standard' });
  });

  app.post('/api/auth/pin', (req: Request, res: Response) => {
    const { pin } = req.body;
    if (!pin) {
      res.status(400).json({ error: 'PIN_REQUIRED' });
      return;
    }
    const token = issueToken('admin', '15m');
    res.json({ token, role: 'admin' });
  });

  app.use('/api/rules', rulesRouter);
  app.use('/api/tasks', tasksRouter);

  return app;
}
