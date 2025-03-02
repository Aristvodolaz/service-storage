const express = require('express');
const router = express.Router();
const { searchPrunit } = require('../controllers/PrunitController');
const { query } = require('express-validator');
const { validate } = require('../middlewares/validator');

/**
 * @swagger
 * /searchPrunit:
 *   get:
 *     summary: Получение подробной информации о продукте
 *     description: Возвращает детальную информацию о продукте по его идентификатору
 *     tags: [Товары]
 *     parameters:
 *       - in: query
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Идентификатор продукта
 *     responses:
 *       200:
 *         description: Успешное получение информации о продукте
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductInfo'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
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
