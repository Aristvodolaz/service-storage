const express = require('express');
const { searchByArticle } = require('../controllers/ArticleController');
const { query, oneOf } = require('express-validator');
const { validate } = require('../middlewares/validator');
const router = express.Router();

/**
 * @swagger
 * /search:
 *   get:
 *     summary: Поиск товара по артикулу или штрих-коду
 *     description: Возвращает информацию о товаре по его артикулу или штрих-коду
 *     tags: [Товары]
 *     parameters:
 *       - in: query
 *         name: article
 *         schema:
 *           type: string
 *         description: Артикул товара
 *       - in: query
 *         name: shk
 *         schema:
 *           type: string
 *         description: Штрих-код товара
 *     responses:
 *       200:
 *         description: Успешный поиск товара
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
// Добавляем маршрут для поиска товара по артикулу с валидацией
router.get('/', [
  oneOf([
    query('shk').isString().trim().notEmpty().withMessage('ШК должен быть непустой строкой'),
    query('article').isString().trim().notEmpty().withMessage('Артикул должен быть непустой строкой')
  ], 'Необходимо указать ШК или артикул'),
  validate
], searchByArticle);

module.exports = router;
