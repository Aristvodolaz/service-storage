const express = require('express');
const router = express.Router();
const { searchPrunit } = require('../controllers/prunitController');
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

// Маршрут для поиска информации о продукте по его ID с валидацией
router.get('/', [
  query('productId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('ID продукта должен быть указан и не может быть пустым'),
  validate
], searchPrunit);

module.exports = router;
