"use strict";

const User = require("./User.model");
const Role = require("./Role.model");
const Permission = require("./Permission.model");
const RolePermission = require("./RolePermission.model");
const Member = require("./Member.model");
const CellGroup = require("./CellGroup.model");
const MinistryGroup = require("./Group.model");
const EmergencyContact = require("./EmergencyContact.model");
const MemberNote = require("./MemberNote.model");
const MemberStatusHistory = require("./MemberStatusHistory.model");
const CellGroupHistory = require("./CellGroupHistory.model");
const InvitedMember = require("./InvitedMember.model");
const UserSession = require("./UserSession.model");
const PasswordResetToken = require("./PasswordResetToken.model");
const RefreshToken = require("./RefreshToken.model");
const Service = require("./Service.model");
const ServiceAttendanceSummary = require("./ServiceAttendanceSummary.model");
const Attendance = require("./Attendance.model");
const ServiceResponse = require("./ServiceResponse.model");
const MinistryRole = require("./MinistryRole.model");
const Ministry = require("./Ministry.model");
const MinistryPosition = require("./MinistryPosition.model");
const MinistryAssignment = require("./MinistryAssignment.model");
const SubstituteRequest = require("./SubstituteRequest.model");
const FinancialCategory = require("./FinancialCategory.model");
const FinancialRecord = require("./FinancialRecord.model");
const EventCategory = require("./EventCategory.model");
const Event = require("./Event.model");
const EventImageArchive = require("./EventImageArchive.model");
const EventRegistration = require("./EventRegistration.model");
const InventoryCategory = require("./InventoryCategory.model");
const InventoryItem = require("./InventoryItem.model");
const InventoryUsage = require("./InventoryUsage.model");
const InventoryTransaction = require("./InventoryTransaction.model");
const InventoryRequest = require("./InventoryRequest.model");
const ArchiveCategory = require("./ArchiveCategory.model");
const ArchiveHold = require("./ArchiveHold.model");
const ArchiveRecord = require("./ArchiveRecord.model");
const ArchiveVersion = require("./ArchiveVersion.model");
const ArchiveAccessLog = require("./ArchiveAccessLog.model");
const Notification = require("./Notification.model");
const AuditLog = require("./AuditLog.model");
const SystemSetting = require("./SystemSetting.model");
const MinistryMembership  = require("./MinistryMembership.model");
const MinistrySchedule    = require("./MinistrySchedule.model");
const BibleReadingProgress = require("./BibleReadingProgress.model");
const GroupMemoryVerse     = require("./GroupMemoryVerse.model");
const MinistryEventInvite = require("./MinistryEventInvite.model");
const MinistryApplication = require("./MinistryApplication.model");
const UserLeaderAssignment = require("./UserLeaderAssignment.model");

// New Capstone Financial Models
const Fund = require("./Fund.model");
const Account = require("./Account.model");
const ExpenseCategory = require("./ExpenseCategory.model");
const PaymentMethod = require("./PaymentMethod.model");
const Expense = require("./Expense.model");
const Attachment = require("./Attachment.model");
const { GroupPosition, GroupMemberPosition, GroupActivity, GroupTask } = require("./OrgGroupExtras.model");
const VisitorRecord = require("./VisitorRecord.model");
const { FinanceTransfer, FinanceApproval } = require("./FinanceExtras.model");
const {
  EventCommittee,
  EventAssignment,
  EventProgramItem,
  EventBudget,
  EventBudgetItem,
  EventCashAdvance,
  EventLiquidation,
  EventLiquidationItem,
  EventApproval,
} = require("./EventWorkspace.model");
const {
  MinistryActivity,
  MinistryAttendanceResponse,
  MinistryActivityAttendance,
  MinistryAnnouncement,
  MemberMessage,
  MemberFeedback,
  PastoralVisitation,
} = require("./MinistryEngagement.model");
const {
  CellGroupMeeting,
  CellGroupMeetingAttendance,
  ServiceRecurrenceRule,
  ServiceProgramItem,
} = require("./CellAndServiceExtras.model");
const { InventoryBorrowing, InventoryMaintenance } = require("./InventoryExtras.model");

