"use strict";

const { Op } = require("sequelize");
const auditLog = require("../helpers/auditLog.helper");
const notifService = require("./notifications.service");
const {
  Event,
  EventCategory,
  EventRegistration,
  Member,
} = require("../models");

const eventIncludes = [
  {
    model: EventCategory,
    as: "category",
    attributes: ["id", "name", "description"],
    required: false,
  },
];

// Remap Sequelize aliases to match what the frontend expects
const remapEvent = (e) => {
  const plain = typeof e.toJSON === "function" ? e.toJSON() : e;
  plain.EventCategory    = plain.category    || null;
  plain.EventRegistrations = plain.EventRegistrations || [];
  return plain;
};

// ── Get All Events (paginated) ───────────────────────────────
exports.getAllEvents = async ({ page = 1, limit = 15, status } = {}) => {
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where  = { is_deleted: 0 };
  if (status) where.status = status;

  const { count, rows } = await Event.findAndCountAll({
    where,
    include: [
      ...eventIncludes,
      {
        model: EventRegistration,
        attributes: ["id"],
        required: false,
      },
    ],
    order: [["start_date", "DESC"]],
    limit: parseInt(limit),
    offset,
    distinct: true,
  });

  return {
    events:      rows.map(remapEvent),
    total:       count,
    total_pages: Math.ceil(count / parseInt(limit)),
  };
};

// ── Get Event By ID ──────────────────────────────────────────
exports.getEventById = async (id) => {
  const event = await Event.findOne({
    where: { id },
    include: [
      ...eventIncludes,
      {
        model: EventRegistration,
        attributes: ["id"],
        required: false,
      },
    ],
  });
  if (!event) throw { status: 404, message: "Event not found" };
  return remapEvent(event);
};

