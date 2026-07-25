'use strict';

const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../../auth/middleware');

// In-memory mock store for API contract implementation
let rules = [
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

router.get('/', requireAuth, (req, res) => {
  res.json(rules);
});

router.post('/', requireAuth, (req, res) => {
  const { mode, window_start, window_end, sites, task_ids } = req.body;

  if (mode === 'task_gated' && (!task_ids || task_ids.length === 0)) {
    return res.status(400).json({ error: 'EMPTY_TASK_POOL', message: 'Task-gated rule requires >=1 task' });
  }

  // Conflict check mock
  const conflict = rules.find(r => r.window_start === window_start && r.is_active);
  if (conflict) {
    return res.status(409).json({ error: 'CONFLICT', conflicting_rule_id: conflict.id });
  }

  const newRule = { id: rules.length + 1, ...req.body, is_currently_live: false, is_active: true };
  rules.push(newRule);
  res.status(201).json(newRule);
});

router.patch('/:id', requireAuth, (req, res) => {
  const rule = rules.find(r => r.id === parseInt(req.params.id, 10));
  if (!rule) return res.status(404).json({ error: 'NOT_FOUND' });

  if (rule.is_currently_live && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'REQUIRES_ADMIN', message: 'Active rule edit requires PIN admin role' });
  }

  Object.assign(rule, req.body);
  res.json(rule);
});

router.delete('/:id', requireAdmin, (req, res) => {
  const index = rules.findIndex(r => r.id === parseInt(req.params.id, 10));
  if (index === -1) return res.status(404).json({ error: 'NOT_FOUND' });

  rules.splice(index, 1);
  res.status(204).end();
});

module.exports = router;
