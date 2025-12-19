// ============================================
// SCANS CONTROLLER TESTS
// ============================================

const request = require('supertest');
const express = require('express');
const scansRoutes = require('../../routes/scans.routes');
const scansService = require('../../services/scans.service');

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
  }
}));

// Create test app
const app = express();
app.use(express.json());

app.use('/api/scans', scansRoutes);

// Mock scans service
jest.mock('../../services/scans.service');

// Mock Supabase for photo uploads
jest.mock('../../config/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/photo.jpg' } }))
      }))
    }
  }
}));

describe('Scans Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/scans - Create scan with finding type', () => {
    it('should create a scan with finding type', async () => {
      const mockScan = {
        id: 'scan-1',
        box_id: 'box-1',
        user_id: 'user-1',
        finding_type: 'keine_auffaelligkeiten',
        scanned_at: new Date().toISOString()
      };

      scansService.create.mockResolvedValue({
        success: true,
        data: mockScan
      });

      const response = await request(app)
        .post('/api/scans')
        .set('Authorization', 'Bearer test-token')
        .send({
          box_id: 'box-1',
          finding_type: 'keine_auffaelligkeiten'
        });

      expect(response.status).toBe(201);
      expect(response.body.finding_type).toBe('keine_auffaelligkeiten');
    });
  });

  describe('Finding Types Validation', () => {
    const validFindingTypes = [
      'keine_auffaelligkeiten',
      'koeder_angefressen',
      'fang',
      'defekt',
      'verschoben',
      'beschaedigt',
      'fehlt'
    ];

    validFindingTypes.forEach(findingType => {
      it(`should accept valid finding type: ${findingType}`, async () => {
        const mockScan = {
          id: 'scan-1',
          box_id: 'box-1',
          finding_type: findingType,
          scanned_at: new Date().toISOString()
        };

        scansService.create.mockResolvedValue({
          success: true,
          data: mockScan
        });

        const response = await request(app)
          .post('/api/scans')
          .set('Authorization', 'Bearer test-token')
          .send({
            box_id: 'box-1',
            finding_type: findingType
          });

        expect(response.status).toBe(201);
        expect(response.body.finding_type).toBe(findingType);
      });
    });
  });

  describe('GET /api/scans/box/:boxId - Get scan history for box', () => {
    it('should retrieve scan history for a box', async () => {
      const mockScans = [
        {
          id: 'scan-1',
          box_id: 'box-1',
          finding_type: 'keine_auffaelligkeiten',
          scanned_at: new Date().toISOString()
        },
        {
          id: 'scan-2',
          box_id: 'box-1',
          finding_type: 'koeder_angefressen',
          scanned_at: new Date(Date.now() - 86400000).toISOString()
        }
      ];

      scansService.getHistoryForBox.mockResolvedValue({
        success: true,
        data: mockScans
      });

      const response = await request(app)
        .get('/api/scans/box/box-1')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].box_id).toBe('box-1');
    });
  });

  describe('Timestamp Auto-generation', () => {
    it('should automatically set timestamp when creating scan', async () => {
      const now = new Date();
      const mockScan = {
        id: 'scan-1',
        box_id: 'box-1',
        finding_type: 'keine_auffaelligkeiten',
        scanned_at: now.toISOString()
      };

      scansService.create.mockResolvedValue({
        success: true,
        data: mockScan
      });

      const response = await request(app)
        .post('/api/scans')
        .set('Authorization', 'Bearer test-token')
        .send({
          box_id: 'box-1',
          finding_type: 'keine_auffaelligkeiten'
        });

      expect(response.status).toBe(201);
      expect(response.body.scanned_at).toBeDefined();
      
      // Verify timestamp is within last 5 seconds
      const timestamp = new Date(response.body.scanned_at);
      const diff = Math.abs(now - timestamp);
      expect(diff).toBeLessThan(5000);
    });
  });

  describe('GET /api/scans - Get scan history', () => {
    it('should retrieve recent scan history', async () => {
      const mockScans = [
        {
          id: 'scan-1',
          box_id: 'box-1',
          finding_type: 'fang',
          scanned_at: new Date().toISOString()
        },
        {
          id: 'scan-2',
          box_id: 'box-2',
          finding_type: 'keine_auffaelligkeiten',
          scanned_at: new Date(Date.now() - 86400000).toISOString()
        }
      ];

      scansService.getRecent.mockResolvedValue({
        success: true,
        data: mockScans
      });

      const response = await request(app)
        .get('/api/scans')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should support limit parameter', async () => {
      scansService.getRecent.mockResolvedValue({
        success: true,
        data: []
      });

      await request(app)
        .get('/api/scans?limit=10')
        .set('Authorization', 'Bearer test-token');

      expect(scansService.getRecent).toHaveBeenCalledWith('test-org-id', 10);
    });
  });
});