// ── Roles & Permissions ──────────────────────────────────────
Role.belongsToMany(Permission, {
  through: RolePermission,
  foreignKey: "role_id",
  as: "permissions",
});
Permission.belongsToMany(Role, {
  through: RolePermission,
  foreignKey: "permission_id",
  as: "roles",
});
Role.hasMany(RolePermission, { foreignKey: "role_id" });
RolePermission.belongsTo(Role, { foreignKey: "role_id" });
RolePermission.belongsTo(Permission, { foreignKey: "permission_id" });

// ── User ─────────────────────────────────────────────────────
User.belongsTo(Role, { foreignKey: "role_id", as: "role" });
Role.hasMany(User, { foreignKey: "role_id" });
User.belongsTo(Member, { foreignKey: "member_id", as: "member" });
Member.hasOne(User, { foreignKey: "member_id" });
User.belongsTo(InvitedMember, {
  foreignKey: "invited_member_id",
  as: "invitedMember",
});
InvitedMember.hasOne(User, { foreignKey: "invited_member_id" });

// ── InvitedMember ────────────────────────────────────────────
InvitedMember.belongsTo(User, {
  foreignKey: "invited_by",
  as: "invitedByUser",
});

// ── UserSession ──────────────────────────────────────────────
User.hasMany(UserSession, { foreignKey: "user_id" });
UserSession.belongsTo(User, { foreignKey: "user_id" });

// ── PasswordResetToken / RefreshToken ────────────────────────
User.hasMany(PasswordResetToken, { foreignKey: "user_id" });
PasswordResetToken.belongsTo(User, { foreignKey: "user_id" });
User.hasMany(RefreshToken, { foreignKey: "user_id" });
RefreshToken.belongsTo(User, { foreignKey: "user_id" });
UserSession.hasMany(RefreshToken, { foreignKey: "user_session_id", as: "refreshTokens" });
RefreshToken.belongsTo(UserSession, { foreignKey: "user_session_id", as: "userSession" });

// ── Member ───────────────────────────────────────────────────
Member.belongsTo(CellGroup, { foreignKey: "cell_group_id", as: "cellGroup" });
CellGroup.hasMany(Member, { foreignKey: "cell_group_id" });
Member.belongsTo(MinistryGroup, { foreignKey: "group_id", as: "group" });
MinistryGroup.hasMany(Member, { foreignKey: "group_id" });
Member.belongsTo(Member, { foreignKey: "referred_by", as: "referredByMember" });
Member.hasMany(Member, { foreignKey: "referred_by", as: "referrals" });
Member.belongsTo(User, { foreignKey: "deleted_by", as: "deletedByUser" });

// ── EmergencyContact ─────────────────────────────────────────
Member.hasMany(EmergencyContact, { foreignKey: "member_id", as: "emergencyContacts" });
EmergencyContact.belongsTo(Member, { foreignKey: "member_id", as: "member" });

// ── MemberNote ───────────────────────────────────────────────
Member.hasMany(MemberNote, { foreignKey: "member_id" });
MemberNote.belongsTo(Member, { foreignKey: "member_id" });
MemberNote.belongsTo(User, { foreignKey: "created_by", as: "createdByUser" });

// ── MemberStatusHistory ──────────────────────────────────────
Member.hasMany(MemberStatusHistory, { foreignKey: "member_id" });
MemberStatusHistory.belongsTo(Member, { foreignKey: "member_id" });
MemberStatusHistory.belongsTo(User, {
  foreignKey: "changed_by",
  as: "changedByUser",
});

// ── CellGroupHistory ─────────────────────────────────────────
Member.hasMany(CellGroupHistory, { foreignKey: "member_id" });
CellGroupHistory.belongsTo(Member, { foreignKey: "member_id" });
CellGroupHistory.belongsTo(CellGroup, {
  foreignKey: "old_cell_group_id",
  as: "oldCellGroup",
});
CellGroupHistory.belongsTo(CellGroup, {
  foreignKey: "new_cell_group_id",
  as: "newCellGroup",
});
CellGroupHistory.belongsTo(User, {
  foreignKey: "changed_by",
  as: "changedByUser",
});

