// ============================================
// BOXES CONTROLLER TESTS
// ============================================

const request = require('supertest');
const express = require('express');
const boxesRoutes = require('../../routes/boxes.routes');
const boxesService = require('../../services/boxes.service');

// Mock authentication middleware before requiring routes
jest.mock('../../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'technician',
      organisation_id: 'test-org-id'
    };
    next();
  },
  requireEditor: (req, res, next) => next(),
  requireAdmin: (req, res, next) => next()
}));

// Create test app
const app = express();
app.use(express.json());

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

  describe('POST /api/boxes/bulk-assign - Bulk assign boxes to object', () => {
    it('should assign multiple boxes to an object using qr_codes', async () => {
      const mockResponse = {
        success: true,
        count: 3,
        skipped: 0,
        data: [
          { id: 'box-1', qr_code: 'DSE-0001', object_id: 'object-id' },
          { id: 'box-2', qr_code: 'DSE-0002', object_id: 'object-id' },
          { id: 'box-3', qr_code: 'DSE-0003', object_id: 'object-id' }
        ]
      };

      boxesService.bulkAssignToObject.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/boxes/bulk-assign')
        .set('Authorization', 'Bearer test-token')
        .send({ 
          qr_codes: ['DSE-0001', 'DSE-0002', 'DSE-0003'],
          object_id: 'object-id' 
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(3);
      expect(response.body.skipped).toBe(0);
    });

    it('should assign multiple boxes to an object using box_ids (legacy)', async () => {
      const mockResponse = {
        success: true,
        count: 3,
        skipped: 0,
        data: [
          { id: 'box-1', object_id: 'object-id' },
          { id: 'box-2', object_id: 'object-id' },
          { id: 'box-3', object_id: 'object-id' }
        ]
      };

      boxesService.bulkAssignToObject.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/boxes/bulk-assign')
        .set('Authorization', 'Bearer test-token')
        .send({ 
          box_ids: ['box-1', 'box-2', 'box-3'],
          object_id: 'object-id' 
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(3);
      expect(response.body.skipped).toBe(0);
    });

    it('should return error if neither qr_codes nor box_ids is provided', async () => {
      const response = await request(app)
        .post('/api/boxes/bulk-assign')
        .set('Authorization', 'Bearer test-token')
        .send({ object_id: 'object-id' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('qr_codes oder box_ids');
    });

    it('should return error if object_id is not provided', async () => {
      const response = await request(app)
        .post('/api/boxes/bulk-assign')
        .set('Authorization', 'Bearer test-token')
        .send({ box_ids: ['box-1', 'box-2'] });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('object_id');
    });

    it('should return error if qr_codes array is empty', async () => {
      const response = await request(app)
        .post('/api/boxes/bulk-assign')
        .set('Authorization', 'Bearer test-token')
        .send({ 
          qr_codes: [],
          object_id: 'object-id' 
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('qr_codes oder box_ids');
    });

    it('should return error if trying to assign more than 100 boxes', async () => {
      const boxIds = Array.from({ length: 101 }, (_, i) => `box-${i}`);
      
      const response = await request(app)
        .post('/api/boxes/bulk-assign')
        .set('Authorization', 'Bearer test-token')
        .send({ 
          box_ids: boxIds,
          object_id: 'object-id' 
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('100');
    });

    it('should handle partial success when some boxes are already assigned', async () => {
      const mockResponse = {
        success: true,
        count: 2,
        skipped: 1,
        data: [
          { id: 'box-1', object_id: 'object-id' },
          { id: 'box-2', object_id: 'object-id' }
        ]
      };

      boxesService.bulkAssignToObject.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/boxes/bulk-assign')
        .set('Authorization', 'Bearer test-token')
        .send({ 
          box_ids: ['box-1', 'box-2', 'box-3'],
          object_id: 'object-id' 
        });

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(2);
      expect(response.body.skipped).toBe(1);
    });
  });

  describe('GET /api/boxes/pool - Get pool boxes', () => {
    it('should return only boxes without object_id and with valid qr_codes', async () => {
      const mockPoolBoxes = [
        {
          id: 'box-1',
          qr_code: 'DSE-0001',
          number: 1,
          object_id: null,
          status: 'active'
        },
        {
          id: 'box-2',
          qr_code: 'DSE-0002',
          number: 2,
          object_id: null,
          status: 'active'
        }
      ];

      boxesService.getPoolBoxes.mockResolvedValue({
        success: true,
        data: mockPoolBoxes
      });

      const response = await request(app)
        .get('/api/boxes/pool')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].qr_code).toBe('DSE-0001');
      expect(response.body[0].object_id).toBeNull();
      expect(response.body[1].qr_code).toBe('DSE-0002');
      expect(response.body[1].object_id).toBeNull();
    });

    it('should not return boxes without qr_code', async () => {
      boxesService.getPoolBoxes.mockResolvedValue({
        success: true,
        data: [] // Backend filters out boxes without qr_code
      });

      const response = await request(app)
        .get('/api/boxes/pool')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });
  });
});
