"use strict";

const dateOnlyInTimezone = (date = new Date(), timeZone = "Asia/Manila") => {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
};

module.exports = dateOnlyInTimezone;
