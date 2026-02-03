const operationLogRepository = require('../repositories/OperationLogRepository');
const OperationLog = require('../models/OperationLog');
const logger = require('../utils/logger');

/**
 * Сервис для работы с логами операций
 */
class OperationLogService {
  /**
   * Сохранение лога операции в БД
   * @param {Object} logData - Данные лога операции
   * @returns {Promise<number>} - ID созданной записи
   */
  async logOperation(logData) {
    try {
      // Подготовка данных для сохранения
      const operationLog = new OperationLog({
        endpoint: logData.endpoint,
        http_method: logData.method,
        query_params: this._safeStringify(logData.query),
        body_params: this._safeStringify(logData.body),
        route_params: this._safeStringify(logData.params),
        ip_address: logData.ip,
        user_agent: logData.userAgent,
        status_code: logData.statusCode,
        execution_time_ms: logData.executionTime,
        executor: logData.executor,
        operation_result: logData.result,
        error_message: logData.errorMessage
      });

      const logId = await operationLogRepository.create(operationLog);
      return logId;
    } catch (error) {
      // Логируем ошибку, но не бросаем исключение, чтобы не прервать основной процесс
      logger.error(`Ошибка при сохранении лога операции: ${error.message}`, { stack: error.stack });
      return null;
    }
  }

  /**
   * Получение логов с фильтрацией и пагинацией
   * @param {Object} filters - Фильтры для поиска
   * @param {number} limit - Лимит записей
   * @param {number} offset - Смещение для пагинации
   * @returns {Promise<Object>} - Объект с логами и метаданными
   */
  async getLogs(filters = {}, limit = 100, offset = 0) {
    try {
      logger.info(`Получение логов с фильтрами: ${JSON.stringify(filters)}`);

      const logs = await operationLogRepository.findAll(filters, limit, offset);
      const total = await operationLogRepository.count(filters);

      return {
        logs,
        total,
        limit,
        offset
      };
    } catch (error) {
      logger.error(`Ошибка при получении логов: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }

  /**
   * Безопасная сериализация объекта в JSON
   * @param {*} obj - Объект для сериализации
   * @returns {string|null} - JSON строка или null
   * @private
   */
  _safeStringify(obj) {
    if (!obj || Object.keys(obj).length === 0) {
      return null;
    }

    try {
      // Фильтруем чувствительные данные
      const filtered = this._filterSensitiveData(obj);
      return JSON.stringify(filtered);
    } catch (error) {
      logger.warn(`Ошибка при сериализации объекта: ${error.message}`);
      return JSON.stringify({ error: 'Не удалось сериализовать данные' });
    }
  }

  /**
   * Фильтрация чувствительных данных (пароли, токены и т.д.)
   * @param {Object} obj - Объект для фильтрации
   * @returns {Object} - Отфильтрованный объект
   * @private
   */
  _filterSensitiveData(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'authorization',
      'apikey',
      'api_key',
      'access_token',
      'refresh_token'
    ];

    const filtered = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const lowerKey = key.toLowerCase();
        
        if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
          filtered[key] = '***FILTERED***';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          filtered[key] = this._filterSensitiveData(obj[key]);
        } else {
          filtered[key] = obj[key];
        }
      }
    }

    return filtered;
  }
}

module.exports = new OperationLogService();