// ── Service & Attendance ─────────────────────────────────────
Service.hasOne(ServiceAttendanceSummary, {
  foreignKey: "service_id",
  as: "summary",
});
ServiceAttendanceSummary.belongsTo(Service, { foreignKey: "service_id" });
Service.hasMany(Attendance, { foreignKey: "service_id" });
Attendance.belongsTo(Service, { foreignKey: "service_id" });
Member.hasMany(Attendance, { foreignKey: "member_id" });
Attendance.belongsTo(Member, { foreignKey: "member_id" });
Attendance.belongsTo(User, { foreignKey: "recorded_by", as: "recorder" });

// ── ServiceResponse ──────────────────────────────────────────
Service.hasMany(ServiceResponse, { foreignKey: "service_id" });
ServiceResponse.belongsTo(Service, { foreignKey: "service_id" });
Member.hasMany(ServiceResponse, { foreignKey: "member_id" });
ServiceResponse.belongsTo(Member, { foreignKey: "member_id" });
ServiceResponse.belongsTo(User, {
  foreignKey: "override_by",
  as: "overrideByUser",
});

// ── MinistryAssignment ───────────────────────────────────────
MinistryRole.hasOne(Ministry, {
  foreignKey: "legacy_ministry_role_id",
  as: "normalizedMinistry",
});
Ministry.belongsTo(MinistryRole, {
  foreignKey: "legacy_ministry_role_id",
  as: "legacyMinistryRole",
});
Ministry.hasMany(MinistryPosition, {
  foreignKey: "ministry_id",
  as: "positions",
});
MinistryPosition.belongsTo(Ministry, {
  foreignKey: "ministry_id",
  as: "ministry",
});

Service.hasMany(MinistryAssignment, { foreignKey: "service_id" });
MinistryAssignment.belongsTo(Service, { foreignKey: "service_id" });
Member.hasMany(MinistryAssignment, { foreignKey: "member_id" });
MinistryAssignment.belongsTo(Member, { foreignKey: "member_id" });
MinistryRole.hasMany(MinistryAssignment, { foreignKey: "ministry_role_id" });
MinistryAssignment.belongsTo(MinistryRole, {
  foreignKey: "ministry_role_id",
  as: "ministryRole",
});
MinistryAssignment.hasMany(SubstituteRequest, { foreignKey: "assignment_id" });
SubstituteRequest.belongsTo(MinistryAssignment, {
  foreignKey: "assignment_id",
  as: "assignment",
});
SubstituteRequest.belongsTo(User, {
  foreignKey: "requested_by",
  as: "requestedByUser",
});
SubstituteRequest.belongsTo(User, {
  foreignKey: "proposed_substitute",
  as: "proposedSubstituteUser",
});
SubstituteRequest.belongsTo(User, {
  foreignKey: "resolved_by",
  as: "resolvedByUser",
});

// ── FinancialRecord ──────────────────────────────────────────
FinancialCategory.hasMany(FinancialRecord, { foreignKey: "category_id" });
FinancialRecord.belongsTo(FinancialCategory, {
  foreignKey: "category_id",
  as: "category",
});
Member.hasMany(FinancialRecord, { foreignKey: "member_id" });
FinancialRecord.belongsTo(Member, { foreignKey: "member_id" });
FinancialRecord.belongsTo(User, { foreignKey: "recorded_by", as: "recorder" });
FinancialRecord.belongsTo(User, {
  foreignKey: "deleted_by",
  as: "deletedByUser",
});

