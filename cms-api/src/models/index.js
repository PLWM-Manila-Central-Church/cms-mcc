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
const MinistryAssignment = require("./MinistryAssignment.model");
const SubstituteRequest = require("./SubstituteRequest.model");
const FinancialCategory = require("./FinancialCategory.model");
const FinancialRecord = require("./FinancialRecord.model");
const EventCategory = require("./EventCategory.model");
const Event = require("./Event.model");
const EventRegistration = require("./EventRegistration.model");
const InventoryCategory = require("./InventoryCategory.model");
const InventoryItem = require("./InventoryItem.model");
const InventoryUsage = require("./InventoryUsage.model");
const InventoryRequest = require("./InventoryRequest.model");
const ArchiveCategory = require("./ArchiveCategory.model");
const ArchiveRecord = require("./ArchiveRecord.model");
const ArchiveVersion = require("./ArchiveVersion.model");
const ArchiveAccessLog = require("./ArchiveAccessLog.model");
const Notification = require("./Notification.model");
const AuditLog = require("./AuditLog.model");
const SystemSetting = require("./SystemSetting.model");
const MinistryMembership  = require("./MinistryMembership.model");
const MinistryEventInvite = require("./MinistryEventInvite.model");

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
InventoryItem.hasMany(InventoryRequest, { foreignKey: "item_id" });
InventoryRequest.belongsTo(InventoryItem, { foreignKey: "item_id", as: "item" });
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
ArchiveRecord.hasMany(ArchiveVersion, { foreignKey: "record_id" });
ArchiveVersion.belongsTo(ArchiveRecord, { foreignKey: "record_id" });
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
User.belongsTo(MinistryRole, { foreignKey: "ministry_role_id",    as: "leadsMinistry"  });
User.belongsTo(CellGroup,    { foreignKey: "leads_cell_group_id", as: "leadsCellGroup" });
User.belongsTo(MinistryGroup, { foreignKey: "leads_group_id", as: "leadsGroup"   });

// ── MinistryMembership ───────────────────────────────────────
MinistryMembership.belongsTo(MinistryRole, { foreignKey: "ministry_role_id", as: "ministryRole"  });
MinistryMembership.belongsTo(Member,       { foreignKey: "member_id",        as: "member"        });
MinistryMembership.belongsTo(User,         { foreignKey: "added_by",         as: "addedByUser"   });
MinistryRole.hasMany(MinistryMembership,   { foreignKey: "ministry_role_id"                      });
Member.hasMany(MinistryMembership,         { foreignKey: "member_id"                             });

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
  MinistryAssignment,
  SubstituteRequest,
  FinancialCategory,
  FinancialRecord,
  EventCategory,
  Event,
  EventRegistration,
  InventoryCategory,
  InventoryItem,
  InventoryUsage,
  InventoryRequest,
  ArchiveCategory,
  ArchiveRecord,
  ArchiveVersion,
  ArchiveAccessLog,
  Notification,
  AuditLog,
  SystemSetting,
  MinistryMembership,
  MinistryEventInvite,
};
