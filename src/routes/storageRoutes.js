const express = require('express');
const router = express.Router();
const storageController = require('../controllers/StorageController');

// Поиск товаров
router.get('/search', storageController.search.bind(storageController));

// ... остальные маршруты ...

module.exports = router;
