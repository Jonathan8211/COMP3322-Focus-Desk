const Joi = require("joi");

const MAX_CONTENT = 200000;

const createNote = Joi.object({
    title: Joi.string().max(255).trim().allow("").default("Untitled"),
    emoji: Joi.string().max(32).trim().default("📄"),
    content: Joi.string().max(MAX_CONTENT).allow("").default(""),
});

const updateNote = Joi.object({
    title: Joi.string().max(255).trim().allow(""),
    emoji: Joi.string().max(32).trim(),
    content: Joi.string().max(MAX_CONTENT).allow(""),
})
 .min(1)
 .messages({
    "object.min": "Provide at least one field to update",
 });

 module.exports = {createNote, updateNote, MAX_CONTENT};