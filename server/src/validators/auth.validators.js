const Joi = require('joi');
const { IANAZone } = require('luxon');

const timezone = Joi.string().max(64).custom((value, helpers) => {
  if (!IANAZone.isValidZone(value)) return helpers.error('any.invalid');
  return value;
}).messages({ 'any.invalid': 'Choose a valid IANA time zone.' });

const register = Joi.object({
  name: Joi.string().min(2).max(100).trim().required(),
  email: Joi.string().email().max(150).lowercase().trim().required(),
  password: Joi.string().min(8).max(128).required(),
  timezone: timezone.required(),
});
const login = Joi.object({
  email: Joi.string().email().max(150).lowercase().trim().required(),
  password: Joi.string().required(),
});
const updateMe = Joi.object({
  name: Joi.string().min(2).max(100).trim(),
  timezone,
}).min(1);

module.exports = { register, login, updateMe };
