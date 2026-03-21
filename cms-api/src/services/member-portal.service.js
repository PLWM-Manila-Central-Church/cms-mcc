"use strict";

const bcrypt   = require("bcrypt");
const { Op }   = require("sequelize");
const sequelize = require("../config/db");
const path     = require("path");
const fs       = require("fs");
const {
  Member, CellGroup, Group, EmergencyContact,
  Attendance, Service, ServiceResponse, ServiceAttendanceSummary,
  FinancialRecord, FinancialCategory,
  Event, EventRegistration, EventCategory,
  MinistryAssignment, MinistryRole, Notification,
  User,
} = require("../models");

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

// ── Sync ServiceAttendanceSummary after pre-reg changes ──────
const syncAttendanceSummary = async (serviceId) => {
  try {
    const total_attended = await Attendance.count({ where: { service_id: serviceId } });
    const service = await Service.findByPk(serviceId, { attributes: ["capacity"] });
    const total_expected = service?.capacity || 0;
    const total_absent   = Math.max(0, total_expected - total_attended);
    await ServiceAttendanceSummary.upsert({ service_id: serviceId, total_attended, total_expected, total_absent });
  } catch (err) {
    console.warn("[Portal] syncAttendanceSummary failed:", err.message);
  }
};

// ── Helpers ──────────────────────────────────────────────────
const fmtMemberId = (id) => `MEM-${String(id).padStart(4, "0")}`;

const calcAge = (dateStr) => {
  if (!dateStr) return null;
  const birth = new Date(dateStr);
  const now   = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
};

// ── Get My Profile ───────────────────────────────────────────
exports.getMyProfile = async (memberId) => {
  const member = await Member.findOne({
    where: { id: memberId },
    include: [
      { model: CellGroup, as: "cellGroup", attributes: ["id", "name", "area"], required: false },
      { model: Group,     as: "group",     attributes: ["id", "name"],         required: false },
      { model: EmergencyContact, as: "emergencyContacts", required: false },
    ],
  });
  if (!member) throw { status: 404, message: "Member profile not found" };

  // Fetch linked user to get join date (user account creation = join date).
  // Do NOT restrict attributes — with underscored:true Sequelize exposes timestamps
  // as .createdAt (camelCase) on the raw instance, NOT .created_at.
  // Falling back to plain.created_at (from member.toJSON() which serialises to snake_case).
  const userRecord = await User.findOne({
    where: { member_id: memberId },
  });

  const plain = member.toJSON();
  plain.member_id_formatted = fmtMemberId(member.id);
  plain.join_date            = userRecord?.createdAt || plain.created_at;
  plain.flesh_age            = calcAge(member.birthdate);
  plain.spiritual_age        = calcAge(member.spiritual_birthday);
  return plain;
};

// ── Update My Profile (restricted fields only) ───────────────
const MEMBER_EDITABLE_FIELDS = [
  "first_name", "last_name", "phone", "address",
  "email", "birthdate", "spiritual_birthday",
];

exports.updateMyProfile = async (memberId, data) => {
  const member = await Member.findOne({ where: { id: memberId } });
  if (!member) throw { status: 404, message: "Member not found" };

  // Whitelist — members cannot touch status, barcode, cell_group_id, group_id, etc.
  const update = {};
  for (const field of MEMBER_EDITABLE_FIELDS) {
    if (data[field] !== undefined) update[field] = data[field] || null;
  }

  if (update.email && update.email !== member.email) {
    const existing = await Member.findOne({ where: { email: update.email } });
    if (existing) throw { status: 409, message: "Email already in use" };
  }

  await member.update(update);
  return exports.getMyProfile(memberId);
};

// ── Get My Attendance ────────────────────────────────────────
exports.getMyAttendance = async (memberId) => {
  const records = await Attendance.findAll({
    where: { member_id: memberId },
    include: [
      {
        model: Service,
        attributes: ["id", "title", "service_date", "service_time", "status"],
        required: false,
      },
    ],
    order: [["checked_in_at", "DESC"]],
  });

  // Attendance rate: attended ÷ completed services in last 30 days,
  // but only counting services that existed AFTER this user's account was created.
  // This prevents new accounts from being penalised for services they could never attend.
  const since = new Date();
  since.setDate(since.getDate() - 30);

  // Resolve the user's account creation date so we know the earliest service to count.
  const linkedUser = await User.findOne({ where: { member_id: memberId } });
  const accountCreatedAt = linkedUser?.createdAt || null;

  // The effective start date is whichever is LATER: 30 days ago OR account creation date.
  const effectiveSince = (accountCreatedAt && new Date(accountCreatedAt) > since)
    ? new Date(accountCreatedAt)
    : since;

  const totalServices = await Service.count({
    where: {
      service_date: { [Op.gte]: effectiveSince },
      status: "completed",
    },
  });

  const attended = records.filter(
    (r) => r.Service && new Date(r.Service.service_date) >= effectiveSince
  ).length;

  const attendanceRate = totalServices > 0
    ? Math.round((attended / totalServices) * 100)
    : 0;

  return {
    records: records.map((r) => ({
      id:            r.id,
      date:          r.Service?.service_date   || null,
      service_title: r.Service?.title          || "—",
      check_in_time: r.checked_in_at           || null,
      status:        "Present",
    })),
    attendanceRate,
    totalServices,
    attended,
  };
};

