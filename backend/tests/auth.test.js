/**
 * Tests: Authentication endpoints
 */
require('./helpers');
const request = require('supertest');
const app = require('../src/app');

// Mock DB and services to isolate from real DB
jest.mock('../src/services/authService', () => ({
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
}));
jest.mock('../src/services/auditService', () => ({ audit: jest.fn() }));

const authService = require('../src/services/authService');

describe('POST /api/auth/login', () => {
  it('returns 422 on missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 422 on invalid email', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email', password: 'abc123' });
    expect(res.status).toBe(422);
  });

  it('returns 401 on bad credentials', async () => {
    authService.login.mockRejectedValueOnce(Object.assign(new Error('Invalid credentials'), { status: 401, expose: true }));
    const res = await request(app).post('/api/auth/login').send({ email: 'user@test.com', password: 'wrongpass' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns tokens on success', async () => {
    authService.login.mockResolvedValueOnce({
      accessToken: 'access.token.here',
      refreshToken: 'refresh.token.here',
      user: { id: 1, name: 'Admin', email: 'admin@test.com', role: 'admin' },
    });
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.role).toBe('admin');
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns user when authenticated', async () => {
    const { makeToken } = require('./helpers');
    const token = makeToken({ id: 1, email: 'admin@test.com', role: 'admin' });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: 1, role: 'admin' });
  });
});
