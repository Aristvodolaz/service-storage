const express = require('express');
const { searchByArticle } = require('../controllers/articleController');
const { query, oneOf, validationResult } = require('express-validator');
const router = express.Router();

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

// Добавляем маршрут для поиска товара по артикулу с валидацией
router.get('/', [
  oneOf([
    query('shk').isString().trim().notEmpty().withMessage('ШК должен быть непустой строкой'),
    query('article').isString().trim().notEmpty().withMessage('Артикул должен быть непустой строкой')
  ], 'Необходимо указать ШК или артикул'),
  validate
], searchByArticle);

module.exports = router;
