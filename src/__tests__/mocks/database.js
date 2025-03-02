/**
 * Моки для тестирования SQL-запросов
 */

// Мок для результата запроса OPENQUERY
const mockOpenQueryResult = {
  recordset: [
    {
      warehouse_id: 'WH001',
      article_id: '13500',
      pick_rule_id: 1,
      priority: 10,
      created_at: '2023-01-15T10:30:00.000Z',
      updated_at: '2023-01-15T10:30:00.000Z'
    },
    {
      warehouse_id: 'WH001',
      article_id: '13500',
      pick_rule_id: 2,
      priority: 20,
      created_at: '2023-01-15T10:30:00.000Z',
      updated_at: '2023-01-15T10:30:00.000Z'
    }
  ]
};

// Мок для пустого результата запроса
const mockEmptyResult = {
  recordset: []
};

// Мок для результата произвольного запроса
const mockCustomQueryResult = {
  recordset: [
    {
      id: 101,
      name: 'Бумага офисная А4',
      article: '13500',
      category_id: 5,
      price: 299.99
    },
    {
      id: 102,
      name: 'Ручка шариковая синяя',
      article: '22456',
      category_id: 5,
      price: 15.50
    }
  ],
  rowsAffected: [2]
};

// Мок для ошибки запроса
const mockQueryError = new Error('Ошибка выполнения SQL-запроса');

// Мок для пула соединений с базой данных
const mockPool = {
  request: jest.fn().mockReturnValue({
    input: jest.fn().mockReturnThis(),
    query: jest.fn().mockImplementation((query) => {
      if (query.includes('OPENQUERY') && query.includes('WH001') && query.includes('13500')) {
        return Promise.resolve(mockOpenQueryResult);
      } else if (query.includes('OPENQUERY')) {
        return Promise.resolve(mockEmptyResult);
      } else if (query === 'SELECT 1 as test') {
        return Promise.resolve(mockCustomQueryResult);
      } else if (query.includes('ERROR')) {
        return Promise.reject(mockQueryError);
      } else {
        return Promise.resolve(mockCustomQueryResult);
      }
    })
  })
};

module.exports = {
  mockPool,
  mockOpenQueryResult,
  mockEmptyResult,
  mockCustomQueryResult,
  mockQueryError
};
