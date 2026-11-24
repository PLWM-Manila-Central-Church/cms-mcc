"use strict";

const { Op } = require("sequelize");
const { Event, EventRegistration, EventCategory, Attendance, Service, Member } = require("../models");
const { fillRate, attendanceRate, cumulativeSeries, sumBy } = require("../helpers/registrationAnalytics.helper");

const manilaToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

const defaultRange = ({ from, to } = {}) => {
  const end = to || manilaToday();
  const start = from || new Date(new Date(`${end}T00:00:00Z`).getTime() - 89 * 86400000).toISOString().slice(0, 10);
  return { from: start, to: end };
};

const decorateEvent = (event, registrations) => {
  const rows = registrations.filter((row) => Number(row.event_id) === Number(event.id));
  const registered = rows.length;
  const seats = rows.filter((row) => row.seat_number != null).length;
  const parking = rows.filter((row) => row.parking_slot != null).length;
  return {
    id: event.id,
    title: event.title,
    category: event.category?.name || "Uncategorised",
    start_date: String(event.start_date).slice(0, 10),
    end_date: event.end_date ? String(event.end_date).slice(0, 10) : null,
    status: event.status,
    capacity: event.capacity || null,
    registered,
    seats,
    parking,
    fill_rate: fillRate(registered, event.capacity),
  };
};

exports.getOverview = async (rangeInput) => {
  const range = defaultRange(rangeInput);

  const events = await Event.findAll({
    where: { start_date: { [Op.between]: [range.from, range.to] }, status: { [Op.ne]: "Cancelled" } },
    include: [{ model: EventCategory, as: "category", attributes: ["id", "name"], required: false }],
    order: [["start_date", "DESC"]],
  });
  const eventIds = events.map((event) => event.id);
  const registrations = eventIds.length
    ? await EventRegistration.findAll({
      where: { event_id: { [Op.in]: eventIds } },
      attributes: ["event_id", "member_id", "registered_at", "seat_number", "parking_slot"],
    })
    : [];

  const regsByEvent = new Map();
  for (const r of registrations) {
    const key = Number(r.event_id);
    if (!regsByEvent.has(key)) regsByEvent.set(key, []);
    regsByEvent.get(key).push(r);
  }
  const rows = events.map((event) => decorateEvent(event, regsByEvent.get(Number(event.id)) || []));
  const capacity = sumBy(rows, (row) => row.capacity);
  const registered = sumBy(rows, (row) => row.registered);

  const categories = new Map();
  for (const row of rows) {
    categories.set(row.category, (categories.get(row.category) || 0) + row.registered);
  }

  const services = await Service.findAll({
    where: { service_date: { [Op.between]: [range.from, range.to] } },
    attributes: ["id", "title", "service_date", "service_time", "capacity"],
    order: [["service_date", "DESC"]],
  });
  const attendance = services.length
    ? await Attendance.findAll({
      where: { service_id: { [Op.in]: services.map((service) => service.id) }, voided_at: null },
      attributes: ["service_id"],
    })
    : [];
  const attCounts = new Map();
  for (const a of attendance) {
    const key = Number(a.service_id);
    attCounts.set(key, (attCounts.get(key) || 0) + 1);
  }

  const serviceRows = services.map((service) => {
    const present = attCounts.get(Number(service.id)) || 0;
    return {
      id: service.id,
      title: service.title,
      date: String(service.service_date).slice(0, 10),
      present,
      capacity: service.capacity || null,
      rate: attendanceRate(present, service.capacity),
    };
  });

  return {
    range,
    events: rows,
    totals: {
      events: rows.length,
      registrations: registered,
      capacity,
      fill_rate: fillRate(registered, capacity),
      seats: sumBy(rows, (row) => row.seats),
      parking: sumBy(rows, (row) => row.parking),
    },
    categories: [...categories.entries()]
      .map(([label, total]) => ({ label, total }))
      .sort((left, right) => right.total - left.total),
    timeline: cumulativeSeries(registrations, range),
    attendance: {
      services_held: serviceRows.length,
      check_ins: sumBy(serviceRows, (row) => row.present),
      average: serviceRows.length ? Math.round(sumBy(serviceRows, (row) => row.present) / serviceRows.length) : 0,
      rows: serviceRows,
    },
  };
};

exports.getEvent = async (id) => {
  const event = await Event.findByPk(id, {
    include: [{ model: EventCategory, as: "category", attributes: ["id", "name"], required: false }],
  });
  if (!event) return null;

  const registrations = await EventRegistration.findAll({
    where: { event_id: id },
    attributes: ["id", "member_id", "registered_at", "seat_number", "parking_slot"],
    include: [{ model: Member, as: "member", attributes: ["id", "first_name", "last_name"], required: false }],
    order: [["registered_at", "ASC"]],
    limit: 500,
  });

  const start = String(event.start_date).slice(0, 10);
  const end = String(event.end_date || event.start_date).slice(0, 10);
  const range = { from: start < end ? start : end, to: start > end ? start : end };

  return {
    event: decorateEvent(event, registrations),
    timeline: cumulativeSeries(registrations, range),
    registrations: registrations.map((row) => ({
      id: row.id,
      name: row.member ? `${row.member.first_name} ${row.member.last_name}` : `Member #${row.member_id}`,
      registered_at: row.registered_at,
      seat_number: row.seat_number,
      parking_slot: row.parking_slot,
    })),
  };
};