// ── Create Event ─────────────────────────────────────────────
exports.createEvent = async (data, createdBy) => {
  const {
    category_id,
    title,
    description,
    start_date,
    end_date,
    start_time,
    location,
    capacity,
    registration_deadline,
    status,
  } = data;

  if (category_id) {
    const category = await EventCategory.findByPk(category_id);
    if (!category) throw { status: 404, message: "Event category not found" };
  }

  const event = await Event.create({
    category_id:           category_id           || null,
    title,
    description:           description           || null,
    start_date,
    end_date:              end_date              || null,
    start_time:            start_time            || null,
    location:              location              || null,
    capacity:              capacity              || null,
    registration_deadline: registration_deadline || null,
    status:                status                || "draft",
    is_deleted: 0,
    created_by: createdBy,
  });

  const created = await exports.getEventById(event.id);
  auditLog.log({ userId: createdBy, action: "CREATE_EVENT", targetTable: "events", targetId: created.id });
  return created;

// ── Update Event ─────────────────────────────────────────────
exports.updateEvent = async (id, data, updatedBy) => {
  const event = await Event.findOne({ where: { id } });
  if (!event) throw { status: 404, message: "Event not found" };

  if (event.status === "completed" || event.status === "cancelled")
    throw { status: 400, message: "Cannot update a completed or cancelled event" };

  const {
    category_id,
    title,
    description,
    start_date,
    end_date,
    start_time,
    location,
    capacity,
    registration_deadline,
    status,
  } = data;

  if (category_id) {
    const category = await EventCategory.findByPk(category_id);
    if (!category) throw { status: 404, message: "Event category not found" };
  }

  await event.update({
    ...(category_id            !== undefined && { category_id }),
    ...(title                                && { title }),
    ...(description            !== undefined && { description }),
    ...(start_date                           && { start_date }),
    ...(end_date               !== undefined && { end_date }),
    ...(start_time             !== undefined && { start_time }),
    ...(location               !== undefined && { location }),
    ...(capacity               !== undefined && { capacity }),
    ...(registration_deadline  !== undefined && { registration_deadline }),
    ...(status                               && { status }),
  });

  auditLog.log({ userId: updatedBy, action: "UPDATE_EVENT", targetTable: "events", targetId: id });
  return await exports.getEventById(id);
};

// ── Update Event Status ──────────────────────────────────────
exports.updateEventStatus = async (id, newStatus, updatedBy) => {
  const event = await Event.findOne({ where: { id } });
  if (!event) throw { status: 404, message: "Event not found" };

  const validTransitions = {
    draft:     ["published", "cancelled"],
    published: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  };

  if (!validTransitions[event.status]?.includes(newStatus))
    throw {
      status: 400,
      message: `Cannot transition from "${event.status}" to "${newStatus}"`,
    };

  await event.update({ status: newStatus });
  auditLog.log({ userId: updatedBy, action: "UPDATE_EVENT_STATUS", targetTable: "events", targetId: id, newValues: { status: newStatus } });
  return await exports.getEventById(id);
};

// ── Soft Delete Event ────────────────────────────────────────
exports.deleteEvent = async (id, deletedBy) => {
  const event = await Event.findOne({ where: { id } });
  if (!event) throw { status: 404, message: "Event not found" };

  if (event.status === "completed")
    throw { status: 400, message: "Cannot delete a completed event" };

  await event.update({
    is_deleted: 1,
    deleted_at: new Date(),
    deleted_by: deletedBy,
  });

  auditLog.log({ userId: deletedBy, action: "DELETE_EVENT", targetTable: "events", targetId: id });
  return { message: "Event deleted successfully." };
};

// ── Get All Event Categories ─────────────────────────────────
exports.getAllCategories = async () => {
  return await EventCategory.findAll({ order: [["name", "ASC"]] });
};

exports.getCategoryById = async (id) => {
  const category = await EventCategory.findByPk(id);
  if (!category) throw { status: 404, message: "Event category not found" };
  return category;
};

exports.createCategory = async (data) => {
  const { name, description } = data;
  const existing = await EventCategory.findOne({ where: { name } });
  if (existing) throw { status: 409, message: "Category name already exists" };
  return await EventCategory.create({ name, description: description || null });
};

exports.updateCategory = async (id, data) => {
  const category = await EventCategory.findByPk(id);
  if (!category) throw { status: 404, message: "Event category not found" };
  const { name, description } = data;
  if (name && name !== category.name) {
    const existing = await EventCategory.findOne({ where: { name } });
    if (existing) throw { status: 409, message: "Category name already exists" };
  }
  await category.update({ ...(name && { name }), ...(description !== undefined && { description }) });
  return category;
};

exports.deleteCategory = async (id) => {
  const category = await EventCategory.findByPk(id);
  if (!category) throw { status: 404, message: "Event category not found" };
  const inUse = await Event.count({ where: { category_id: id } });
  if (inUse > 0)
    throw { status: 400, message: `Cannot delete category. ${inUse} event(s) are using it` };
  await category.destroy();
  return { message: "Event category deleted successfully." };
};

// ── Event Registrations ──────────────────────────────────────
exports.getEventRegistrations = async (eventId) => {
  const event = await Event.findOne({ where: { id: eventId } });
  if (!event) throw { status: 404, message: "Event not found" };
  return await EventRegistration.findAll({
    where: { event_id: eventId },
    include: [{ model: Member, as: "member", attributes: ["id", "first_name", "last_name", "email", "phone"], required: false }],
    order: [["registered_at", "ASC"]],
  });
};

exports.registerMember = async (eventId, memberId, registeredBy) => {
  const event = await Event.findOne({ where: { id: eventId } });
  if (!event) throw { status: 404, message: "Event not found" };
  if (event.status !== "published")
    throw { status: 400, message: "Event is not open for registration" };
  if (event.registration_deadline && new Date() > event.registration_deadline)
    throw { status: 400, message: "Registration deadline has passed" };
  const member = await Member.findByPk(memberId);
  if (!member) throw { status: 404, message: "Member not found" };
  const existing = await EventRegistration.findOne({ where: { event_id: eventId, member_id: memberId } });
  if (existing) throw { status: 409, message: "Member already registered for this event" };
  if (event.capacity) {
    const count = await EventRegistration.count({ where: { event_id: eventId } });
    if (count >= event.capacity) throw { status: 400, message: "Event has reached full capacity" };
  }
  const reg = await EventRegistration.create({ event_id: eventId, member_id: memberId, registered_at: new Date() });
  auditLog.log({ userId: registeredBy, action: "REGISTER_EVENT", targetTable: "event_registrations", targetId: reg.id, newValues: { event_id: eventId, member_id: memberId } });
  return reg;
};

exports.unregisterMember = async (eventId, memberId, unregisteredBy) => {
  const registration = await EventRegistration.findOne({ where: { event_id: eventId, member_id: memberId } });
  if (!registration) throw { status: 404, message: "Registration not found" };
  await registration.destroy();
  auditLog.log({ userId: unregisteredBy, action: "UNREGISTER_EVENT", targetTable: "event_registrations", targetId: null, newValues: { event_id: eventId, member_id: memberId } });
  return { message: "Member unregistered from event successfully." };
};
