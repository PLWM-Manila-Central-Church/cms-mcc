"use strict";

/**
 * Joi validation middleware factory.
 * Usage: validate(schema) — returns a middleware that validates req.body.
 * Returns 422 Unprocessable Entity with the first validation error message.
 */
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: true, stripUnknown: true });
  if (error) {
    return res.status(422).json({ message: error.details[0].message });
  }
  req.body = value; // replace body with the sanitized, stripped copy
  next();
};

module.exports = validate;
