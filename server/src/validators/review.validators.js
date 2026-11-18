const Joi = require('joi');
const { DateTime } = require('luxon');

const date = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).custom((value, helpers) => {
  const parsed = DateTime.fromISO(value, { zone: 'UTC' });
  return parsed.isValid && parsed.toISODate() === value ? value : helpers.error('any.invalid');
});
const preview = Joi.object({ anchor: date.required() });
const consent = Joi.object({
  provider: Joi.string().valid('deepseek').required(),
  approved: Joi.boolean().valid(true).required(),
  scopeDigest: Joi.string().hex().length(64).required(),
});
module.exports = {
  query: Joi.object({ anchor: date.required() }),
  preview,
  generate: preview.keys({ consent: consent.required() }),
};
