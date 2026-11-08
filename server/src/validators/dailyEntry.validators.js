const Joi = require('joi');
const { DateTime } = require('luxon');

const localDate = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).custom((value, helpers) => {
  const parsed = DateTime.fromISO(value, { zone: 'UTC' });
  return parsed.isValid && parsed.toISODate() === value ? value : helpers.error('any.invalid');
});

const dateParam = Joi.object({ date: localDate.required() });
const listQuery = Joi.object({ from: localDate.required(), to: localDate.required() }).custom((value, helpers) => {
  const days = DateTime.fromISO(value.to).diff(DateTime.fromISO(value.from), 'days').days;
  return days >= 0 && days <= 365 ? value : helpers.error('any.invalid');
}).messages({ 'any.invalid': 'Choose a date range of at most 366 days.' });
const saveEntry = Joi.object({
  journal_text: Joi.string().max(20000).allow('').default(''),
  reflection_text: Joi.string().max(20000).allow('').default(''),
}).custom((value, helpers) => value.journal_text.trim() || value.reflection_text.trim()
  ? value : helpers.error('any.invalid')).messages({ 'any.invalid': 'Write in at least one field.' });

module.exports = { dateParam, listQuery, saveEntry };
