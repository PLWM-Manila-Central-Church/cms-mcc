// Simple XSS sanitizer for user-provided text fields.
// Strips all HTML tags and attributes — only plain text survives.
// Use before storing notes, descriptions, addresses, and remarks.

const sanitizeHtml = require("sanitize-html");

const STRIP_ALL = {
  allowedTags: [],
  allowedAttributes: {},
};

/**
 * Strip all HTML from a string. Returns plain text.
 * Safe to call on null/undefined — returns an empty string.
 */
exports.sanitize = (text) => {
  if (text == null) return "";
  return sanitizeHtml(String(text), STRIP_ALL);
};

/**
 * Sanitize an object's string fields in place. Only touches
 * the keys listed in the 'fields' array. Useful for cleaning
 * req.body before passing to a service.
 */
exports.sanitizeFields = (obj, fields) => {
  if (!obj) return;
  for (const field of fields) {
    if (typeof obj[field] === "string") {
      obj[field] = exports.sanitize(obj[field]);
    }
  }
};