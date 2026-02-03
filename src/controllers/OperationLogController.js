const operationLogService = require('../services/OperationLogService');
const logger = require('../utils/logger');

/**
 * Контроллер для работы с логами операций
 */
class OperationLogController {
  /**
   * Получение списка логов с фильтрацией и пагинацией
   * @param {Object} req - HTTP запрос
   * @param {Object} res - HTTP ответ
   */
  async getLogs(req, res) {
    try {
      const {
        endpoint,
        http_method,
        executor,
        status_code,
        operation_result,
        date_from,
        date_to,
        limit = 100,
        offset = 0
      } = req.query;

      // Подготовка фильтров
      const filters = {};
      if (endpoint) filters.endpoint = endpoint;
      if (http_method) filters.http_method = http_method;
      if (executor) filters.executor = executor;
      if (status_code) filters.status_code = parseInt(status_code);
      if (operation_result) filters.operation_result = operation_result;
      if (date_from) filters.date_from = date_from;
      if (date_to) filters.date_to = date_to;

      const result = await operationLogService.getLogs(
        filters,
        parseInt(limit),
        parseInt(offset)
      );

      res.status(200).json({
        success: true,
        data: result.logs,
        meta: {
          total: result.total,
          limit: result.limit,
          offset: result.offset
        }
      });
    } catch (error) {
      logger.error(`Ошибка при получении логов: ${error.message}`, { stack: error.stack });
      res.status(500).json({
        success: false,
        message: `Ошибка при получении логов: ${error.message}`
      });
    }
  }

  /**
   * Получение статистики по логам
   * @param {Object} req - HTTP запрос
   * @param {Object} res - HTTP ответ
   */
  async getStatistics(req, res) {
    try {
      const { date_from, date_to } = req.query;

      // Здесь можно добавить специфичную статистику
      // Пока возвращаем базовую информацию
      const filters = {};
      if (date_from) filters.date_from = date_from;
      if (date_to) filters.date_to = date_to;

      const successFilters = { ...filters, operation_result: 'success' };
      const errorFilters = { ...filters, operation_result: 'error' };

      const totalResult = await operationLogService.getLogs(filters, 1, 0);
      const successResult = await operationLogService.getLogs(successFilters, 1, 0);
      const errorResult = await operationLogService.getLogs(errorFilters, 1, 0);

      res.status(200).json({
        success: true,
        data: {
          total: totalResult.total,
          successful: successResult.total,
          errors: errorResult.total,
          successRate: totalResult.total > 0 
            ? ((successResult.total / totalResult.total) * 100).toFixed(2) 
            : 0
        }
      });
    } catch (error) {
      logger.error(`Ошибка при получении статистики: ${error.message}`, { stack: error.stack });
      res.status(500).json({
        success: false,
        message: `Ошибка при получении статистики: ${error.message}`
      });
    }
  }
}

module.exports = new OperationLogController();