// ── Event ────────────────────────────────────────────────────
EventCategory.hasMany(Event, { foreignKey: "category_id" });
Event.belongsTo(EventCategory, { foreignKey: "category_id", as: "category" });
Event.hasMany(EventRegistration, { foreignKey: "event_id" });
Event.hasOne(Service, { foreignKey: "event_id", as: "attendanceService" });
Service.belongsTo(Event, { foreignKey: "event_id", as: "event" });
Event.hasMany(EventImageArchive, { foreignKey: "event_id", as: "archivedImages" });
EventImageArchive.belongsTo(Event, { foreignKey: "event_id", as: "event" });
EventRegistration.belongsTo(Event, { foreignKey: "event_id" });
Member.hasMany(EventRegistration, { foreignKey: "member_id" });
EventRegistration.belongsTo(Member, { foreignKey: "member_id", as: "member" });
Event.belongsTo(User, { foreignKey: "created_by", as: "creator" });
Event.belongsTo(User, { foreignKey: "deleted_by", as: "deletedByUser" });

// ── Inventory ────────────────────────────────────────────────
InventoryCategory.hasMany(InventoryItem, { foreignKey: "category_id" });
InventoryItem.belongsTo(InventoryCategory, {
  foreignKey: "category_id",
  as: "category",
});
InventoryItem.hasMany(InventoryUsage, { foreignKey: "item_id" });
InventoryUsage.belongsTo(InventoryItem, { foreignKey: "item_id", as: "item" });
InventoryUsage.belongsTo(User, { foreignKey: "used_by", as: "usedByUser" });
InventoryItem.hasMany(InventoryTransaction, {
  foreignKey: "item_id",
  as: "transactions",
});
InventoryTransaction.belongsTo(InventoryItem, {
  foreignKey: "item_id",
  as: "item",
});
InventoryTransaction.belongsTo(User, {
  foreignKey: "recorded_by",
  as: "recordedByUser",
});
InventoryItem.hasMany(InventoryRequest, { foreignKey: "item_id" });
InventoryRequest.belongsTo(InventoryItem, { foreignKey: "item_id", as: "item" });
InventoryRequest.belongsTo(Event, { foreignKey: "event_id", as: "event" });
InventoryRequest.belongsTo(Service, { foreignKey: "service_id", as: "service" });
InventoryRequest.belongsTo(MinistryRole, { foreignKey: "ministry_role_id", as: "ministryRole" });
InventoryRequest.belongsTo(User, {
  foreignKey: "requested_by",
  as: "requestedByUser",
});
InventoryRequest.belongsTo(User, {
  foreignKey: "reviewed_by",
  as: "reviewedByUser",
});

// ── Archive ──────────────────────────────────────────────────
ArchiveCategory.hasMany(ArchiveRecord, { foreignKey: "category_id" });
ArchiveRecord.belongsTo(ArchiveCategory, {
  foreignKey: "category_id",
  as: "category",
});
ArchiveRecord.hasMany(ArchiveVersion, {
  foreignKey: "record_id",
  as: "ArchiveVersions",
});
ArchiveVersion.belongsTo(ArchiveRecord, { foreignKey: "record_id" });
ArchiveRecord.belongsTo(ArchiveVersion, {
  foreignKey: "current_version_id",
  as: "currentVersion",
});
ArchiveVersion.belongsTo(User, {
  foreignKey: "uploaded_by",
  as: "uploadedByUser",
});
ArchiveRecord.hasMany(ArchiveAccessLog, { foreignKey: "record_id" });
ArchiveAccessLog.belongsTo(ArchiveRecord, { foreignKey: "record_id" });
ArchiveAccessLog.belongsTo(User, {
  foreignKey: "accessed_by",
  as: "accessedByUser",
});
ArchiveRecord.belongsTo(User, {
  foreignKey: "uploaded_by",
  as: "uploadedByUser",
});
ArchiveRecord.belongsTo(User, {
  foreignKey: "approved_by",
  as: "approvedByUser",
});
ArchiveRecord.belongsTo(User, {
  foreignKey: "deleted_by",
  as: "deletedByUser",
});

