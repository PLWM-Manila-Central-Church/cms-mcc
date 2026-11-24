"use strict";

const router = require("express").Router();
const { timingSafeEqual } = require("node:crypto");
const auth = require("../../middlewares/verifyToken");
const authorize = require("../../middlewares/authorize");
const AppError = require("../../helpers/AppError");
const { Member, User } = require("../../models");
const readinessModule = require("./readiness");
const { readiness, requireSchema } = readinessModule;
const campaignReadiness = readinessModule.campaignReadiness || (async () => true);
const requireCampaignSchema = readinessModule.requireCampaignSchema || requireSchema;
const { DEFAULTS } = require("./policy");
const { getConfiguration, saveConfiguration, transportState } = require("./configuration");
const { READ_ROLES, STAFF_ROLES, GLOBAL_ROLES, CAMPAIGN_ROLES, requireRole, canBroadcast, canApprove } = require("./permissions");
const repository = require("./repository");
const { historyForMembers, evaluatePage, notifyAssignee } = require("./evaluation");
const { processQueue, retryDelivery } = require("./dispatcher");
const schemas = require("./validators");
const campaigns = require("./campaigns.service");
const validate = (schema, part = "body") => (req, _res, next) => {
  const { value, error } = schema.validate(req[part], { abortEarly: false, allowUnknown: false, convert: true });
  if (error) return next(AppError.badRequest("VALIDATION_ERROR", error.details.map((detail) => detail.message).join("; ")));
  req[part] = value; next();
};
const handle = (fn) => async (req, res, next) => {
  try { res.json({ success: true, data: await fn(req) }); } catch (error) { next(error); }
};
router.param("id", (req, _res, next, value) => /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) ? next() : next(AppError.badRequest("INVALID_ID", "A valid record ID is required")));
router.param("memberId", (req, _res, next, value) => /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) ? next() : next(AppError.badRequest("INVALID_ID", "A valid member ID is required")));
router.param("campaignId", (req, _res, next, value) => /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) ? next() : next(AppError.badRequest("INVALID_ID", "A valid campaign ID is required")));