// ── Get My Finance ───────────────────────────────────────────
exports.getMyFinance = async (memberId) => {
  const thisYear = new Date(new Date().getFullYear(), 0, 1);

  const records = await FinancialRecord.findAll({
    where: { member_id: memberId },
    include: [
      { model: FinancialCategory, as: "category", attributes: ["id", "name"], required: false },
    ],
    order: [["transaction_date", "DESC"]],
  });

  const ytdTotal = (
    await FinancialRecord.sum("amount", {
      where: {
        member_id:        memberId,
        transaction_date: { [Op.gte]: thisYear },
      },
    })
  ) || 0;

  return { records, ytdTotal };
};

// ── Get My Events (published, with registration status) ───────
exports.getMyEvents = async (memberId) => {
  const now    = new Date();
  const events = await Event.findAll({
    where: { status: "published" },
    include: [
      { model: EventCategory,    as: "category",      attributes: ["id", "name"],           required: false },
      { model: EventRegistration, attributes: ["id", "member_id", "registered_at"],          required: false },
    ],
    order: [["start_date", "ASC"]],
  });

  const myRegs = await EventRegistration.findAll({
    where: { member_id: memberId },
    attributes: ["event_id", "id", "registered_at"],
  });
  const myRegMap = new Map(myRegs.map((r) => [r.event_id, r]));

  return events.map((e) => {
    const plain       = e.toJSON();
    const reg         = myRegMap.get(e.id);
    const regCount    = (plain.EventRegistrations || []).length;
    const deadlinePast = e.registration_deadline && now > new Date(e.registration_deadline);
    const atCapacity   = e.capacity && regCount >= e.capacity;

    return {
      id:                    e.id,
      title:                 e.title,
      description:           e.description,
      start_date:            e.start_date,
      end_date:              e.end_date,
      location:              e.location,
      capacity:              e.capacity,
      registration_deadline: e.registration_deadline,
      status:                e.status,
      category:              plain.category,
      registration_count:    regCount,
      is_registered:         !!reg,
      my_registration_id:    reg?.id    || null,
      my_registered_at:      reg?.registered_at || null,
      can_register:          !reg && !deadlinePast && !atCapacity,
      can_cancel:            !!reg && !deadlinePast,
      deadline_passed:       !!deadlinePast,
    };
  });
};

// ── Register for Event (self) ────────────────────────────────
exports.registerForEvent = async (memberId, eventId) => {
  const event = await Event.findOne({ where: { id: eventId } });
  if (!event) throw { status: 404, message: "Event not found" };
  if (event.status !== "published")
    throw { status: 400, message: "Event is not open for registration" };
  if (event.registration_deadline && new Date() > new Date(event.registration_deadline))
    throw { status: 400, message: "Registration deadline has passed" };

  const existing = await EventRegistration.findOne({
    where: { event_id: eventId, member_id: memberId },
  });
  if (existing) throw { status: 409, message: "You are already registered for this event" };

  if (event.capacity) {
    const count = await EventRegistration.count({ where: { event_id: eventId } });
    if (count >= event.capacity) throw { status: 400, message: "Event has reached full capacity" };
  }

  const reg = await EventRegistration.create({
    event_id: eventId, member_id: memberId,
    registered_at: new Date(), registered_by: null,
  });

  return reg;
};

// ── Cancel Event Registration (self) ─────────────────────────
exports.cancelEventRegistration = async (memberId, eventId) => {
  const event = await Event.findOne({ where: { id: eventId } });
  if (event?.registration_deadline && new Date() > new Date(event.registration_deadline))
    throw { status: 400, message: "Cancellation deadline has passed" };

  const reg = await EventRegistration.findOne({
    where: { event_id: eventId, member_id: memberId },
  });
  if (!reg) throw { status: 404, message: "Registration not found" };

  await reg.destroy();
  return { message: "Registration cancelled successfully." };
};

// ── Change My Password ────────────────────────────────────────
exports.changeMyPassword = async (userId, currentPassword, newPassword) => {
  if (!newPassword || newPassword.length < 8)
    throw { status: 400, message: "New password must be at least 8 characters" };

  const user = await User.findByPk(userId);
  if (!user) throw { status: 404, message: "User not found" };

  const match = await bcrypt.compare(currentPassword, user.password_hash);
  if (!match) throw { status: 400, message: "Current password is incorrect" };

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await user.update({ password_hash: hash, force_password_change: 0 });

  return { message: "Password changed successfully." };
};

