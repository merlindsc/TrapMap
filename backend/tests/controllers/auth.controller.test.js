// ============================================
// AUTH CONTROLLER TESTS
// ============================================

const request = require('supertest');
const express = require('express');
const authService = require('../../services/auth.service');

// Mock auth service
jest.mock('../../services/auth.service');

// Mock authentication middleware
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

const authRoutes = require('../../routes/auth.routes');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should require email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('E-Mail');
    });

    it('should require password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Passwort');
    });

    it('should validate password length (minimum 8 characters)', async () => {
      authService.login.mockResolvedValue({
        success: false,
        message: 'Passwort muss mindestens 8 Zeichen haben'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'short'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return token on successful login', async () => {
      const mockResponse = {
        success: true,
        token: 'test-jwt-token',
        refreshToken: 'test-refresh-token',
        user: {
          id: 'user-id',
          email: 'test@example.com',
          role: 'technician'
        }
      };

      authService.login.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBe('test-jwt-token');
      expect(response.body.refreshToken).toBe('test-refresh-token');
      expect(response.body.user).toBeDefined();
    });

    it('should return 401 for invalid credentials', async () => {
      authService.login.mockResolvedValue({
        success: false,
        message: 'Ungültige Anmeldedaten'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('should validate new password length', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer test-token')
        .send({
          currentPassword: 'oldpassword123',
          newPassword: 'short'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('mindestens 8 Zeichen');
    });
  });

  describe('POST /api/auth/set-password', () => {
    it('should validate new password length', async () => {
      const response = await request(app)
        .post('/api/auth/set-password')
        .set('Authorization', 'Bearer test-token')
        .send({
          newPassword: 'short'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('mindestens 8 Zeichen');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should validate new password length', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'reset-token',
          newPassword: 'short'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('mindestens 8 Zeichen');
    });
  });
});
