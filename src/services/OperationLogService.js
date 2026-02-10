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

  /**
   * Генерация отчета по логам для фронтенда
   * @param {Object} params - Параметры отчета
   * @returns {Promise<Object>} - Структурированный отчет
   */
  async generateReport(params) {
    const {
      date_from,
      date_to,
      executor,
      endpoint,
      group_by = 'hour',
      include_details = false
    } = params;

    try {
      logger.info(`Генерация отчета с группировкой: ${group_by}`);

      // Базовые фильтры
      const filters = {};
      if (date_from) filters.date_from = date_from;
      if (date_to) filters.date_to = date_to;
      if (executor) filters.executor = executor;
      if (endpoint) filters.endpoint = endpoint;

      // Получаем агрегированные данные из репозитория
      const reportData = await operationLogRepository.getAggregatedData(filters, group_by);

      // Получаем общую статистику
      const totalLogs = await operationLogRepository.count(filters);
      const successCount = await operationLogRepository.count({ ...filters, operation_result: 'success' });
      const errorCount = await operationLogRepository.count({ ...filters, operation_result: 'error' });

      // Дополнительные метрики
      const avgExecutionTime = reportData.reduce((sum, item) => sum + (item.avg_execution_time || 0), 0) / (reportData.length || 1);
      const maxExecutionTime = Math.max(...reportData.map(item => item.max_execution_time || 0));

      const report = {
        summary: {
          total_operations: totalLogs,
          successful_operations: successCount,
          failed_operations: errorCount,
          success_rate: totalLogs > 0 ? ((successCount / totalLogs) * 100).toFixed(2) : '0',
          avg_execution_time_ms: Math.round(avgExecutionTime),
          max_execution_time_ms: maxExecutionTime,
          period: {
            from: date_from || 'не указано',
            to: date_to || 'не указано'
          },
          filters: {
            executor: executor || 'все',
            endpoint: endpoint || 'все'
          }
        },
        grouped_data: reportData,
        group_by: group_by
      };

      // Если нужны детальные логи
      if (include_details) {
        const detailedLogs = await operationLogRepository.findAll(filters, 1000, 0);
        report.details = detailedLogs;
      }

      logger.info(`Отчет сгенерирован: ${reportData.length} групп, ${totalLogs} операций`);
      return report;
    } catch (error) {
      logger.error(`Ошибка при генерации отчета: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }
}

module.exports = new OperationLogService();