// ── User leader associations ─────────────────────────────────
User.belongsTo(MinistryRole, { foreignKey: "leads_ministry_id",   as: "leadsMinistry"  });
User.belongsTo(CellGroup,    { foreignKey: "leads_cell_group_id", as: "leadsCellGroup" });
User.belongsTo(MinistryGroup, { foreignKey: "leads_group_id", as: "leadsGroup"   });
User.hasMany(UserLeaderAssignment, {
  foreignKey: "user_id",
  as: "leaderAssignments",
});
UserLeaderAssignment.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});
UserLeaderAssignment.belongsTo(User, {
  foreignKey: "assigned_by",
  as: "assignedByUser",
});
UserLeaderAssignment.belongsTo(User, {
  foreignKey: "revoked_by",
  as: "revokedByUser",
});

// ── MinistryMembership ───────────────────────────────────────
MinistryMembership.belongsTo(MinistryRole, { foreignKey: "ministry_role_id", as: "ministryRole"  });
MinistryMembership.belongsTo(Member,       { foreignKey: "member_id",        as: "member"        });
MinistryMembership.belongsTo(User,         { foreignKey: "added_by",         as: "addedByUser"   });
MinistrySchedule.belongsTo(MinistryRole, { foreignKey: "ministry_role_id", as: "ministryRole" });
BibleReadingProgress.belongsTo(Member, { foreignKey: "member_id", as: "member" });
GroupMemoryVerse.belongsTo(MinistryGroup, { foreignKey: "group_id", as: "group" });
MinistryRole.hasMany(MinistryMembership,   { foreignKey: "ministry_role_id"                      });
Member.hasMany(MinistryMembership,         { foreignKey: "member_id", as: "MinistryMemberships"  });

// ── Ministry applications ───────────────────────────────────
MinistryApplication.belongsTo(MinistryRole, { foreignKey: "ministry_role_id", as: "ministryRole" });
MinistryRole.hasMany(MinistryApplication, { foreignKey: "ministry_role_id", as: "applications" });
MinistryApplication.belongsTo(Member, { foreignKey: "member_id", as: "member" });
Member.hasMany(MinistryApplication, { foreignKey: "member_id", as: "ministryApplications" });
MinistryApplication.belongsTo(User, { foreignKey: "reviewed_by", as: "reviewedByUser" });
User.hasMany(MinistryApplication, { foreignKey: "reviewed_by", as: "reviewedMinistryApplications" });

// ── MinistryEventInvite ──────────────────────────────────────
MinistryEventInvite.belongsTo(Event,        { foreignKey: "event_id"                                        });
MinistryEventInvite.belongsTo(MinistryRole, { foreignKey: "ministry_role_id", as: "ministryRole"            });
MinistryEventInvite.belongsTo(Member,       { foreignKey: "member_id",        as: "member"                  });
MinistryEventInvite.belongsTo(User,         { foreignKey: "invited_by",       as: "invitedByUser"           });
Event.hasMany(MinistryEventInvite,          { foreignKey: "event_id"                                        });
Member.hasMany(MinistryEventInvite,         { foreignKey: "member_id"                                       });

// ── Notification ─────────────────────────────────────────────
User.hasMany(Notification, { foreignKey: "user_id" });
Notification.belongsTo(User, { foreignKey: "user_id" });

// ── AuditLog ─────────────────────────────────────────────────
User.hasMany(AuditLog, { foreignKey: "user_id" });
AuditLog.belongsTo(User, { foreignKey: "user_id" });

// ── SystemSetting ────────────────────────────────────────────
SystemSetting.belongsTo(User, {
  foreignKey: "updated_by",
  as: "updatedByUser",
});

// ── Capstone Financial Associations ──────────────────────────
Fund.hasMany(Account, { foreignKey: "fund_id", onDelete: "CASCADE" });
Account.belongsTo(Fund, { foreignKey: "fund_id", as: "fund" });

Account.hasMany(ExpenseCategory, { foreignKey: "account_id", onDelete: "CASCADE" });
ExpenseCategory.belongsTo(Account, { foreignKey: "account_id", as: "account" });

Account.hasMany(Expense, { foreignKey: "account_id" });
Expense.belongsTo(Account, { foreignKey: "account_id", as: "account" });

