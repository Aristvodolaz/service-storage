const { connectToDatabase } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Базовый класс репозитория для работы с базой данных
 */
class BaseRepository {
  /**
   * Выполняет SQL-запрос с обработкой ошибок
   * @param {string} query - SQL-запрос
   * @param {Object} params - Параметры запроса
   * @returns {Promise<Array>} - Результат запроса
   */
  async executeQuery(query, params = {}) {
    let pool;
    try {
      pool = await connectToDatabase();
      if (!pool) {
        throw new Error('Не удалось подключиться к базе данных');
      }

      logger.debug(`Выполнение SQL-запроса: ${query}`);
      const request = pool.request();
      
      // Добавляем параметры к запросу для предотвращения SQL-инъекций
      Object.entries(params).forEach(([key, value]) => {
        request.input(key, value);
      });
      
      const result = await request.query(query);
      logger.debug(`Запрос выполнен успешно, получено ${result.recordset.length} записей`);
      return result.recordset;
    } catch (error) {
      logger.error(`Ошибка выполнения запроса: ${error.message}`, { stack: error.stack });
      throw new Error(`Ошибка выполнения запроса: ${error.message}`);
    }
  }
}

module.exports = BaseRepository; 