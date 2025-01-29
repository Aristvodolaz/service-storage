const express = require('express');
const router = express.Router();
const { searchPrunit } = require('../controllers/prunitController');

// Маршрут для поиска информации о продукте по его ID
router.get('/', searchPrunit);

module.exports = router;
