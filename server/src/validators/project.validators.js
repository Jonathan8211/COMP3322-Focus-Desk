const Joi = require("joi");

const createProject = Joi.object({
  name: Joi.string().min(1).max(100).trim().required().messages({
    "string.empty": "Project name cannot be empty",
    "any.required": "Project name is required",
  }),
  color: Joi.string()
    .pattern(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
    .default("#6366f1")
    .optional()
    .messages({
      "string.pattern.base": "Color must be a valid hex value (e.g. #fff or #6366f1)",
    }),
});

module.exports = { createProject };
