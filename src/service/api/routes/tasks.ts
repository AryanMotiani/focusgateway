import express, { Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../../auth/middleware';

const router = express.Router();

export interface Task {
  id: number;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'complete' | 'cancelled';
  forward_count: number;
  deadline: string;
  timer_seconds: number;
  parent_task_id: number | null;
  created_at: string;
}

let tasks: Task[] = [];

function getParamId(req: AuthenticatedRequest): number {
  const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  return parseInt(idStr, 10);
}

router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json(tasks);
});

router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { title, deadline, parent_task_id, priority } = req.body;

  if (parent_task_id) {
    const parent = tasks.find(t => t.id === parent_task_id);
    if (parent) {
      if (new Date(deadline) > new Date(parent.deadline)) {
        res.status(400).json({ error: 'DEADLINE_AFTER_PARENT', message: 'Subtask deadline cannot exceed parent deadline' });
        return;
      }
    }
  }

  const newTask: Task = {
    id: tasks.length + 1,
    title,
    priority: priority || 'medium',
    status: 'pending',
    forward_count: 0,
    deadline: deadline || new Date(Date.now() + 86400000).toISOString(),
    timer_seconds: 0,
    parent_task_id: parent_task_id || null,
    created_at: new Date().toISOString(),
  };

  tasks.push(newTask);
  res.status(201).json(newTask);
});

router.patch('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const taskId = getParamId(req);
  const task = tasks.find(t => t.id === taskId);
  if (!task) {
    res.status(404).json({ error: 'NOT_FOUND' });
    return;
  }

  const { deadline, reason, status } = req.body;

  if (deadline && new Date(deadline) > new Date(task.deadline) && !reason) {
    res.status(400).json({ error: 'REASON_REQUIRED', action: 'deadline_extension' });
    return;
  }

  if (status === 'cancelled' && !reason) {
    res.status(400).json({ error: 'REASON_REQUIRED', action: 'task_cancellation' });
    return;
  }

  Object.assign(task, req.body);
  res.json(task);
});

router.post('/:id/forward', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const taskId = getParamId(req);
  const task = tasks.find(t => t.id === taskId);
  if (!task) {
    res.status(404).json({ error: 'NOT_FOUND' });
    return;
  }

  const maxForwards = task.priority === 'high' ? 1 : task.priority === 'medium' ? 3 : 5;

  if (task.forward_count >= maxForwards) {
    res.status(400).json({ error: 'FORWARD_LIMIT_REACHED', forward_count: task.forward_count, max_forwards: maxForwards });
    return;
  }

  task.forward_count += 1;
  res.json({ forward_count: task.forward_count, max_forwards: maxForwards });
});

export default router;
