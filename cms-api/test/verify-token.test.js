const express = require('express');
const jwt = require('jsonwebtoken');

const mockModels = {
  User: { findByPk: jest.fn() },
  Role: {},
  Member: {},
  MinistryRole: {},
  CellGroup: {},
  MinistryGroup: {},
  UserLeaderAssignment: { findAll: jest.fn() },
};

jest.mock('../src/models', () => mockModels);

const verifyToken = require('../src/middlewares/verifyToken');

const createApp = () => {
  const app = express();
  app.get('/protected', verifyToken, (req, res) => res.json({ userId: req.user.userId }));
  return app;
};

describe('verifyToken account lifecycle', () => {
  const previousSecret = process.env.JWT_SECRET;

  beforeAll(() => { process.env.JWT_SECRET = 'verify-token-regression-test-secret'; });
  afterAll(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });
  beforeEach(() => {
    mockModels.User.findByPk.mockReset();
    mockModels.UserLeaderAssignment.findAll.mockReset();
  });

  const token = () => jwt.sign({ userId: 14 }, process.env.JWT_SECRET, { algorithm: 'HS256' });
  const userRow = (overrides = {}) => ({
    id: 14,
    email: 'verify-token@example.invalid',
    role_id: 7,
    member_id: 14,
    is_active: 1,
    is_deleted: 0,
    force_password_change: 0,
    leadership_revision: 0,
    role: { id: 7, role_name: 'Member', is_system: 0 },
    get: () => ({}),
    ...overrides,
  });

  it('rejects a soft-deleted user even if its active flag was left set', async () => {
    mockModels.User.findByPk.mockResolvedValue(userRow({ is_deleted: 1, is_active: 1 }));

    const response = await require('supertest')(createApp())
      .get('/protected')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Account deleted' });
  });

  it('rejects a deactivated account without changing active-account behavior', async () => {
    mockModels.User.findByPk.mockResolvedValue(userRow({ is_active: 0 }));

    const response = await require('supertest')(createApp())
      .get('/protected')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Account deactivated' });
  });

  it('continues to accept an active non-deleted account', async () => {
    mockModels.User.findByPk.mockResolvedValue(userRow());

    const response = await require('supertest')(createApp())
      .get('/protected')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ userId: 14 });
  });
});
