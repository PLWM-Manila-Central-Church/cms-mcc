"use strict";

const { createServiceSchema, updateServiceSchema } = require("../src/validators/services.validator");

describe("calendar-derived service fields", () => {
  test("accepts an event-linked service without inventing time, capacity, or parking", () => {
    const { error, value } = createServiceSchema.validate({
      title: "Bible Retreat",
      service_date: "2026-10-31",
      service_time: null,
      capacity: null,
      total_parking_slots: null,
      event_id: 17,
      status: "draft",
    });
    expect(error).toBeUndefined();
    expect(value.event_id).toBe(17);
    expect(value.service_time).toBeNull();
    expect(value.capacity).toBeNull();
    expect(value.total_parking_slots).toBeNull();
  });

  test("continues to require a service date and validates supplied capacity", () => {
    expect(createServiceSchema.validate({ title: "Gathering" }).error).toBeDefined();
    expect(createServiceSchema.validate({ title: "Gathering", service_date: "2026-10-31", capacity: 0 }).error).toBeDefined();
  });

  test("allows clearing optional schedule fields during update", () => {
    const { error } = updateServiceSchema.validate({ service_time: null, capacity: null, total_parking_slots: null, event_id: null });
    expect(error).toBeUndefined();
  });
});
