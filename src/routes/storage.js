const express = require('express');
const router = express.Router();
const storageController = require('../controllers/StorageController');
const { query, param, body } = require('express-validator');
const { validate } = require('../middlewares/validator');

/**
 * @swagger
 * tags:
 *   name: Склад
 *   description: API для работы со складскими операциями
 */

/**
 * @swagger
 * /storage/search:
 *   get:
 *     summary: Поиск товара по ШК или артикулу
 *     tags: [Склад]
 *     parameters:
 *       - in: query
 *         name: shk
 *         schema:
 *           type: string
 *         description: Штрих-код товара (штучный, фабричный или паллетный)
 *       - in: query
 *         name: article
 *         schema:
 *           type: string
 *         description: Артикул товара
 *     responses:
 *       200:
 *         description: Список найденных товаров
 *       400:
 *         description: Ошибка валидации параметров
 *       404:
 *         description: Товары не найдены
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/search', [
  query('shk').optional().isString().trim(),
  query('article').optional().isString().trim(),
  validate
], storageController.findItems);

/**
 * @swagger
 * /storage/{productId}/info:
 *   get:
 *     summary: Получение информации о товаре
 *     tags: [Склад]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *       - in: query
 *         name: shk
 *         schema:
 *           type: string
 *         description: Штрих-код товара
 *     responses:
 *       200:
 *         description: Информация о товаре
 *       400:
 *         description: Ошибка валидации параметров
 *       404:
 *         description: Товар не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/:productId/info', [
  param('productId').optional().isString().trim(),
  query('shk').optional().isString().trim(),
  validate
], storageController.getStorageInfo);

/**
 * @swagger
 * /storage/{productId}/units:
 *   get:
 *     summary: Получение списка единиц хранения для артикула
 *     tags: [Склад]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *     responses:
 *       200:
 *         description: Список единиц хранения
 *       400:
 *         description: Ошибка валидации параметров
 *       404:
 *         description: Единицы хранения не найдены
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/:productId/units', [
  param('productId').isString().trim().notEmpty(),
  validate
], storageController.getStorageUnits);

/**
 * @swagger
 * /storage/{productId}/quantity:
 *   put:
 *     summary: Обновление количества товара
 *     tags: [Склад]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prunitId
 *               - quantity
 *             properties:
 *               prunitId:
 *                 type: string
 *                 description: ID единицы хранения
 *               quantity:
 *                 type: number
 *                 description: Количество
 *     responses:
 *       200:
 *         description: Количество успешно обновлено
 *       400:
 *         description: Ошибка валидации параметров
 *       404:
 *         description: Товар не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.put('/:productId/quantity', [
  param('productId').isString().trim().notEmpty(),
  body('prunitId').isString().trim().notEmpty(),
  body('quantity').isNumeric(),
  validate
], storageController.updateQuantity);

/**
 * @swagger
 * /storage/{productId}/buffer:
 *   post:
 *     summary: Размещение товара в буфер
 *     tags: [Склад]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prunitId
 *               - quantity
 *               - executor
 *               - wrShk
 *             properties:
 *               prunitId:
 *                 type: string
 *                 description: ID единицы хранения
 *               quantity:
 *                 type: number
 *                 description: Количество
 *               executor:
 *                 type: string
 *                 description: ID исполнителя
 *               wrShk:
 *                 type: string
 *                 description: Штрих-код места хранения
 *     responses:
 *       200:
 *         description: Товар успешно размещен в буфер
 *       400:
 *         description: Ошибка валидации параметров
 *       404:
 *         description: Товар не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/:productId/buffer', [
  param('productId').isString().trim().notEmpty(),
  body('prunitId').isString().trim().notEmpty(),
  body('quantity').isFloat({ min: 0.01 }),
  body('executor').isString().trim().notEmpty(),
  body('wrShk').isString().trim().notEmpty(),
  validate
], storageController.moveToBuffer);

/**
 * @swagger
 * /storage/{productId}/buffer/move:
 *   post:
 *     summary: Перемещение товара из буфера
 *     tags: [Склад]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prunitId
 *               - quantity
 *               - condition
 *               - executor
 *             properties:
 *               prunitId:
 *                 type: string
 *                 description: ID единицы хранения
 *               quantity:
 *                 type: number
 *                 description: Количество
 *               condition:
 *                 type: string
 *                 enum: [кондиция, некондиция]
 *                 description: Состояние товара
 *               executor:
 *                 type: string
 *                 description: ID исполнителя
 *     responses:
 *       200:
 *         description: Товар успешно перемещен
 *       400:
 *         description: Ошибка валидации параметров
 *       404:
 *         description: Товар не найден в буфере
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/:productId/buffer/move', [
  param('productId').isString().trim().notEmpty(),
  body('prunitId').isString().trim().notEmpty(),
  body('quantity').isFloat({ min: 0.01 }),
  body('condition').isIn(['кондиция', 'некондиция']),
  body('executor').isString().trim().notEmpty(),
  validate
], storageController.moveFromBuffer);

module.exports = router;
