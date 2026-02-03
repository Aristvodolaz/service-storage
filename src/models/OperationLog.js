/**
 * Модель лога операции API
 */
class OperationLog {
  constructor(data = {}) {
    this.id = data.id || null;
    this.endpoint = data.endpoint || '';
    this.http_method = data.http_method || '';
    this.query_params = data.query_params || null;
    this.body_params = data.body_params || null;
    this.route_params = data.route_params || null;
    this.ip_address = data.ip_address || null;
    this.user_agent = data.user_agent || null;
    this.status_code = data.status_code || null;
    this.execution_time_ms = data.execution_time_ms || null;
    this.executor = data.executor || null;
    this.operation_result = data.operation_result || null;
    this.error_message = data.error_message || null;
    this.created_at = data.created_at || null;
  }

  /**
   * Преобразует данные из БД в модель
   * @param {Object} dbData - Данные из БД
   * @returns {OperationLog} - Экземпляр модели
   */
  static fromDatabase(dbData) {
    return new OperationLog({
      id: dbData.id,
      endpoint: dbData.endpoint,
      http_method: dbData.http_method,
      query_params: dbData.query_params,
      body_params: dbData.body_params,
      route_params: dbData.route_params,
      ip_address: dbData.ip_address,
      user_agent: dbData.user_agent,
      status_code: dbData.status_code,
      execution_time_ms: dbData.execution_time_ms,
      executor: dbData.executor,
      operation_result: dbData.operation_result,
      error_message: dbData.error_message,
      created_at: dbData.created_at
    });
  }

  /**
   * Преобразует массив данных из БД в массив моделей
   * @param {Array} dbDataArray - Массив данных из БД
   * @returns {Array<OperationLog>} - Массив экземпляров модели
   */
  static fromDatabaseArray(dbDataArray) {
    return dbDataArray.map(data => OperationLog.fromDatabase(data));
  }

  /**
   * Преобразует модель в объект для записи в БД
   * @returns {Object} - Объект для записи в БД
   */
  toDatabase() {
    return {
      endpoint: this.endpoint,
      http_method: this.http_method,
      query_params: this.query_params,
      body_params: this.body_params,
      route_params: this.route_params,
      ip_address: this.ip_address,
      user_agent: this.user_agent,
      status_code: this.status_code,
      execution_time_ms: this.execution_time_ms,
      executor: this.executor,
      operation_result: this.operation_result,
      error_message: this.error_message
    };
  }
}

module.exports = OperationLog;
