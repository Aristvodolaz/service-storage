const express = require('express');
const router = express.Router();
const { searchPrunit } = require('../controllers/PrunitController');
const { query } = require('express-validator');
const { validate } = require('../middlewares/validator');

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