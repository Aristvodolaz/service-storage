const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Middleware для валидации запросов
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 * @param {Function} next - Функция для перехода к следующему middleware
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn(`Ошибка валидации: ${JSON.stringify(errors.array())}`);
    return res.status(400).json({ 
      success: false, 
      msg: 'Ошибка валидации', 
      errors: errors.array(),
      errorCode: 400 
    });
  }
  next();
};

module.exports = {
  validate
};