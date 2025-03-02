const express = require('express');
const router = express.Router();
const { executeOpenQuery, executeCustomQuery } = require('../controllers/QueryController');
const { query, body } = require('express-validator');
const { validate } = require('../middlewares/validator');

/**
 * @swagger
 * tags:
 *   name: Запросы
 *   description: API для выполнения SQL-запросов
 */

/**
 * @swagger
 * /query/pick-article-rule:
 *   get:
 *     summary: Получение правил отбора артикула
 *     description: Получает правила отбора артикула из таблицы wms.pick_article_rule по ID склада и артикула
 *     tags: [Запросы]
 *     parameters:
 *       - in: query
 *         name: warehouseId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID склада (warehouse_id)
 *       - in: query
 *         name: articleId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID артикула (article_id)
 *     responses:
 *       200:
 *         description: Успешное выполнение запроса
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/pick-article-rule', [
  query('warehouseId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('ID склада должен быть указан и не может быть пустым'),
  query('articleId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('ID артикула должен быть указан и не может быть пустым'),
  validate
], executeOpenQuery);

/**
 * @swagger
 * /query/custom:
 *   post:
 *     summary: Выполнение произвольного SQL-запроса
 *     description: Выполняет произвольный SQL-запрос с параметрами
 *     tags: [Запросы]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: SQL-запрос для выполнения
 *               params:
 *                 type: object
 *                 description: Параметры для SQL-запроса
 *     responses:
 *       200:
 *         description: Успешное выполнение запроса
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rowCount:
 *                   type: integer
 *                   description: Количество затронутых строк
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                   description: Результат запроса
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/custom', [
  body('query')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('SQL-запрос должен быть указан и не может быть пустым'),
  validate
], executeCustomQuery);

module.exports = router;
