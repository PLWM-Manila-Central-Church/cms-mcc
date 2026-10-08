"use strict";

const Joi = require("joi");

module.exports = Joi.object({
  date_from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
