const Joi = require('joi');
const { DateTime } = require('luxon');

const PRIORITY = ['low', 'medium', 'high'];
const KANBAN_STATUS = ['todo', 'inprogress', 'done'];
const STATUS = ['pending', 'completed'];
const RECURRENCE = ['none', 'daily', 'weekly', 'monthly'];
const dueDate = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).custom((value, helpers) => {
  if (!DateTime.fromISO(value, { zone: 'UTC' }).isValid) return helpers.error('any.invalid');
  return value;
}).allow(null);
const project = Joi.string().max(100).trim().allow('', null);
const consistentStatus = (value, helpers) => {
  if (value.status && value.kanban_status && (value.status === 'completed') !== (value.kanban_status === 'done')) {
    return helpers.error('any.invalid');
  }
  return value;
};

const createTask = Joi.object({
  title: Joi.string().min(1).max(255).trim().required(),
  description: Joi.string().allow('', null),
  due_date: dueDate,
  priority: Joi.string().valid(...PRIORITY).default('medium'),
  kanban_status: Joi.string().valid(...KANBAN_STATUS).default('todo'),
  project,
  recurrence: Joi.string().valid(...RECURRENCE).default('none'),
});
const updateTask = Joi.object({
  title: Joi.string().min(1).max(255).trim(),
  description: Joi.string().allow('', null),
  status: Joi.string().valid(...STATUS),
  due_date: dueDate,
  priority: Joi.string().valid(...PRIORITY),
  kanban_status: Joi.string().valid(...KANBAN_STATUS),
  project,
  recurrence: Joi.string().valid(...RECURRENCE),
}).min(1).custom(consistentStatus).messages({ 'any.invalid': 'Status and board column must agree.' });
const listTasks = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid(...STATUS),
  priority: Joi.string().valid(...PRIORITY),
  project: Joi.string().max(100).trim(),
});

module.exports = { createTask, updateTask, listTasks };
