const express = require('express');
const router = express.Router();
const { searchBySHKForAuth } = require('../controllers/EmployeeController');
const { query } = require('express-validator');
const { validate } = require('../middlewares/validator');

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