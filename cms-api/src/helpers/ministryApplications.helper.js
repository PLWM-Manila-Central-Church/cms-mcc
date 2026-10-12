"use strict";

exports.getLatestApplicationsByRole = (applications = []) => {
  const latest = new Map();
  for (const application of applications) {
    const roleId = Number(application.ministry_role_id);
    if (!Number.isInteger(roleId)) continue;

    const previous = latest.get(roleId);
    if (!previous || Number(application.id) > Number(previous.id)) {
      latest.set(roleId, application);
    }
  }
  return latest;
};