ExpenseCategory.hasMany(Expense, { foreignKey: "category_id" });
Expense.belongsTo(ExpenseCategory, { foreignKey: "category_id", as: "category" });

PaymentMethod.hasMany(Expense, { foreignKey: "payment_method_id" });
Expense.belongsTo(PaymentMethod, { foreignKey: "payment_method_id", as: "paymentMethod" });

User.hasMany(Expense, { foreignKey: "created_by", as: "createdExpenses" });
Expense.belongsTo(User, { foreignKey: "created_by", as: "creator" });

FinancialRecord.hasMany(Attachment, { foreignKey: "income_id", as: "attachments" });
Attachment.belongsTo(FinancialRecord, { foreignKey: "income_id", as: "incomeRecord" });

Expense.hasMany(Attachment, { foreignKey: "expense_id", as: "attachments" });
Attachment.belongsTo(Expense, { foreignKey: "expense_id", as: "expenseRecord" });

User.hasMany(Attachment, { foreignKey: "uploaded_by", as: "uploadedAttachments" });
Attachment.belongsTo(User, { foreignKey: "uploaded_by", as: "uploader" });

// ── Organizational Group Positions, Activities & Tasks ───────
MinistryRole.hasMany(GroupPosition, { foreignKey: "group_id", as: "positions" });
GroupPosition.belongsTo(MinistryRole, { foreignKey: "group_id", as: "group" });

MinistryRole.hasMany(GroupMemberPosition, { foreignKey: "group_id", as: "memberPositions" });
GroupMemberPosition.belongsTo(MinistryRole, { foreignKey: "group_id", as: "group" });
GroupPosition.hasMany(GroupMemberPosition, { foreignKey: "position_id", as: "assignments" });
GroupMemberPosition.belongsTo(GroupPosition, { foreignKey: "position_id", as: "position" });
Member.hasMany(GroupMemberPosition, { foreignKey: "member_id", as: "groupPositions" });
GroupMemberPosition.belongsTo(Member, { foreignKey: "member_id", as: "member" });

MinistryRole.hasMany(GroupActivity, { foreignKey: "group_id", as: "activities" });
GroupActivity.belongsTo(MinistryRole, { foreignKey: "group_id", as: "group" });

MinistryRole.hasMany(GroupTask, { foreignKey: "group_id", as: "tasks" });
GroupTask.belongsTo(MinistryRole, { foreignKey: "group_id", as: "group" });
GroupActivity.hasMany(GroupTask, { foreignKey: "activity_id", as: "tasks" });
GroupTask.belongsTo(GroupActivity, { foreignKey: "activity_id", as: "activity" });
Member.hasMany(GroupTask, { foreignKey: "assigned_member_id", as: "assignedGroupTasks" });
GroupTask.belongsTo(Member, { foreignKey: "assigned_member_id", as: "assignedMember" });

MinistryGroup.belongsTo(User, { foreignKey: "leader_user_id", as: "leader" });
MinistryGroup.belongsTo(User, { foreignKey: "assistant_leader_user_id", as: "assistantLeader" });
MinistryRole.belongsTo(User, { foreignKey: "leader_user_id", as: "leader" });
MinistryRole.belongsTo(User, { foreignKey: "assistant_leader_user_id", as: "assistantLeader" });

Service.hasMany(VisitorRecord, { foreignKey: "service_id", as: "visitors" });
VisitorRecord.belongsTo(Service, { foreignKey: "service_id", as: "service" });
Event.hasMany(VisitorRecord, { foreignKey: "event_id", as: "visitors" });
VisitorRecord.belongsTo(Event, { foreignKey: "event_id", as: "event" });
VisitorRecord.belongsTo(Member, { foreignKey: "invited_by_member_id", as: "invitedBy" });

// ── Phase 3 Finance Upgrade Associations ──────────────────────
FinancialRecord.belongsTo(Fund, { foreignKey: "fund_id", as: "fund" });
FinancialRecord.belongsTo(Account, { foreignKey: "account_id", as: "account" });
FinancialRecord.belongsTo(Event, { foreignKey: "event_id", as: "event" });
FinancialRecord.belongsTo(MinistryGroup, { foreignKey: "ministry_group_id", as: "ministryGroup" });

