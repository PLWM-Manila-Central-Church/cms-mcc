"use strict";

const validateQuery = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, {
    abortEarly: true,
    stripUnknown: true,
    convert: true,
  });
  if (error) {
    return res.status(422).json({ message: `Invalid query: ${error.details[0].message}` });
  }
  req.query = value;
  next();
};

module.exports = validateQuery;
