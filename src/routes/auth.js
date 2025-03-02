const express = require('express');
const router = express.Router();
const { searchBySHKForAuth } = require('../controllers/EmployeeController');
const { query } = require('express-validator');
const { validate } = require('../middlewares/validator');

/**
 * @swagger
 * /auth:
 *   get:
 *     summary: Авторизация сотрудника
 *     description: Проверяет авторизацию сотрудника по его идентификатору и возвращает информацию о нем
 *     tags: [Авторизация]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Идентификатор сотрудника
 *     responses:
 *       200:
 *         description: Успешная авторизация
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
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
