const request = require('supertest');
const app = require('../app');

describe('API Routes', () => {
  describe('GET /search', () => {
    it('should return 400 if no parameters provided', async () => {
      const response = await request(app).get('/search');
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /searchPrunit', () => {
    it('should return 400 if no productId provided', async () => {
      const response = await request(app).get('/searchPrunit');
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /auth', () => {
    it('should return 400 if no id provided', async () => {
      const response = await request(app).get('/auth');
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Non-existent route', () => {
    it('should return 404 for non-existent route', async () => {
      const response = await request(app).get('/non-existent-route');
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe(404);
    });
  });
}); 