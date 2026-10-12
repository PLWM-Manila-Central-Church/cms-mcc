"use strict";

const ARCHIVE_ADMIN_PASTOR = Object.freeze(["System Admin", "Pastor"]);
const ARCHIVE_RESTRICTED_ALLOWED = Object.freeze([
  ...ARCHIVE_ADMIN_PASTOR,
  "Finance Team",
  "Registration Team",
  "Ministry Leader",
  "Cell Group Leader",
  "Group Leader",
  "Leader",
]);

const canViewArchiveVisibility = (visibility, roleName) => {
  if (visibility === "public") return true;
  if (visibility === "restricted") return ARCHIVE_RESTRICTED_ALLOWED.includes(roleName);
  if (visibility === "confidential") return ARCHIVE_ADMIN_PASTOR.includes(roleName);
  return false;
};

const canAccessArchiveRecord = (record, roleName) => {
  if (!record || !canViewArchiveVisibility(record.visibility, roleName)) return false;
  if (roleName !== "Finance Team") return true;

  const category = record.category || record.ArchiveCategory;
  return category?.name === "Financial Records";
};

module.exports = {
  ARCHIVE_ADMIN_PASTOR,
  ARCHIVE_RESTRICTED_ALLOWED,
  canAccessArchiveRecord,
  canViewArchiveVisibility,
};
