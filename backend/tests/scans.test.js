/**
 * Tests: Scan endpoint — happy path + error cases
 */
require('./helpers');
const request = require('supertest');
const app = require('../src/app');
const { makeToken } = require('./helpers');

jest.mock('../src/services/scanService', () => ({ processScan: jest.fn() }));
jest.mock('../src/services/auditService', () => ({ audit: jest.fn() }));

const scanService = require('../src/services/scanService');
const operatorToken = makeToken({ id: 2, role: 'operator' });
const viewerToken = makeToken({ id: 3, role: 'viewer' });

describe('POST /api/scans', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/scans').send({ orderId: 1, barcode: '123' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    const res = await request(app)
      .post('/api/scans')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ orderId: 1, barcode: '123' });
    expect(res.status).toBe(403);
  });

  it('returns 422 on missing barcode', async () => {
    const res = await request(app)
      .post('/api/scans')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ orderId: 1 });
    expect(res.status).toBe(422);
  });

  it('happy path: returns scan result on valid barcode', async () => {
    scanService.processScan.mockResolvedValueOnce({
      item: { id: 1, sku: 'PROD-001', barcode: '7790001000011', scanned_qty: 1, status: 'complete' },
      allItemsComplete: false,
      orderStatus: 'in_progress',
    });

    const res = await request(app)
      .post('/api/scans')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ orderId: 1, barcode: '7790001000011' });

    expect(res.status).toBe(200);
    expect(res.body.item.sku).toBe('PROD-001');
    expect(res.body.item.status).toBe('complete');
    expect(scanService.processScan).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 1, barcode: '7790001000011' })
    );
  });

  it('error path: returns 404 when barcode not found in order', async () => {
    scanService.processScan.mockRejectedValueOnce(
      Object.assign(new Error('Barcode 0000000 not found in this order'), { status: 404, expose: true })
    );

    const res = await request(app)
      .post('/api/scans')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ orderId: 1, barcode: '0000000' });

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('not found');
  });

  it('error path: returns 409 on duplicate scan', async () => {
    scanService.processScan.mockRejectedValueOnce(
      Object.assign(new Error('Item PROD-001 already fully scanned'), { status: 409, expose: true })
    );

    const res = await request(app)
      .post('/api/scans')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ orderId: 1, barcode: '7790001000011' });

    expect(res.status).toBe(409);
  });
});
