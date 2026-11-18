const Joi = require('joi');

const name = Joi.string().trim().min(1).max(80).required();

module.exports = {
  group: Joi.object({ name }),
};
