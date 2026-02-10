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

  /**
   * Получение агрегированных данных для отчетов
   * @param {Object} filters - Фильтры для поиска
   * @param {string} groupBy - Тип группировки (hour, day, endpoint, executor, status_code)
   * @returns {Promise<Array>} - Агрегированные данные
   */
  async getAggregatedData(filters = {}, groupBy = 'hour') {
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

      // Определяем поля для группировки и SELECT
      let groupByClause = '';
      let selectClause = '';

      switch (groupBy) {
        case 'hour':
          selectClause = `
            DATEPART(year, created_at) as year,
            DATEPART(month, created_at) as month,
            DATEPART(day, created_at) as day,
            DATEPART(hour, created_at) as hour,
            CAST(created_at as DATE) as date,
            DATEPART(hour, created_at) as hour_of_day
          `;
          groupByClause = `
            DATEPART(year, created_at),
            DATEPART(month, created_at),
            DATEPART(day, created_at),
            DATEPART(hour, created_at),
            CAST(created_at as DATE)
          `;
          break;

        case 'day':
          selectClause = `
            CAST(created_at as DATE) as date,
            DATEPART(year, created_at) as year,
            DATEPART(month, created_at) as month,
            DATEPART(day, created_at) as day
          `;
          groupByClause = `
            CAST(created_at as DATE),
            DATEPART(year, created_at),
            DATEPART(month, created_at),
            DATEPART(day, created_at)
          `;
          break;

        case 'endpoint':
          selectClause = 'endpoint';
          groupByClause = 'endpoint';
          break;

        case 'executor':
          selectClause = 'executor';
          groupByClause = 'executor';
          break;

        case 'status_code':
          selectClause = 'status_code';
          groupByClause = 'status_code';
          break;

        case 'method':
          selectClause = 'http_method';
          groupByClause = 'http_method';
          break;

        default:
          throw new Error(`Неподдерживаемый тип группировки: ${groupBy}`);
      }

      const query = `
        SELECT 
          ${selectClause},
          COUNT(*) as total_count,
          SUM(CASE WHEN operation_result = 'success' THEN 1 ELSE 0 END) as success_count,
          SUM(CASE WHEN operation_result = 'error' THEN 1 ELSE 0 END) as error_count,
          AVG(CAST(execution_time_ms as FLOAT)) as avg_execution_time,
          MIN(execution_time_ms) as min_execution_time,
          MAX(execution_time_ms) as max_execution_time,
          COUNT(DISTINCT executor) as unique_executors,
          COUNT(DISTINCT ip_address) as unique_ips
        FROM x_API_Operation_Logs
        ${whereClause}
        GROUP BY ${groupByClause}
        ORDER BY ${groupBy === 'hour' || groupBy === 'day' ? 'date DESC' : 'total_count DESC'}
      `;

      logger.debug(`Агрегированный запрос: ${query}`);
      const result = await this.executeQuery(query, params);
      
      // Форматируем результат для удобства использования на фронте
      return result.map(row => ({
        ...row,
        success_rate: row.total_count > 0 
          ? ((row.success_count / row.total_count) * 100).toFixed(2) 
          : '0',
        avg_execution_time: row.avg_execution_time ? Math.round(row.avg_execution_time) : 0
      }));
    } catch (error) {
      logger.error(`Ошибка при получении агрегированных данных: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }
}

module.exports = new OperationLogRepository();
