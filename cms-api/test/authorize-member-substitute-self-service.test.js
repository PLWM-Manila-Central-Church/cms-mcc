const authorize = require("../src/middlewares/authorize");
const authorizeMemberSubstituteSelfService = require("../src/middlewares/authorizeMemberSubstituteSelfService");

jest.mock("../src/middlewares/authorize", () => jest.fn());

describe("Member substitute self-service authorization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("allows an authenticated Member to reach the attached self-scoped handler", () => {
    const next = jest.fn();

    authorizeMemberSubstituteSelfService({ user: { roleName: "Member" } }, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(authorize).not.toHaveBeenCalled();
  });

  test("keeps the services:create permission check for non-Member roles", () => {
    const next = jest.fn();
    const guard = jest.fn((_req, _res, callback) => callback());
    authorize.mockReturnValue(guard);
    const req = { user: { roleName: "Registration Team" } };

    authorizeMemberSubstituteSelfService(req, {}, next);

    expect(authorize).toHaveBeenCalledWith("services", "create");
    expect(guard).toHaveBeenCalledWith(req, {}, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("preserves a non-Member 403 response when services:create is missing", () => {
    const next = jest.fn();
    const payload = { message: "Access forbidden" };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    authorize.mockReturnValue((_req, response) => response.status(403).json(payload));

    authorizeMemberSubstituteSelfService({ user: { roleName: "Finance Team" } }, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(payload);
    expect(next).not.toHaveBeenCalled();
  });
});
