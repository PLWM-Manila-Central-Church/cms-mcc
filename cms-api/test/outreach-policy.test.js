"use strict";
const { findAbsenceEpisode, getOutcome, isFinalized, normalizePhone, hasSmsConsent, reminderWindow, reminderIsDue, renderMessage, DEFAULTS, key } = require("../src/modules/outreach/policy");
const session = { status: "closed", expected_roster_frozen_at: new Date(), finalized_at: new Date(), finalized_revision: 4, activity_revision: 4 };
const rows = (outcomes) => outcomes.map((outcome, index) => ({ outcome, session_id: index + 1, starts_at: new Date(Date.UTC(2026, 9, index + 1)), status: "closed" }));
describe("absence follow-up policy", () => {
  test("one absence does not create a case", () => expect(findAbsenceEpisode(1, "weekly", rows(["absent"]))).toBeNull());
  test("two eligible finalized absences create one stable episode", () => {
    const result = findAbsenceEpisode(1, "weekly", rows(["absent", "absent"]));
    expect(result).toMatchObject({ episode_start_session_id: 1, trigger_session_id: 2, absence_count: 2 });
  });
  test.each(["present", "excused", "pending"])("%s interrupts the absence episode", (outcome) => {
    expect(findAbsenceEpisode(1, "weekly", rows(["absent", outcome, "absent"]))).toBeNull();
    expect(findAbsenceEpisode(1, "weekly", rows(["absent", "absent", outcome]))).toBeNull();
  });
  test("additional absences reuse the same episode and original trigger", () => {
    const first = findAbsenceEpisode(1, "weekly", rows(["absent", "absent"]));
    const later = findAbsenceEpisode(1, "weekly", rows(["absent", "absent", "absent", "absent"]));
    expect(later.episode_key).toBe(first.episode_key);
    expect(later.trigger_session_id).toBe(2);
    expect(later.absence_count).toBe(4);
  });
  test("a new streak after present gets a different episode", () => {
    const first = findAbsenceEpisode(1, "weekly", rows(["absent", "absent"]));
    const next = findAbsenceEpisode(1, "weekly", rows(["absent", "absent", "present", "absent", "absent"]));
    expect(next.episode_key).not.toBe(first.episode_key);
    expect(next.episode_start_session_id).toBe(4);
  });
  test("series and members cannot share an episode key", () => {
    const history = rows(["absent", "absent"]);
    expect(findAbsenceEpisode(1, "weekly", history).episode_key).not.toBe(findAbsenceEpisode(2, "weekly", history).episode_key);
    expect(findAbsenceEpisode(1, "weekly", history).episode_key).not.toBe(findAbsenceEpisode(1, "seminar", history).episode_key);
  });
  test("actual start times, rather than numerical IDs, order gatherings", () => {
    const history = [{ session_id: 100, starts_at: "2026-10-01", outcome: "absent" }, { session_id: 5, starts_at: "2026-10-03", outcome: "present" }, { session_id: 20, starts_at: "2026-10-02", outcome: "absent" }];
    expect(findAbsenceEpisode(1, "weekly", history)).toBeNull();
  });
  test("cancelled gatherings do not become absences or reset eligible attendance", () => {
    const history = rows(["absent", "pending", "absent"]); history[1].status = "cancelled";
    expect(findAbsenceEpisode(1, "weekly", history).absence_count).toBe(2);
  });
  test("only current finalized and frozen attendance is authoritative", () => {
    expect(isFinalized(session)).toBe(true);
    for (const changed of [{ finalized_at: null }, { finalized_revision: 3 }, { expected_roster_frozen_at: null }, { status: "open" }]) {
      expect(isFinalized({ ...session, ...changed })).toBe(false);
      expect(getOutcome({ session: { ...session, ...changed }, present: false })).toBe("pending");
    }
  });
  test("confirmed presence takes priority over an obsolete exception", () => {
    expect(getOutcome({ session, present: true, exception: "excused" })).toBe("present");
    expect(getOutcome({ session, present: false, exception: "excused" })).toBe("excused");
    expect(getOutcome({ session, present: false, exception: "pending" })).toBe("pending");
    expect(getOutcome({ session, present: false, exception: "cleared" })).toBe("absent");
  });
});
describe("contact consent and reminder evaluation (no provider calls)", () => {
  test.each(["09123456789", "+639123456789", "639123456789", "0912 345 6789"])("normalizes %s", (value) => expect(normalizePhone(value)).toBe("+639123456789"));
  test.each(["", "9123456789", "+1234567890", "091234567890", "not a number"])("rejects invalid mobile %s", (value) => expect(normalizePhone(value)).toBeNull());
  test("consent is false by default and tied to the current phone", () => {
    const member = { status: "Active", phone: "09123456789" };
    const consent = { sms_enabled: true, consent_at: new Date(), consent_phone: "+639123456789" };
    expect(hasSmsConsent(member, null)).toBe(false);
    expect(hasSmsConsent(member, consent)).toBe(true);
    expect(hasSmsConsent({ ...member, phone: "09999999999" }, consent)).toBe(false);
    expect(hasSmsConsent(member, { ...consent, opted_out_at: new Date() })).toBe(false);
    expect(hasSmsConsent({ ...member, status: "Inactive" }, consent)).toBe(false);
    expect(hasSmsConsent({ ...member, is_deleted: 1 }, consent)).toBe(false);
  });
  test("reminders use 09:00 Manila on the calendar day before the session", () => {
    const activity = { starts_at: "2026-10-25T02:00:00Z", status: "draft", expected_basis: "explicit_roster" };
    expect(reminderWindow(activity, 3).due.toISOString()).toBe("2026-10-22T01:00:00.000Z");
    expect(reminderWindow(activity, 1).due.toISOString()).toBe("2026-10-24T01:00:00.000Z");
    const policy = { reminders_enabled: true, reminders_enabled_at: "2026-10-21T01:00:00Z" };
    expect(reminderIsDue(policy, activity, 3, DEFAULTS, new Date("2026-10-22T01:01:00Z"))).toBe(true);
    expect(reminderIsDue(policy, activity, 3, DEFAULTS, new Date("2026-10-23T01:01:00Z"))).toBe(false);
    expect(reminderIsDue({ ...policy, reminders_enabled_at: "2026-10-22T02:00:00Z" }, activity, 3, DEFAULTS, new Date("2026-10-22T03:00:00Z"))).toBe(false);
    expect(reminderIsDue(policy, { ...activity, expected_basis: "none" }, 3, DEFAULTS, new Date("2026-10-22T02:00:00Z"))).toBe(false);
  });
  test("reminder keys distinguish each interval and recipient", () => {
    expect(key("reminder", 1, 3, 20)).not.toBe(key("reminder", 1, 1, 20));
    expect(key("reminder", 1, 3, 20)).not.toBe(key("reminder", 1, 3, 21));
  });
  test("template rendering removes controls and bounds personalized content", () => {
    const message = renderMessage(DEFAULTS.reminder_template, { first_name: "QA\nMember" }, { starts_at: "2026-10-25T02:00:00Z", target: { title: "Weekly Service", venue: "Main Hall" } });
    expect(message).toContain("QA Member"); expect(message).toContain("Weekly Service");
    expect(message).toContain("10:00"); expect(message).not.toContain("{{");
    expect(message.length).toBeLessThanOrEqual(480);
  });
});
