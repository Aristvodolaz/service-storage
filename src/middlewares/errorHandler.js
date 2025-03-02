const logger = require('../utils/logger');

/**
 * Middleware для обработки ошибок 404 (маршрут не найден)
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
const notFoundHandler = (req, res) => {
  logger.warn(`Маршрут не найден: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    success: false, 
    msg: 'Маршрут не найден', 
    errorCode: 404 
  });
};

/**
 * Middleware для обработки ошибок сервера
 * @param {Error} err - Объект ошибки
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 * @param {Function} next - Функция для перехода к следующему middleware
 */
const errorHandler = (err, req, res, next) => {
  logger.error(`Ошибка сервера: ${err.message}`, { stack: err.stack });
  res.status(500).json({ 
    success: false, 
    msg: 'Внутренняя ошибка сервера', 
    errorCode: 500 
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
}; 