const express = require('express');
const router = express.Router();
const { searchPrunit } = require('../controllers/PrunitController');
const { query } = require('express-validator');
const { validate } = require('../middlewares/validator');
const prunitController = require('../controllers/PrunitController');

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

/**
 * @swagger
 * /api/prunits/type/{type}:
 *   get:
 *     tags:
 *       - Единицы хранения
 *     summary: Получение единиц хранения по типу
 *     description: Возвращает список единиц хранения определенного типа
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         description: Тип единицы хранения
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Успешный ответ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "123"
 *                       prunit_type_id:
 *                         type: integer
 *                         example: 1
 *                       parent_qnt:
 *                         type: number
 *                         example: 5.0
 *                       product_qnt:
 *                         type: number
 *                         example: 10.0
 *       400:
 *         description: Некорректный тип единицы хранения
 *       404:
 *         description: Единицы хранения не найдены
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/type/:type', prunitController.getByType.bind(prunitController));

module.exports = router;
