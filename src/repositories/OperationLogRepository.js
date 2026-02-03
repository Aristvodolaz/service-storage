const BaseRepository = require('./BaseRepository');
const OperationLog = require('../models/OperationLog');
const logger = require('../utils/logger');
const { connectToDatabase, mssql } = require('../config/database');

/**
 * Репозиторий для работы с логами операций
 */
class OperationLogRepository extends BaseRepository {
  /**
   * Создание записи лога операции в БД
   * @param {OperationLog} operationLog - Объект лога операции
   * @returns {Promise<number>} - ID созданной записи
   */
  async create(operationLog) {
    let pool;
    try {
      pool = await connectToDatabase();
      if (!pool) {
        throw new Error('Не удалось подключиться к базе данных');
      }

      const data = operationLog.toDatabase();
      
      const query = `
        INSERT INTO x_API_Operation_Logs (
          endpoint,
          http_method,
          query_params,
          body_params,
          route_params,
          ip_address,
          user_agent,
          status_code,
          execution_time_ms,
          executor,
          operation_result,
          error_message
        )
        VALUES (
          @endpoint,
          @http_method,
          @query_params,
          @body_params,
          @route_params,
          @ip_address,
          @user_agent,
          @status_code,
          @execution_time_ms,
          @executor,
          @operation_result,
          @error_message
        );
        SELECT SCOPE_IDENTITY() AS id;
      `;

      const request = pool.request();
      request.input('endpoint', mssql.NVarChar(500), data.endpoint);
      request.input('http_method', mssql.NVarChar(10), data.http_method);
      request.input('query_params', mssql.NVarChar(mssql.MAX), data.query_params);
      request.input('body_params', mssql.NVarChar(mssql.MAX), data.body_params);
      request.input('route_params', mssql.NVarChar(mssql.MAX), data.route_params);
      request.input('ip_address', mssql.NVarChar(45), data.ip_address);
      request.input('user_agent', mssql.NVarChar(500), data.user_agent);
      request.input('status_code', mssql.Int, data.status_code);
      request.input('execution_time_ms', mssql.Int, data.execution_time_ms);
      request.input('executor', mssql.NVarChar(100), data.executor);
      request.input('operation_result', mssql.NVarChar(20), data.operation_result);
      request.input('error_message', mssql.NVarChar(mssql.MAX), data.error_message);

      const result = await request.query(query);
      const insertedId = result.recordset[0].id;
      
      logger.debug(`Лог операции сохранен в БД с ID: ${insertedId}`);
      return insertedId;
    } catch (error) {
      // Не бросаем ошибку, чтобы не прерывать основной процесс
      logger.error(`Ошибка при сохранении лога в БД: ${error.message}`, { stack: error.stack });
      return null;
    }
  }

  /**
   * Получение логов с фильтрацией и пагинацией
   * @param {Object} filters - Фильтры для поиска
   * @param {number} limit - Лимит записей
   * @param {number} offset - Смещение для пагинации
   * @returns {Promise<Array<OperationLog>>} - Массив логов
   */
  async findAll(filters = {}, limit = 100, offset = 0) {
    try {
      let whereConditions = [];
      const params = {};

      if (filters.endpoint) {
        whereConditions.push('endpoint LIKE @endpoint');
        params.endpoint = `%${filters.endpoint}%`;
      }

      if (filters.http_method) {
        whereConditions.push('http_method = @http_method');
        params.http_method = filters.http_method;
      }

      if (filters.executor) {
        whereConditions.push('executor = @executor');
        params.executor = filters.executor;
      }

      if (filters.status_code) {
        whereConditions.push('status_code = @status_code');
        params.status_code = filters.status_code;
      }

      if (filters.operation_result) {
        whereConditions.push('operation_result = @operation_result');
        params.operation_result = filters.operation_result;
      }

      if (filters.date_from) {
        whereConditions.push('created_at >= @date_from');
        params.date_from = filters.date_from;
      }

      if (filters.date_to) {
        whereConditions.push('created_at <= @date_to');
        params.date_to = filters.date_to;
      }

      const whereClause = whereConditions.length > 0 
        ? 'WHERE ' + whereConditions.join(' AND ') 
        : '';

      const query = `
        SELECT * FROM x_API_Operation_Logs
        ${whereClause}
        ORDER BY created_at DESC
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY
      `;

      params.limit = limit;
      params.offset = offset;

      const result = await this.executeQuery(query, params);
      return OperationLog.fromDatabaseArray(result);
    } catch (error) {
      logger.error(`Ошибка при получении логов: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }

  /**
   * Подсчет общего количества логов с фильтрацией
   * @param {Object} filters - Фильтры для поиска
   * @returns {Promise<number>} - Количество логов
   */
  async count(filters = {}) {
    try {
      let whereConditions = [];
      const params = {};

      if (filters.endpoint) {
        whereConditions.push('endpoint LIKE @endpoint');
        params.endpoint = `%${filters.endpoint}%`;
      }

      if (filters.http_method) {
        whereConditions.push('http_method = @http_method');
        params.http_method = filters.http_method;
      }

      if (filters.executor) {
        whereConditions.push('executor = @executor');
        params.executor = filters.executor;
      }

      if (filters.status_code) {
        whereConditions.push('status_code = @status_code');
        params.status_code = filters.status_code;
      }

      if (filters.operation_result) {
        whereConditions.push('operation_result = @operation_result');
        params.operation_result = filters.operation_result;
      }

      if (filters.date_from) {
        whereConditions.push('created_at >= @date_from');
        params.date_from = filters.date_from;
      }

      if (filters.date_to) {
        whereConditions.push('created_at <= @date_to');
        params.date_to = filters.date_to;
      }

      const whereClause = whereConditions.length > 0 
        ? 'WHERE ' + whereConditions.join(' AND ') 
        : '';

      const query = `
        SELECT COUNT(*) as total FROM x_API_Operation_Logs
        ${whereClause}
      `;

      const result = await this.executeQuery(query, params);
      return result[0].total;
    } catch (error) {
      logger.error(`Ошибка при подсчете логов: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }
}

module.exports = new OperationLogRepository();