// ── Confirm Ministry Assignment ───────────────────────────────
exports.confirmMinistryAssignment = async (memberId, assignmentId) => {
  const assignment = await MinistryAssignment.findOne({
    where: { id: assignmentId, member_id: memberId },
    include: [
      { model: Service,      attributes: ["id", "title", "service_date"], required: false },
      { model: MinistryRole, as: "ministryRole", attributes: ["id", "name"], required: false },
    ],
  });
  if (!assignment) throw { status: 404, message: "Assignment not found" };
  if (assignment.confirmed) throw { status: 400, message: "Already confirmed" };

  await assignment.update({ confirmed: 1 });

  // Mark the related notification as read if it exists
  try {
    const user = await User.findOne({ where: { member_id: memberId, is_active: 1 } });
    if (user) {
      await Notification.update(
        { is_read: 1, read_at: new Date() },
        {
          where: {
            user_id: user.id,
            type:    "ministry_assigned",
            is_read: 0,
          },
        }
      );
    }
  } catch {}

  return { message: "Assignment confirmed." };
};

// ── Get Upcoming Services ─────────────────────────────────────
exports.getUpcomingServices = async () => {
  const now = new Date();
  return await Service.findAll({
    where: {
      service_date: { [Op.gte]: now },
      status: "published",
    },
    attributes: ["id", "title", "service_date", "service_time", "status", "capacity"],
    order: [["service_date", "ASC"]],
    limit: 6,
  });
};

// ── Upload Profile Photo ──────────────────────────────────────
exports.uploadProfilePhoto = async (memberId, filePath) => {
  const member = await Member.findOne({ where: { id: memberId } });
  if (!member) throw { status: 404, message: "Member not found" };

  // Delete the old photo file from disk if it exists
  if (member.profile_photo_url) {
    try {
      const oldAbs = path.join(__dirname, "../../uploads", member.profile_photo_url);
      if (fs.existsSync(oldAbs)) fs.unlinkSync(oldAbs);
    } catch (err) {
      console.warn("[Portal] Could not delete old profile photo:", err.message);
    }
  }

  await member.update({ profile_photo_url: filePath });
  return exports.getMyProfile(memberId);
};

// ── Get Service Details with Member's RSVP ───────────────────
exports.getServiceDetails = async (serviceId, memberId) => {
  const service = await Service.findByPk(serviceId, {
    attributes: ["id", "title", "service_date", "service_time", "capacity", "status", "response_deadline"],
  });
  if (!service) throw { status: 404, message: "Service not found" };

  const myResponse = await ServiceResponse.findOne({
    where: { service_id: serviceId, member_id: memberId },
    attributes: ["id", "attendance_status", "seat_number", "parking_slot"],
  });

  const registrationCount = await ServiceResponse.count({
    where: { service_id: serviceId, attendance_status: "ATTENDING" },
  });

  return {
    ...service.toJSON(),
    my_response: myResponse ? myResponse.toJSON() : null,
    attending_count: registrationCount,
  };
};

// ── Submit Service RSVP (creates Attendance pre-reg for ATTENDING) ─
exports.submitServiceResponse = async (memberId, serviceId, attendanceStatus) => {
  const service = await Service.findByPk(serviceId);
  if (!service) throw { status: 404, message: "Service not found" };

  const validStatuses = ["ATTENDING", "NOT_ATTENDING", "UNDECIDED"];
  if (!validStatuses.includes(attendanceStatus))
    throw { status: 400, message: "Invalid attendance status" };

  // Upsert the ServiceResponse
  const existing = await ServiceResponse.findOne({
    where: { service_id: serviceId, member_id: memberId },
  });

  if (existing) {
    await existing.update({ attendance_status: attendanceStatus });
  } else {
    await ServiceResponse.create({
      service_id: serviceId,
      member_id: memberId,
      attendance_status: attendanceStatus,
    });
  }

  // Sync Attendance pre-reg record
  if (attendanceStatus === "ATTENDING") {
    // Create a pre-reg Attendance record if one doesn't exist
    const existingAttendance = await Attendance.findOne({
      where: { service_id: serviceId, member_id: memberId, check_in_method: "pre-reg" },
    });
    if (!existingAttendance) {
      await Attendance.create({
        service_id:      serviceId,
        member_id:       memberId,
        check_in_method: "pre-reg",
        checked_in_at:   new Date(),
        recorded_by:     null,
      });
    }
    await syncAttendanceSummary(serviceId);
  } else {
    // Remove any pre-reg Attendance record when member says not attending or undecided
    await Attendance.destroy({
      where: { service_id: serviceId, member_id: memberId, check_in_method: "pre-reg" },
    });
    await syncAttendanceSummary(serviceId);
  }

  return exports.getServiceDetails(serviceId, memberId);
};

// ── Get My Ministry Assignments ───────────────────────────────
exports.getMyAssignments = async (memberId) => {
  return await MinistryAssignment.findAll({
    where: { member_id: memberId },
    include: [
      { model: Service,      attributes: ["id", "title", "service_date", "service_time"], required: false },
      { model: MinistryRole, as: "ministryRole", attributes: ["id", "name"],             required: false },
    ],
    order: [["created_at", "DESC"]],
  });
};
