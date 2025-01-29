const express = require('express');
const { searchByArticle } = require('../controllers/articleController');
const router = express.Router();

// Добавляем маршрут для поиска товара по артикулу
router.get('/', searchByArticle);

module.exports = router;
