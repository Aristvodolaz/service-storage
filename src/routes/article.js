const express = require('express');
const { searchByArticle } = require('../controllers/ArticleController');
const { query, oneOf } = require('express-validator');
const { validate } = require('../middlewares/validator');
const router = express.Router();

// Добавляем маршрут для поиска товара по артикулу с валидацией
router.get('/', [
  oneOf([
    query('shk').isString().trim().notEmpty().withMessage('ШК должен быть непустой строкой'),
    query('article').isString().trim().notEmpty().withMessage('Артикул должен быть непустой строкой')
  ], 'Необходимо указать ШК или артикул'),
  validate
], searchByArticle);

module.exports = router; 