Expense.belongsTo(Fund, { foreignKey: "fund_id", as: "fund" });
Expense.belongsTo(Event, { foreignKey: "event_id", as: "event" });
Expense.belongsTo(MinistryGroup, { foreignKey: "ministry_group_id", as: "ministryGroup" });
Expense.belongsTo(User, { foreignKey: "requested_by", as: "requester" });
Expense.belongsTo(User, { foreignKey: "approved_by", as: "approver" });
Expense.belongsTo(User, { foreignKey: "paid_by", as: "payer" });

FinanceTransfer.belongsTo(Account, { foreignKey: "from_account_id", as: "fromAccount" });
FinanceTransfer.belongsTo(Account, { foreignKey: "to_account_id", as: "toAccount" });
FinanceTransfer.belongsTo(Fund, { foreignKey: "from_fund_id", as: "fromFund" });
FinanceTransfer.belongsTo(Fund, { foreignKey: "to_fund_id", as: "toFund" });
FinanceTransfer.belongsTo(User, { foreignKey: "created_by", as: "creator" });
FinanceApproval.belongsTo(User, { foreignKey: "actor_user_id", as: "actor" });

// ── Phase 4 Event Workspace Associations ──────────────────────
Event.hasMany(EventCommittee, { foreignKey: "event_id", as: "committees" });
EventCommittee.belongsTo(Event, { foreignKey: "event_id", as: "event" });
EventCommittee.belongsTo(Member, { foreignKey: "chair_member_id", as: "chair" });

Event.hasMany(EventAssignment, { foreignKey: "event_id", as: "assignments" });
EventAssignment.belongsTo(Event, { foreignKey: "event_id", as: "event" });
EventAssignment.belongsTo(EventCommittee, { foreignKey: "committee_id", as: "committee" });
EventAssignment.belongsTo(Member, { foreignKey: "member_id", as: "member" });

Event.hasMany(EventProgramItem, { foreignKey: "event_id", as: "programItems" });
EventProgramItem.belongsTo(Event, { foreignKey: "event_id", as: "event" });

Event.hasMany(EventBudget, { foreignKey: "event_id", as: "budgets" });
EventBudget.belongsTo(Event, { foreignKey: "event_id", as: "event" });
EventBudget.belongsTo(Fund, { foreignKey: "fund_id", as: "fund" });
EventBudget.hasMany(EventBudgetItem, { foreignKey: "budget_id", as: "items" });
EventBudgetItem.belongsTo(EventBudget, { foreignKey: "budget_id", as: "budget" });

Event.hasMany(EventCashAdvance, { foreignKey: "event_id", as: "cashAdvances" });
EventCashAdvance.belongsTo(Event, { foreignKey: "event_id", as: "event" });
EventCashAdvance.belongsTo(Account, { foreignKey: "account_id", as: "account" });
EventCashAdvance.belongsTo(Fund, { foreignKey: "fund_id", as: "fund" });

Event.hasMany(EventLiquidation, { foreignKey: "event_id", as: "liquidations" });
EventLiquidation.belongsTo(Event, { foreignKey: "event_id", as: "event" });
EventLiquidation.belongsTo(EventCashAdvance, { foreignKey: "cash_advance_id", as: "cashAdvance" });
EventLiquidation.hasMany(EventLiquidationItem, { foreignKey: "liquidation_id", as: "items" });
EventLiquidationItem.belongsTo(EventLiquidation, { foreignKey: "liquidation_id", as: "liquidation" });

Event.hasMany(EventApproval, { foreignKey: "event_id", as: "approvals" });

