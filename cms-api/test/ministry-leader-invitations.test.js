"use strict";

const express = require("express");
const request = require("supertest");

let mockRequestUser;

jest.mock("../src/middlewares/verifyToken", () => (req, res, next) => {
  req.user = mockRequestUser;
  next();
});
jest.mock("../src/helpers/permissionCache.helper", () => ({ get: jest.fn() }));
jest.mock("../src/services/leader-access.service", () => ({
  getLeaderProfilePermissions: jest.fn(),
}));
jest.mock("../src/helpers/auditLog.helper", () => ({ log: jest.fn() }));
jest.mock("../src/helpers/logger", () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));
jest.mock("../src/services/notifications.service", () => ({
  createNotification: jest.fn(),
}));

const permissionCache = require("../src/helpers/permissionCache.helper");
const ministryRoutes = require("../src/routes/ministry.routes");
const inviteRoutes = require("../src/routes/ministry-invites.routes");
const ministryService = require("../src/services/ministry.service");
const invitesService = require("../src/services/ministry-invites.service");
const {
  Event,
  Member,
  MinistryEventInvite,
  MinistryMembership,
  MinistryRole,
  User,
} = require("../src/models");

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/ministry", ministryRoutes);
  app.use("/api/events", inviteRoutes);
  app.use((error, req, res, next) => {
    res.status(error.status || 500).json({ message: error.message, code: error.code });
  });
  return app;
};

const assignedLeader = () => ({
  userId: 9,
  roleId: 8,
  roleName: "Ministry Leader",
  leadsMinistryId: 7,
  memberId: null,
});

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  mockRequestUser = assignedLeader();
  // Deliberately omit scope_assignments:manage. The role's assigned-ministry
  // capability must not depend on that global roster-administration grant.
  permissionCache.get.mockResolvedValue(new Set([
    "ministry:read",
    "events:read",
    "events:invite",
  ]));
});

describe("assigned Ministry Leader roster writes", () => {
  test("allows adding a member without the global scope-management grant", async () => {
    const membership = { id: 31, ministry_role_id: 7, member_id: 42 };
    jest.spyOn(ministryService, "addMemberToMinistry").mockResolvedValue(membership);

    const response = await request(createApp())
      .post("/api/ministry/members")
      .send({ member_id: 42 });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ success: true, data: membership });
    expect(ministryService.addMemberToMinistry).toHaveBeenCalledWith(7, 42, 9);
  });

  test("allows removing a member only through the assigned-ministry scope", async () => {
    const result = { message: "Ministry membership archived and retained in Archives." };
    jest.spyOn(ministryService, "archiveMemberFromMinistry").mockResolvedValue(result);

    const response = await request(createApp())
      .patch("/api/ministry/members/42/archive")
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: result });
    expect(ministryService.archiveMemberFromMinistry).toHaveBeenCalledWith(7, "42", 9);
  });

  test("denies roster writes for a Ministry Leader without an assigned ministry", async () => {
    mockRequestUser = { ...assignedLeader(), leadsMinistryId: null };
    const add = jest.spyOn(ministryService, "addMemberToMinistry");

    const response = await request(createApp())
      .post("/api/ministry/members")
      .send({ member_id: 42 });

    expect(response.status).toBe(403);
    expect(add).not.toHaveBeenCalled();
  });
});

describe("ministry roster candidate and membership boundaries", () => {
  test("creates a ministry-scoped membership instead of rejecting membership in another ministry", async () => {
    const created = { id: 31, ministry_role_id: 7, member_id: 42, added_by: 9 };
    jest.spyOn(MinistryRole, "findOne").mockResolvedValue({ id: 7, name: "Choir" });
    jest.spyOn(Member, "findByPk").mockResolvedValue({ id: 42, status: "Active", is_deleted: 0 });
    const lookup = jest.fn().mockResolvedValue(null);
    jest.spyOn(MinistryMembership, "unscoped").mockReturnValue({ findOne: lookup });
    jest.spyOn(MinistryMembership, "create").mockResolvedValue(created);

    await expect(ministryService.addMemberToMinistry(7, 42, 9)).resolves.toBe(created);

    expect(lookup).toHaveBeenCalledWith({
      where: { ministry_role_id: 7, member_id: 42 },
    });
    expect(MinistryMembership.create).toHaveBeenCalledWith({
      ministry_role_id: 7,
      member_id: 42,
      added_by: 9,
    });
  });

  test("searches active candidates using only the assigned ministry's exclusions", async () => {
    const candidates = [{ id: 42, first_name: "Jamie", last_name: "Example", status: "Active" }];
    jest.spyOn(MinistryMembership, "findAll").mockResolvedValue([]);
    jest.spyOn(Member, "findAll").mockResolvedValue(candidates);

    await expect(ministryService.searchMembersForRoster("jamie", 7)).resolves.toBe(candidates);

    expect(MinistryMembership.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { ministry_role_id: 7 },
    }));
    expect(Member.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ is_deleted: 0, status: "Active" }),
    }));
  });
});

