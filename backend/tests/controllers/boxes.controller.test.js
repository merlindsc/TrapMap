// ============================================
// BOXES CONTROLLER TESTS
// ============================================

const request = require('supertest');
const express = require('express');
const boxesRoutes = require('../../routes/boxes.routes');
const boxesService = require('../../services/boxes.service');
const { createMockUser } = require('../setup');

// Create test app
const app = express();
app.use(express.json());

// Mock authentication middleware
jest.mock('../../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = createMockUser();
    next();
  },
  requireEditor: (req, res, next) => next(),
  requireAdmin: (req, res, next) => next()
}));

app.use('/api/boxes', boxesRoutes);

// Mock boxes service
jest.mock('../../services/boxes.service');

describe('Boxes Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/boxes', () => {
    it('should return all boxes', async () => {
      const mockBoxes = [
        {
          id: 'box-1',
          qr_code: 'TEST-001',
          number: 1,
          status: 'active',
          organisation_id: 'test-org-id'
        },
        {
          id: 'box-2',
          qr_code: 'TEST-002',
          number: 2,
          status: 'inactive',
          organisation_id: 'test-org-id'
        }
      ];

      boxesService.getAll.mockResolvedValue({
        success: true,
        data: mockBoxes
      });

      const response = await request(app)
        .get('/api/boxes')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].qr_code).toBe('TEST-001');
    });
  });

  describe('GET /api/boxes/:id', () => {
    it('should return a single box', async () => {
      const mockBox = {
        id: 'box-1',
        qr_code: 'TEST-001',
        number: 1,
        status: 'active',
        organisation_id: 'test-org-id'
      };

      boxesService.getOne.mockResolvedValue({
        success: true,
        data: mockBox
      });

      const response = await request(app)
        .get('/api/boxes/box-1')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.qr_code).toBe('TEST-001');
    });
  });

  describe('Box Status Validation', () => {
    const validStatuses = ['active', 'inactive', 'maintenance', 'storage'];

    validStatuses.forEach(status => {
      it(`should accept valid status: ${status}`, async () => {
        boxesService.update.mockResolvedValue({
          success: true,
          data: { id: 'box-1', status }
        });

        const response = await request(app)
          .patch('/api/boxes/box-1')
          .set('Authorization', 'Bearer test-token')
          .send({ status });

        expect(response.status).toBe(200);
      });
    });
  });

  describe('QR Code Format Validation', () => {
    it('should validate QR code format', async () => {
      const mockBox = {
        id: 'box-1',
        qr_code: 'TEST-QR-123',
        number: 1,
        status: 'active'
      };

      boxesService.getOne.mockResolvedValue({
        success: true,
        data: mockBox
      });

      const response = await request(app)
        .get('/api/boxes/box-1')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.qr_code).toMatch(/^[A-Z0-9-]+$/);
    });
  });

  describe('PUT /api/boxes/:id/move - Move box to another object', () => {
    it('should transfer box between objects', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'box-1',
          object_id: 'new-object-id',
          number: 1
        }
      };

      boxesService.moveToObject.mockResolvedValue(mockResponse);

      const response = await request(app)
        .put('/api/boxes/box-1/move')
        .set('Authorization', 'Bearer test-token')
        .send({ target_object_id: 'new-object-id' });

      expect(response.status).toBe(200);
      expect(response.body.object_id).toBe('new-object-id');
    });
  });

  describe('POST /api/boxes/:id/return-to-pool - Return box to storage', () => {
    it('should return box to pool', async () => {
      boxesService.returnToPool.mockResolvedValue({
        success: true,
        data: {
          id: 'box-1',
          object_id: null,
          status: 'storage'
        }
      });

      const response = await request(app)
        .post('/api/boxes/box-1/return-to-pool')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.object_id).toBeNull();
    });
  });

  describe('POST /api/boxes/:id/assign - Assign box to object', () => {
    it('should assign box to an object', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'box-1',
          object_id: 'object-id',
          status: 'active'
        }
      };

      boxesService.assignToObject.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/boxes/box-1/assign')
        .set('Authorization', 'Bearer test-token')
        .send({ object_id: 'object-id' });

      expect(response.status).toBe(200);
      expect(response.body.object_id).toBe('object-id');
    });
  });
});