// ── Phase 5 Ministry Engagement & Pastoral Care Associations ──
MinistryGroup.hasMany(MinistryActivity, { foreignKey: "ministry_group_id", as: "activities" });
MinistryActivity.belongsTo(MinistryGroup, { foreignKey: "ministry_group_id", as: "ministry" });
MinistryActivity.hasMany(MinistryAttendanceResponse, { foreignKey: "activity_id", as: "responses" });
MinistryAttendanceResponse.belongsTo(MinistryActivity, { foreignKey: "activity_id", as: "activity" });
MinistryAttendanceResponse.belongsTo(Member, { foreignKey: "member_id", as: "member" });
MinistryActivity.hasMany(MinistryActivityAttendance, { foreignKey: "activity_id", as: "attendances" });
MinistryActivityAttendance.belongsTo(MinistryActivity, { foreignKey: "activity_id", as: "activity" });
MinistryActivityAttendance.belongsTo(Member, { foreignKey: "member_id", as: "member" });

MinistryGroup.hasMany(MinistryAnnouncement, { foreignKey: "ministry_group_id", as: "announcements" });
MinistryAnnouncement.belongsTo(MinistryGroup, { foreignKey: "ministry_group_id", as: "ministry" });

MemberMessage.belongsTo(Member, { foreignKey: "member_id", as: "member" });
MemberMessage.belongsTo(User, { foreignKey: "sender_user_id", as: "sender" });
MemberFeedback.belongsTo(Member, { foreignKey: "member_id", as: "member" });
PastoralVisitation.belongsTo(Member, { foreignKey: "member_id", as: "member" });
PastoralVisitation.belongsTo(User, { foreignKey: "visited_by_user_id", as: "visitor" });

// ── Phase 7 Inventory Borrowing & Maintenance Associations ────
InventoryItem.hasMany(InventoryBorrowing, { foreignKey: "item_id", as: "borrowings" });
InventoryBorrowing.belongsTo(InventoryItem, { foreignKey: "item_id", as: "item" });
InventoryItem.hasMany(InventoryMaintenance, { foreignKey: "item_id", as: "maintenanceLogs" });
InventoryMaintenance.belongsTo(InventoryItem, { foreignKey: "item_id", as: "item" });

module.exports = {
  User,
  Role,
  Permission,
  RolePermission,
  Member,
  CellGroup,
  MinistryGroup,
  Group: MinistryGroup,
  EmergencyContact,
  MemberNote,
  MemberStatusHistory,
  CellGroupHistory,
  InvitedMember,
  UserSession,
  PasswordResetToken,
  RefreshToken,
  Service,
  ServiceAttendanceSummary,
  Attendance,
  ServiceResponse,
  MinistryRole,
  Ministry,
  MinistryPosition,
  MinistryAssignment,
  SubstituteRequest,
  FinancialCategory,
  FinancialRecord,
  EventCategory,
  Event,
  EventImageArchive,
  EventRegistration,
  InventoryCategory,
  InventoryItem,
  InventoryUsage,
  InventoryTransaction,
  InventoryRequest,
  ArchiveCategory,
  ArchiveHold,
  ArchiveRecord,
  ArchiveVersion,
  ArchiveAccessLog,
  Notification,
  AuditLog,
  SystemSetting,
  MinistryMembership,
  MinistryEventInvite,
  MinistryApplication,
  UserLeaderAssignment,
  Fund,
  Account,
  ExpenseCategory,
  PaymentMethod,
  Expense,
  Attachment,
  MinistrySchedule,
  BibleReadingProgress,
  GroupMemoryVerse,
  GroupPosition,
  GroupMemberPosition,
  GroupActivity,
  GroupTask,
  VisitorRecord,
  FinanceTransfer,
  FinanceApproval,
  EventCommittee,
  EventAssignment,
  EventProgramItem,
  EventBudget,
  EventBudgetItem,
  EventCashAdvance,
  EventLiquidation,
  EventLiquidationItem,
  EventApproval,
  MinistryActivity,
  MinistryAttendanceResponse,
  MinistryActivityAttendance,
  MinistryAnnouncement,
  MemberMessage,
  MemberFeedback,
  PastoralVisitation,
  CellGroupMeeting,
  CellGroupMeetingAttendance,
  ServiceRecurrenceRule,
  ServiceProgramItem,
  InventoryBorrowing,
  InventoryMaintenance,
};