describe("Ministry Leader event invitations", () => {
  test("denies invite reads for a Ministry Leader without an assigned ministry", async () => {
    mockRequestUser = { ...assignedLeader(), leadsMinistryId: null };
    const readInvites = jest.spyOn(invitesService, "getInvitesByEvent")
      .mockResolvedValue([{ id: 12, ministry_role_id: 999, member_id: 42 }]);

    const response = await request(createApp()).get("/api/events/5/invites");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: "No ministry is assigned to this account",
    });
    expect(readInvites).not.toHaveBeenCalled();
  });

  test("allows authorized administrators to read event-wide invites without a ministry assignment", async () => {
    mockRequestUser = { ...assignedLeader(), roleName: "System Admin", leadsMinistryId: null };
    const invites = [{ id: 12, ministry_role_id: 7, member_id: 42 }];
    jest.spyOn(invitesService, "getInvitesByEvent").mockResolvedValue(invites);

    const response = await request(createApp()).get("/api/events/5/invites");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: invites });
    expect(invitesService.getInvitesByEvent).toHaveBeenCalledWith("5", null);
  });

  test("accepts the UI member_ids payload and ignores a different client ministry ID", async () => {
    const result = { created: [42], skipped: [], errors: [] };
    jest.spyOn(invitesService, "createInvites").mockResolvedValue(result);

    const response = await request(createApp())
      .post("/api/events/5/invites")
      .send({ ministry_role_id: 999, member_ids: [42], response_deadline: null });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ success: true, data: result });
    expect(invitesService.createInvites).toHaveBeenCalledWith(
      "5",
      { member_ids: [42], ministry_role_id: 999, response_deadline: null },
      9,
      7,
    );
  });

  test("returns event invite candidates for the assigned ministry", async () => {
    const candidates = [{ id: 42, first_name: "Jamie", last_name: "Example" }];
    jest.spyOn(invitesService, "getInviteCandidates").mockResolvedValue(candidates);

    const response = await request(createApp()).get("/api/events/5/invite-candidates");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: candidates });
    expect(invitesService.getInviteCandidates).toHaveBeenCalledWith("5", 7);
  });

  test("invites an active church member even when they are not already on this roster", async () => {
    jest.spyOn(Event, "findByPk").mockResolvedValue({ id: 5, title: "Community Gathering" });
    jest.spyOn(MinistryRole, "findOne").mockResolvedValue({ id: 7, name: "Choir" });
    jest.spyOn(Member, "findAll").mockResolvedValue([{ id: 42 }]);
    jest.spyOn(Member, "findByPk").mockResolvedValue({ id: 42, status: "Active", is_deleted: 0 });
    // The old implementation stops here when the member belongs elsewhere (or
    // has not joined this roster yet). It is intentionally absent to reproduce
    // the reported refusal for an otherwise active, invitable member.
    jest.spyOn(MinistryMembership, "findOne").mockResolvedValue(null);
    jest.spyOn(MinistryEventInvite, "findOne").mockResolvedValue(null);
    jest.spyOn(MinistryEventInvite, "create").mockResolvedValue({ id: 12 });
    jest.spyOn(User, "findOne").mockResolvedValue(null);

    const result = await invitesService.createInvites(
      5,
      { ministry_role_id: 999, member_ids: [42], response_deadline: null },
      9,
      7,
    );

    expect(result).toEqual({ created: [42], skipped: [], errors: [] });
    expect(MinistryEventInvite.create).toHaveBeenCalledWith({
      event_id: 5,
      ministry_role_id: 7,
      member_id: 42,
      invited_by: 9,
      response_status: "pending",
      response_deadline: null,
    });
  });
});
