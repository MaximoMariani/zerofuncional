/**
 * Tests: Orders endpoints
 */
require('./helpers');
const request = require('supertest');
const app = require('../src/app');
const { makeToken } = require('./helpers');

jest.mock('../src/services/orderService', () => ({
  list: jest.fn(),
  getById: jest.fn(),
  markPacked: jest.fn(),
}));
jest.mock('../src/services/auditService', () => ({ audit: jest.fn() }));

const orderService = require('../src/services/orderService');

const adminToken = makeToken({ id: 1, role: 'admin' });
const viewerToken = makeToken({ id: 3, role: 'viewer' });

describe('GET /api/orders', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
  });

  it('returns paginated orders list', async () => {
    orderService.list.mockResolvedValueOnce({
      data: [{ id: 1, customer_name: 'Test', status: 'pending' }],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 },
    });
    const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.data).toHaveLength(1);
  });

  it('accepts valid query filters', async () => {
    orderService.list.mockResolvedValueOnce({ data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });
    const res = await request(app)
      .get('/api/orders?status=pending&page=2&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(orderService.list).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending', page: 2, limit: 10 }));
  });

  it('rejects invalid status filter with 422', async () => {
    const res = await request(app)
      .get('/api/orders?status=invalid_status')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(422);
  });
});

describe('PATCH /api/orders/:id/pack', () => {
  it('returns 403 for viewer role', async () => {
    const res = await request(app)
      .patch('/api/orders/1/pack')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 when order not found', async () => {
    orderService.markPacked.mockRejectedValueOnce(Object.assign(new Error('Order not found'), { status: 404, expose: true }));
    const res = await request(app)
      .patch('/api/orders/999/pack')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('returns 409 when order already packed', async () => {
    orderService.markPacked.mockRejectedValueOnce(Object.assign(new Error('Order is already packed'), { status: 409, expose: true }));
    const res = await request(app)
      .patch('/api/orders/1/pack')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(409);
  });

  it('packs order successfully', async () => {
    orderService.markPacked.mockResolvedValueOnce({ id: 1, status: 'packed' });
    const res = await request(app)
      .patch('/api/orders/1/pack')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('packed');
  });
});
