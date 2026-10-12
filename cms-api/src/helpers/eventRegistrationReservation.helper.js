"use strict";

const { Op } = require("sequelize");
const sequelize = require("../config/db");
const AppError = require("./AppError");
const { Event, EventRegistration, Member } = require("../models");

const normalizeSlot = (value, label) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const slot = Number(value);
  if (!Number.isSafeInteger(slot) || slot < 1) {
    throw AppError.badRequest("VALIDATION", `${label} must be a whole number greater than zero`);
  }
  return slot;
};

const lockOpenEvent = async (eventId, transaction, { checkRegistrationDeadline = true } = {}) => {
  const event = await Event.findOne({
    where: { id: eventId, is_deleted: 0 },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!event) throw AppError.notFound("RECORD_NOT_FOUND", "Event not found");

  if (!["Upcoming", "Ongoing"].includes(event.status)) {
    throw AppError.badRequest("VALIDATION", "Event is not open for registration");
  }
  if (checkRegistrationDeadline && event.registration_deadline && new Date() > new Date(event.registration_deadline)) {
    throw AppError.badRequest("VALIDATION", "Registration deadline has passed");
  }
  return event;
};

const resolveReservation = ({ event, memberId, current, seatNumber, parkingSlot, transaction }) => {
  const nextSeat = seatNumber === undefined
    ? (current?.seat_number == null ? null : Number(current.seat_number))
    : normalizeSlot(seatNumber, "Seat number");
  const nextParking = parkingSlot === undefined
    ? (current?.parking_slot == null ? null : Number(current.parking_slot))
    : normalizeSlot(parkingSlot, "Parking slot");

  return (async () => {
    if (nextSeat !== null) {
      const capacity = Number(event.capacity || 0);
      if (capacity < 1) {
        throw AppError.conflict("EVENT_SEAT_CAPACITY_REQUIRED", "Configure an event capacity before assigning seats");
      }
      if (nextSeat > capacity) {
        throw AppError.badRequest("VALIDATION", `Seat number must be between 1 and ${capacity}`);
      }
      const conflict = await EventRegistration.findOne({
        where: {
          event_id: event.id,
          member_id: { [Op.ne]: memberId },
          seat_number: nextSeat,
        },
        transaction,
      });
      if (conflict) {
        throw AppError.conflict("EVENT_SEAT_ALREADY_RESERVED", `Seat ${nextSeat} is already reserved`);
      }
    }

    if (nextParking !== null) {
      const parkingLimit = Number(event.total_parking_slots || 0);
      if (parkingLimit < 1 || nextParking > parkingLimit) {
        throw AppError.badRequest("VALIDATION", parkingLimit < 1
          ? "This event has no parking slots available"
          : `Parking slot must be between 1 and ${parkingLimit}`);
      }
      const conflict = await EventRegistration.findOne({
        where: {
          event_id: event.id,
          member_id: { [Op.ne]: memberId },
          parking_slot: nextParking,
        },
        transaction,
      });
      if (conflict) {
        throw AppError.conflict("EVENT_PARKING_ALREADY_RESERVED", `Parking slot ${nextParking} is already reserved`);
      }
    }

    return { seat_number: nextSeat, parking_slot: nextParking };
  })();
};

const registerEventMember = async ({ eventId, memberId, registeredBy = null, seatNumber, parkingSlot }) =>
  sequelize.transaction(async (transaction) => {
    const event = await lockOpenEvent(eventId, transaction);
    const member = await Member.findByPk(memberId, { transaction });
    if (!member) throw AppError.notFound("RECORD_NOT_FOUND", "Member not found");

    const existing = await EventRegistration.findOne({
      where: { event_id: eventId, member_id: memberId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (existing) throw AppError.conflict("DUPLICATE", "Member already registered for this event");

    if (event.capacity != null) {
      const count = await EventRegistration.count({ where: { event_id: eventId }, transaction });
      if (count >= Number(event.capacity)) {
        throw AppError.badRequest("VALIDATION", "Event has reached full capacity");
      }
    }

    const reservation = await resolveReservation({
      event, memberId, seatNumber, parkingSlot, transaction,
    });
    const registration = await EventRegistration.create({
      event_id: eventId,
      member_id: memberId,
      registered_at: new Date(),
      registered_by: registeredBy,
      ...reservation,
    }, { transaction });
    return { registration, eventTitle: event.title, created: true };
  });

const updateEventRegistrationReservation = async ({
  eventId,
  memberId,
  seatNumber,
  parkingSlot,
  allowAfterDeadline = false,
}) =>
  sequelize.transaction(async (transaction) => {
    const event = await lockOpenEvent(eventId, transaction, { checkRegistrationDeadline: !allowAfterDeadline });
    const registration = await EventRegistration.findOne({
      where: { event_id: eventId, member_id: memberId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!registration) throw AppError.notFound("EVENT_REGISTRATION_NOT_FOUND", "Event registration not found");

    const reservation = await resolveReservation({
      event, memberId, current: registration, seatNumber, parkingSlot, transaction,
    });
    await registration.update(reservation, { transaction });
    return { registration, eventTitle: event.title, created: false };
  });

const assertEventReservationLimits = async ({ event, capacity, totalParkingSlots, transaction }) => {
  const nextCapacity = capacity === undefined
    ? (event.capacity == null ? null : Number(event.capacity))
    : (capacity == null || capacity === "" ? null : Number(capacity));
  const nextParkingLimit = totalParkingSlots === undefined
    ? Number(event.total_parking_slots || 0)
    : Number(totalParkingSlots || 0);

  const where = { event_id: event.id };
  const [registrationCount, maxAssignedSeatValue, maxParkingSlotValue] = await Promise.all([
    EventRegistration.count({ where, transaction }),
    EventRegistration.max("seat_number", { where, transaction }),
    EventRegistration.max("parking_slot", { where, transaction }),
  ]);
  if (nextCapacity != null && registrationCount > nextCapacity) {
    throw AppError.conflict(
      "EVENT_CAPACITY_BELOW_CURRENT_REGISTRATIONS",
      `Capacity cannot be less than the ${registrationCount} current registrations`,
    );
  }

  const maxAssignedSeat = Number(maxAssignedSeatValue || 0);
  if (maxAssignedSeat > 0 && nextCapacity == null) {
    throw AppError.conflict(
      "EVENT_CAPACITY_REQUIRED_FOR_RESERVED_SEATS",
      "Set an event capacity before removing the limit while seats are reserved",
    );
  }
  if (nextCapacity != null && maxAssignedSeat > nextCapacity) {
    throw AppError.conflict(
      "EVENT_CAPACITY_BELOW_RESERVED_SEAT",
      `Capacity cannot be less than the highest reserved seat (${maxAssignedSeat})`,
    );
  }

  const maxParkingSlot = Number(maxParkingSlotValue || 0);
  if (nextParkingLimit < maxParkingSlot) {
    throw AppError.conflict(
      "EVENT_PARKING_LIMIT_BELOW_RESERVED_SLOT",
      `Parking slots cannot be less than the highest reserved slot (${maxParkingSlot})`,
    );
  }
};

module.exports = {
  assertEventReservationLimits,
  registerEventMember,
  updateEventRegistrationReservation,
};
