const express = require('express');
const router = express.Router();
const { searchBySHKForAuth } = require('../controllers/authController');
const { query, validationResult } = require('express-validator');

// Middleware для валидации
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      msg: 'Ошибка валидации', 
      errors: errors.array(),
      errorCode: 400 
    });
  }
  next();
};

// Маршрут для авторизации по ID сотрудника с валидацией
router.get('/', [
  query('id')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('ID сотрудника должен быть указан и не может быть пустым'),
  validate
], searchBySHKForAuth);

module.exports = router;
