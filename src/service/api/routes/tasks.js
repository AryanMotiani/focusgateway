'use strict';

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../auth/middleware');

let tasks = [];

router.get('/', requireAuth, (req, res) => {
  res.json(tasks);
});

router.post('/', requireAuth, (req, res) => {
  const { title, deadline, parent_task_id, priority } = req.body;

  if (parent_task_id) {
    const parent = tasks.find(t => t.id === parent_task_id);
    if (parent) {
      if (new Date(deadline) > new Date(parent.deadline)) {
        return res.status(400).json({ error: 'DEADLINE_AFTER_PARENT', message: 'Subtask deadline cannot exceed parent deadline' });
      }
    }
  }

  const newTask = {
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

router.patch('/:id', requireAuth, (req, res) => {
  const task = tasks.find(t => t.id === parseInt(req.params.id, 10));
  if (!task) return res.status(404).json({ error: 'NOT_FOUND' });

  const { deadline, reason, status } = req.body;

  // Type-to-confirm reason check on deadline extension or cancellation
  if (deadline && new Date(deadline) > new Date(task.deadline) && !reason) {
    return res.status(400).json({ error: 'REASON_REQUIRED', action: 'deadline_extension' });
  }

  if (status === 'cancelled' && !reason) {
    return res.status(400).json({ error: 'REASON_REQUIRED', action: 'task_cancellation' });
  }

  Object.assign(task, req.body);
  res.json(task);
});

router.post('/:id/forward', requireAuth, (req, res) => {
  const task = tasks.find(t => t.id === parseInt(req.params.id, 10));
  if (!task) return res.status(404).json({ error: 'NOT_FOUND' });

  const maxForwards = task.priority === 'high' ? 1 : task.priority === 'medium' ? 3 : 5;

  if (task.forward_count >= maxForwards) {
    return res.status(400).json({ error: 'FORWARD_LIMIT_REACHED', forward_count: task.forward_count, max_forwards: maxForwards });
  }

  task.forward_count += 1;
  res.json({ forward_count: task.forward_count, max_forwards: maxForwards });
});

module.exports = router;
