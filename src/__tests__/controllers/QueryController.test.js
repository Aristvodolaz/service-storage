const { executeOpenQuery, executeCustomQuery } = require('../../controllers/QueryController');
const { mockPool, mockOpenQueryResult, mockEmptyResult, mockCustomQueryResult, mockQueryError } = require('../mocks/database');

// Мокаем модуль базы данных
jest.mock('../../config/database', () => ({
  pool: mockPool
}));

// Мокаем логгер
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn()
}));

describe('QueryController', () => {
  let req;
  let res;

  beforeEach(() => {
    // Сбрасываем моки перед каждым тестом
    jest.clearAllMocks();

    // Создаем моки для req и res
    req = {
      query: {},
      body: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('executeOpenQuery', () => {
    it('should return 400 if warehouseId is missing', async () => {
      req.query = { articleId: '13500' };

      await executeOpenQuery(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 400,
        message: expect.stringContaining('warehouseId')
      }));
    });

    it('should return 400 if articleId is missing', async () => {
      req.query = { warehouseId: 'WH001' };

      await executeOpenQuery(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 400,
        message: expect.stringContaining('articleId')
      }));
    });

    it('should return 404 if no data found', async () => {
      req.query = { warehouseId: 'WH002', articleId: '99999' };

      await executeOpenQuery(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 404,
        message: expect.stringContaining('не найдены')
      }));
    });

    it('should return 200 with data if found', async () => {
      req.query = { warehouseId: 'WH001', articleId: '13500' };

      await executeOpenQuery(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockOpenQueryResult.recordset);
    });

    it('should return 500 if database query fails', async () => {
      req.query = { warehouseId: 'ERROR', articleId: 'ERROR' };

      // Переопределяем мок для этого теста
      mockPool.request().query.mockRejectedValueOnce(mockQueryError);

      await executeOpenQuery(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 500,
        message: expect.stringContaining('Внутренняя ошибка')
      }));
    });
  });

  describe('executeCustomQuery', () => {
    it('should return 400 if query is missing', async () => {
      req.body = {};

      await executeCustomQuery(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 400,
        message: expect.stringContaining('SQL-запрос')
      }));
    });

    it('should return 200 with data for valid query', async () => {
      req.body = { query: 'SELECT 1 as test' };

      await executeCustomQuery(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        rowCount: mockCustomQueryResult.rowsAffected[0],
        data: mockCustomQueryResult.recordset
      });
    });

    it('should handle query with parameters', async () => {
      req.body = {
        query: 'SELECT * FROM products WHERE category_id = @categoryId',
        params: { categoryId: 5 }
      };

      await executeCustomQuery(req, res);

      expect(mockPool.request().input).toHaveBeenCalledWith('categoryId', 5);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 if database query fails', async () => {
      req.body = { query: 'SELECT ERROR' };

      // Переопределяем мок для этого теста
      mockPool.request().query.mockRejectedValueOnce(mockQueryError);

      await executeCustomQuery(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 500,
        message: expect.stringContaining('Внутренняя ошибка')
      }));
    });
  });
});
