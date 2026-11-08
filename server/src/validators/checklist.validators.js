const Joi = require('joi');

const title = Joi.string().trim().min(1).max(255);
const createItem = Joi.object({ title: title.required() });
const updateItem = Joi.object({
  title,
  is_done: Joi.boolean().strict(),
}).min(1);

module.exports = { createItem, updateItem };
