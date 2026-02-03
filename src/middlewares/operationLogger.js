const operationLogService = require('../services/OperationLogService');
const logger = require('../utils/logger');

/**
 * Middleware для логирования всех операций API в БД
 * Записывает информацию о каждом HTTP-запросе и ответе
 */
const operationLogger = (req, res, next) => {
  // Записываем время начала запроса
  const startTime = Date.now();

  // Получаем IP адрес клиента
  const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;

  // Получаем User Agent
  const userAgent = req.get('user-agent') || 'Unknown';

  // Извлекаем executor из разных возможных источников
  const executor = req.body?.executor || req.query?.executor || req.headers?.['x-executor-id'] || null;

  // Сохраняем оригинальный метод res.json для перехвата ответа
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  let isLogged = false;

  /**
   * Функция для сохранения лога в БД
   * @param {number} statusCode - Код статуса ответа
   * @param {*} responseBody - Тело ответа (опционально)
   */
  const saveLog = async (statusCode, responseBody = null) => {
    if (isLogged) return; // Предотвращаем дублирование логов
    isLogged = true;

    const executionTime = Date.now() - startTime;

    // Определяем результат операции
    let operationResult = 'success';
    let errorMessage = null;

    if (statusCode >= 400) {
      operationResult = 'error';
      
      // Извлекаем сообщение об ошибке из тела ответа
      if (responseBody) {
        try {
          const bodyObj = typeof responseBody === 'string' 
            ? JSON.parse(responseBody) 
            : responseBody;
          errorMessage = bodyObj.msg || bodyObj.message || bodyObj.error || `HTTP ${statusCode}`;
        } catch (e) {
          errorMessage = `HTTP ${statusCode}`;
        }
      } else {
        errorMessage = `HTTP ${statusCode}`;
      }
    }

    // Подготовка данных для логирования
    const logData = {
      endpoint: req.originalUrl || req.url,
      method: req.method,
      query: req.query,
      body: req.body,
      params: req.params,
      ip: ip,
      userAgent: userAgent,
      statusCode: statusCode,
      executionTime: executionTime,
      executor: executor,
      result: operationResult,
      errorMessage: errorMessage
    };

    // Асинхронное сохранение лога (не блокирует ответ клиенту)
    operationLogService.logOperation(logData).catch(err => {
      logger.error(`Критическая ошибка при логировании операции: ${err.message}`);
    });
  };

  // Перехватываем res.json
  res.json = function(body) {
    saveLog(res.statusCode, body);
    return originalJson(body);
  };

  // Перехватываем res.send
  res.send = function(body) {
    saveLog(res.statusCode, body);
    return originalSend(body);
  };

  // Обработка события завершения ответа (на случай, если не вызваны json или send)
  res.on('finish', () => {
    saveLog(res.statusCode);
  });

  // Обработка ошибок в middleware
  res.on('error', (error) => {
    logger.error(`Ошибка в response: ${error.message}`);
    saveLog(500, { error: error.message });
  });

  next();
};

module.exports = operationLogger;