router.post("/jobs/run", async (req, res, next) => {
  try {
    const secret = process.env.OUTREACH_JOB_TOKEN || "";
    const supplied = (req.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const expectedBytes = Buffer.from(secret);
    const suppliedBytes = Buffer.from(supplied);
    if (secret.length < 32 || suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) throw AppError.forbidden("Scheduler access denied");
    if (!await readiness()) throw new AppError("OUTREACH_SCHEMA_NOT_READY", 503, "Notification management migration is required");
    const data = await require("./scheduler").runCycle();
    res.json({ success: true, data });
  } catch (error) { next(error); }
});
router.use(auth);
router.get("/availability", handle(async (req) => {
  const ready = await readiness();
  const config = ready ? await getConfiguration() : DEFAULTS;
  return { schema_ready: ready, campaigns_schema_ready: ready && await campaignReadiness(), enabled: config.enabled, mode: config.mode, campaigns_enabled: config.campaigns_enabled, ...transportState(),
    capabilities: { configure: canBroadcast(req.user), manage: STAFF_ROLES.includes(req.user.roleName),
      global: GLOBAL_ROLES.includes(req.user.roleName), resolve: READ_ROLES.includes(req.user.roleName),
      process: STAFF_ROLES.includes(req.user.roleName), campaigns: CAMPAIGN_ROLES.includes(req.user.roleName), campaign_write: canBroadcast(req.user),
      broadcast: canBroadcast(req.user), approve: canApprove(req.user) } };
}));
router.get("/me/preferences", requireSchema, handle((req) => repository.getPreference(req.user.memberId, req.user, { self: true })));
router.put("/me/preferences", requireSchema, validate(schemas.preference), handle((req) => repository.setPreference(req.user.memberId, req.body, req.user, { self: true })));
router.use(requireRole(READ_ROLES), authorize("outreach", "read"), requireSchema);
router.get("/campaigns", requireRole(CAMPAIGN_ROLES), requireCampaignSchema, validate(schemas.campaigns, "query"), handle((req) => campaigns.list(req.query, req.user)));
router.get("/campaigns/member-options", requireRole(["Registration Team"]), requireCampaignSchema, validate(schemas.collection, "query"), handle((req) => campaigns.memberOptions(req.query)));
router.post("/campaigns/preview", requireRole(["Registration Team"]), requireCampaignSchema, validate(schemas.campaignPreview), handle((req) => campaigns.preview(req.body, req.user)));
router.post("/campaigns", requireRole(["Registration Team"]), requireCampaignSchema, validate(schemas.campaign), handle((req) => campaigns.create(req.body, req.user)));
router.get("/campaigns/:campaignId", requireRole(CAMPAIGN_ROLES), requireCampaignSchema, handle((req) => campaigns.get(req.params.campaignId, req.user)));
router.get("/campaigns/:campaignId/deliveries", requireRole(CAMPAIGN_ROLES), requireCampaignSchema, validate(schemas.collection, "query"), handle((req) => campaigns.deliveries(req.params.campaignId, req.query)));
router.post("/campaigns/:campaignId/submit", requireRole(["Registration Team"]), requireCampaignSchema, validate(schemas.empty), handle((req) => campaigns.submit(req.params.campaignId, req.user)));
router.post("/campaigns/:campaignId/approve", requireRole(["Registration Team"]), requireCampaignSchema, validate(schemas.campaignNote), handle((req) => campaigns.approve(req.params.campaignId, req.user, req.body.note)));
router.post("/campaigns/:campaignId/reject", requireRole(["Registration Team"]), requireCampaignSchema, validate(schemas.campaignReason), handle((req) => campaigns.reject(req.params.campaignId, req.user, req.body.reason)));
router.post("/campaigns/:campaignId/cancel", requireRole(["Registration Team"]), requireCampaignSchema, validate(schemas.campaignNote), handle((req) => campaigns.cancel(req.params.campaignId, req.user, req.body.note)));
router.get("/configuration", requireRole(["Registration Team"]), handle(getConfiguration));
router.put("/configuration", requireRole(["Registration Team"]), validate(schemas.configuration), handle((req) => saveConfiguration(req.body, req.user)));
router.get("/overview", handle((req) => repository.overview(req.user)));
router.get("/sessions", validate(schemas.collection, "query"), handle((req) => repository.listSessions(req.query, req.user)));
router.put("/sessions/:id/policy", requireRole(STAFF_ROLES), authorize("outreach", "manage"), validate(schemas.policy), handle((req) => repository.setSessionPolicy(req.params.id, req.body, req.user)));
router.get("/sessions/:id/roster", validate(schemas.collection, "query"), handle((req) => repository.getRoster(req.params.id, req.query, req.user)));
router.put("/sessions/:id/members/:memberId/exception", requireRole(STAFF_ROLES), authorize("outreach", "manage"), validate(schemas.exception), handle((req) => repository.setException(req.params.id, req.params.memberId, req.body, req.user)));
router.get("/members", requireRole(STAFF_ROLES), validate(schemas.collection, "query"), handle((req) => repository.listMembers(req.query, req.user)));
router.get("/members/:id/preferences", requireRole(STAFF_ROLES), handle((req) => repository.getPreference(req.params.id, req.user)));
router.put("/members/:id/preferences", requireRole(STAFF_ROLES), authorize("outreach", "manage"), validate(schemas.preference), handle((req) => repository.setPreference(req.params.id, req.body, req.user)));
router.get("/follow-ups", validate(schemas.cases, "query"), handle((req) => repository.listFollowUps(req.query, req.user)));
router.get("/follow-ups/:id", handle(async (req) => {
  const followup = await repository.assertCaseAccess(req.params.id, req.user);
  const member = await Member.findByPk(followup.member_id, { attributes: ["id", "first_name", "last_name", "phone", "status"] });
  const assignee = followup.assigned_to ? await User.findByPk(followup.assigned_to, { attributes: ["id", "email", "is_active", "is_deleted"] }) : null;
  const deliveries = await repository.listDeliveries({ follow_up_id: followup.id, page: 1, limit: 50 }, req.user);
  const ids = deliveries.items.map((row) => row.id);
  const attempts = ids.length ? await repository.OutreachDeliveryAttempt.findAll({ where: { delivery_id: ids }, order: [["id", "DESC"]], limit: 100 }) : [];
  return { followup, member, assignee, timeline: (await historyForMembers([followup.member_id])).filter((row) => row.series_key === followup.series_key),
    deliveries: deliveries.items, attempts };
}));
router.get("/follow-ups/:id/assignees", handle(async (req) => {
  const followup = await repository.assertCaseAccess(req.params.id, req.user);
  const candidates = await repository.eligibleAssignees(followup.member_id);
  return GLOBAL_ROLES.includes(req.user.roleName) ? candidates : candidates.filter((row) => Number(row.id) === Number(req.user.userId));
}));
router.post("/follow-ups/:id/assign", authorize("outreach", "resolve"), validate(schemas.assign), handle(async (req) => {
  const result = await repository.updateFollowUp(req.params.id, req.body, req.user, "assign");
  return result;
}));
router.post("/follow-ups/:id/resolve", authorize("outreach", "resolve"), validate(schemas.resolve), handle((req) => repository.updateFollowUp(req.params.id, req.body, req.user, "resolve")));
router.get("/deliveries", validate(schemas.deliveries, "query"), handle((req) => repository.listDeliveries(req.query, req.user)));
router.post("/deliveries/:id/retry", requireRole(STAFF_ROLES), authorize("outreach", "process"), validate(schemas.empty), handle((req) => retryDelivery(req.params.id, req.user)));
router.post("/evaluate", requireRole(STAFF_ROLES), authorize("outreach", "process"), validate(schemas.evaluate), handle((req) => evaluatePage(req.body)));
router.post("/process", requireRole(STAFF_ROLES), authorize("outreach", "process"), validate(schemas.process), handle((req) => processQueue({ ...req.body, inAppOnly: req.user.roleName !== "Registration Team" })));
module.exports = router;
