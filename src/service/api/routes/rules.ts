import express, { Response } from 'express';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../../auth/middleware';

const router = express.Router();

export interface Rule {
  id: number;
  mode: 'hard_block' | 'task_gated';
  label?: string;
  window_start: string;
  window_end: string;
  active_days: string;
  failsafe_enabled: boolean;
  is_active: boolean;
  sites: Array<{ bundle_key?: string; custom_domain?: string }>;
  is_currently_live: boolean;
}

let rules: Rule[] = [
  {
    id: 1,
    mode: 'hard_block',
    label: 'No YouTube during work',
    window_start: '09:00',
    window_end: '17:00',
    active_days: '1,2,3,4,5',
    failsafe_enabled: true,
    is_active: true,
    sites: [{ bundle_key: 'youtube' }],
    is_currently_live: true,
  },
];

function getParamId(req: AuthenticatedRequest): number {
  const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  return parseInt(idStr, 10);
}

router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json(rules);
});

router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { mode, window_start, task_ids } = req.body;

  if (mode === 'task_gated' && (!task_ids || task_ids.length === 0)) {
    res.status(400).json({ error: 'EMPTY_TASK_POOL', message: 'Task-gated rule requires >=1 task' });
    return;
  }

  const conflict = rules.find(r => r.window_start === window_start && r.is_active);
  if (conflict) {
    res.status(409).json({ error: 'CONFLICT', conflicting_rule_id: conflict.id });
    return;
  }

  const newRule: Rule = { id: rules.length + 1, ...req.body, is_currently_live: false, is_active: true };
  rules.push(newRule);
  res.status(201).json(newRule);
});

router.patch('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const ruleId = getParamId(req);
  const rule = rules.find(r => r.id === ruleId);
  if (!rule) {
    res.status(404).json({ error: 'NOT_FOUND' });
    return;
  }

  if (rule.is_currently_live && req.user?.role !== 'admin') {
    res.status(403).json({ error: 'REQUIRES_ADMIN', message: 'Active rule edit requires PIN admin role' });
    return;
  }

  Object.assign(rule, req.body);
  res.json(rule);
});

router.delete('/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const ruleId = getParamId(req);
  const index = rules.findIndex(r => r.id === ruleId);
  if (index === -1) {
    res.status(404).json({ error: 'NOT_FOUND' });
    return;
  }

  rules.splice(index, 1);
  res.status(204).end();
});

export default router;
