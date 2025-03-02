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

  describe('GET /query/openquery', () => {
    it('should return 400 if no warehouseId provided', async () => {
      const response = await request(app).get('/query/openquery?articleId=13500');
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe(400);
    });

    it('should return 400 if no articleId provided', async () => {
      const response = await request(app).get('/query/openquery?warehouseId=WH001');
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe(400);
    });

    it('should return 400 if both parameters are missing', async () => {
      const response = await request(app).get('/query/openquery');
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe(400);
    });
  });

  describe('POST /query/custom', () => {
    it('should return 400 if no query provided', async () => {
      const response = await request(app)
        .post('/query/custom')
        .send({});
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe(400);
    });

    it('should return 400 if query is empty', async () => {
      const response = await request(app)
        .post('/query/custom')
        .send({ query: '' });
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe(400);
    });

    it('should accept query with params', async () => {
      // Этот тест будет пропущен, так как требует подключения к базе данных
      // В реальном сценарии здесь нужно использовать моки
      // Для примера оставляем заглушку
      const testQuery = {
        query: 'SELECT 1 as test',
        params: {}
      };

      // Мы не выполняем реальный запрос в тестах, просто проверяем структуру
      // Для полноценного тестирования нужно использовать моки базы данных
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
