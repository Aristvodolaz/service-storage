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
 * /api/storage/search:
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
 * /api/storage/{productId}/info:
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
 * /api/storage/{productId}/units:
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
 * /api/storage/{productId}/quantity:
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
 * /api/storage/{productId}/buffer:
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
 * /api/storage/{productId}/buffer/move:
 *   post:
 *     summary: Перемещение товара между буферными ячейками
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
 *               - sourceLocationId
 *               - targetLocationId
 *               - targetWrShk
 *               - prunitId
 *               - quantity
 *               - executor
 *             properties:
 *               sourceLocationId:
 *                 type: string
 *                 description: ID исходной ячейки
 *               targetLocationId:
 *                 type: string
 *                 description: ID целевой ячейки
 *               targetWrShk:
 *                 type: string
 *                 description: Штрих-код целевой ячейки
 *               prunitId:
 *                 type: string
 *                 description: ID единицы хранения
 *               quantity:
 *                 type: number
 *                 description: Количество
 *               conditionState:
 *                 type: string
 *                 enum: [кондиция, некондиция]
 *                 description: Состояние товара (требуется только при частичном перемещении)
 *               expirationDate:
 *                 type: string
 *                 format: date
 *                 description: Срок годности (требуется только при частичном перемещении)
 *               executor:
 *                 type: string
 *                 description: ID исполнителя
 *     responses:
 *       200:
 *         description: Товар успешно перемещен
 *       400:
 *         description: Ошибка валидации параметров или недостаточное количество
 *       404:
 *         description: Товар не найден в указанной ячейке
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/:productId/buffer/move', [
  param('productId').isString().trim().notEmpty(),
  body('sourceLocationId').isString().trim().notEmpty(),
  body('targetLocationId').isString().trim().notEmpty(),
  body('targetWrShk').isString().trim().notEmpty(),
  body('prunitId').isString().trim().notEmpty(),
  body('quantity').isFloat({ min: 0.01 }),
  body('executor').isString().trim().notEmpty(),
  body('conditionState').optional().isIn(['кондиция', 'некондиция']),
  body('expirationDate').optional().isISO8601(),
  validate
], storageController.moveItemBetweenLocations);

/**
 * @swagger
 * /api/storage/{productId}/location/pick:
 *   post:
 *     summary: Забор товара из ячейки
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
 *               - locationId
 *               - prunitId
 *               - quantity
 *               - executor
 *             properties:
 *               locationId:
 *                 type: string
 *                 description: ID ячейки
 *               prunitId:
 *                 type: string
 *                 description: ID единицы хранения
 *               quantity:
 *                 type: number
 *                 description: Количество
 *               executor:
 *                 type: string
 *                 description: ID исполнителя
 *     responses:
 *       200:
 *         description: Товар успешно изъят из ячейки
 *       400:
 *         description: Ошибка валидации параметров или недостаточное количество
 *       404:
 *         description: Товар не найден в указанной ячейке
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/:productId/location/pick', [
  param('productId').isString().trim().notEmpty(),
  body('locationId').isString().trim().notEmpty(),
  body('prunitId').isString().trim().notEmpty(),
  body('quantity').isFloat({ min: 0.01 }),
  body('executor').isString().trim().notEmpty(),
  validate
], storageController.pickFromLocation);

/**
 * @swagger
 * /api/storage/search/article:
 *   get:
 *     summary: Поиск товара по артикулу
 *     tags: [Склад]
 *     parameters:
 *       - in: query
 *         name: article
 *         required: true
 *         schema:
 *           type: string
 *         description: Артикул товара
 *     responses:
 *       200:
 *         description: Информация о найденном товаре
 *       400:
 *         description: Ошибка валидации параметров
 *       404:
 *         description: Товар не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/search/article', [
  query('article').isString().trim().notEmpty(),
  validate
], storageController.search);

/**
 * @swagger
 * /api/storage/inventory/location/{locationId}:
 *   get:
 *     summary: Инвентаризация по ячейке
 *     tags: [Склад]
 *     parameters:
 *       - in: path
 *         name: locationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID ячейки
 *     responses:
 *       200:
 *         description: Список товаров в ячейке
 *       400:
 *         description: Ошибка валидации параметров
 *       404:
 *         description: Товары в ячейке не найдены
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/inventory/location/:locationId', [
  param('locationId').isString().trim().notEmpty(),
  validate
], storageController.getLocationItems);

/**
 * @swagger
 * /api/storage/inventory/article/{article}:
 *   get:
 *     summary: Инвентаризация по артикулу
 *     tags: [Склад]
 *     parameters:
 *       - in: path
 *         name: article
 *         required: true
 *         schema:
 *           type: string
 *         description: Артикул товара
 *     responses:
 *       200:
 *         description: Список ячеек, в которых хранится товар
 *       400:
 *         description: Ошибка валидации параметров
 *       404:
 *         description: Ячейки хранения для товара не найдены
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/inventory/article/:article', [
  param('article').isString().trim().notEmpty(),
  validate
], storageController.getArticleLocations);

/**
 * @swagger
 * /api/storage/inventory/location/{locationId}/clear:
 *   post:
 *     summary: Очистка ячейки (функция "Адрес пуст")
 *     tags: [Склад]
 *     parameters:
 *       - in: path
 *         name: locationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID ячейки
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - executor
 *             properties:
 *               executor:
 *                 type: string
 *                 description: ID исполнителя
 *     responses:
 *       200:
 *         description: Ячейка успешно очищена
 *       400:
 *         description: Ошибка валидации параметров
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/inventory/location/:locationId/clear', [
  param('locationId').isString().trim().notEmpty(),
  body('executor').isString().trim().notEmpty(),
  validate
], storageController.clearLocation);

/**
 * @swagger
 * /api/storage/inventory/{productId}/{locationId}:
 *   post:
 *     summary: Обновление данных инвентаризации
 *     tags: [Склад]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *       - in: path
 *         name: locationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID ячейки
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
 *             properties:
 *               prunitId:
 *                 type: string
 *                 description: ID единицы хранения
 *               quantity:
 *                 type: number
 *                 description: Количество
 *               conditionState:
 *                 type: string
 *                 enum: [кондиция, некондиция]
 *                 description: Состояние товара
 *               expirationDate:
 *                 type: string
 *                 format: date
 *                 description: Срок годности
 *               executor:
 *                 type: string
 *                 description: ID исполнителя
 *     responses:
 *       200:
 *         description: Данные инвентаризации успешно обновлены
 *       400:
 *         description: Ошибка валидации параметров
 *       404:
 *         description: Товар не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/inventory/:productId/:locationId', [
  param('productId').isString().trim().notEmpty(),
  param('locationId').isString().trim().notEmpty(),
  body('prunitId').isString().trim().notEmpty(),
  body('quantity').isFloat({ min: 0 }),
  body('executor').isString().trim().notEmpty(),
  body('conditionState').optional().isIn(['кондиция', 'некондиция']),
  body('expirationDate').optional().isISO8601(),
  validate
], storageController.updateInventory);

/**
 * @swagger
 * /api/storage/item/details:
 *   get:
 *     summary: Получение детальной информации о товаре по ШК или артикулу
 *     tags: [Склад]
 *     parameters:
 *       - in: query
 *         name: shk
 *         schema:
 *           type: string
 *         description: Штрих-код товара
 *       - in: query
 *         name: article
 *         schema:
 *           type: string
 *         description: Артикул товара
 *       - in: query
 *         name: wrShk
 *         schema:
 *           type: string
 *         description: Штрих-код ячейки
 *     responses:
 *       200:
 *         description: Детальная информация о товаре
 *       400:
 *         description: Ошибка валидации параметров
 *       404:
 *         description: Товар не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/item/details', [
  query('shk').optional().isString().trim(),
  query('article').optional().isString().trim(),
  query('wrShk').optional().isString().trim(),
  validate
], storageController.getDetailedItemInfo);

/**
 * @swagger
 * /api/storage/locations:
 *   get:
 *     summary: Получение списка всех ячеек хранения
 *     tags: [Склад]
 *     responses:
 *       200:
 *         description: Список ячеек хранения
 *       404:
 *         description: Ячейки хранения не найдены
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/locations', storageController.getAllLocations);

/**
 * @swagger
 * /api/storage/defects/register:
 *   post:
 *     summary: Регистрация некондиции
 *     description: Регистрирует некондицию для указанного товара
 *     tags: [Склад]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - defectReason
 *               - executor
 *             properties:
 *               productId:
 *                 type: string
 *                 description: ID товара
 *               defectReason:
 *                 type: string
 *                 description: Причина некондиции
 *               executor:
 *                 type: string
 *                 description: ID исполнителя
 *     responses:
 *       200:
 *         description: Некондиция успешно зарегистрирована
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Некондиция успешно зарегистрирована
 *       400:
 *         description: Ошибка валидации
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Не указан ID товара (productId)
 *       404:
 *         description: Товар не найден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Товар с ID 12345 не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Ошибка при регистрации некондиции
 *                 error:
 *                   type: string
 */
router.post('/defects/register', [
  body('productId').isString().trim().notEmpty(),
  body('defectReason').isString().trim().notEmpty(),
  body('executor').isString().trim().notEmpty(),
  validate
], storageController.registerDefect);

/**
 * @swagger
 * /api/storage/reports/buffer:
 *   get:
 *     summary: Отчет по остаткам в буфере
 *     description: Возвращает отчет по остаткам товаров в буфере
 *     tags: [Склад]
 *     responses:
 *       200:
 *         description: Успешное получение отчета
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
 *                       productId:
 *                         type: string
 *                       productName:
 *                         type: string
 *                       article:
 *                         type: string
 *                       shk:
 *                         type: string
 *                       prunitId:
 *                         type: string
 *                       prunitName:
 *                         type: string
 *                       quantity:
 *                         type: number
 *                       locationId:
 *                         type: string
 *                       wrShk:
 *                         type: string
 *                       conditionState:
 *                         type: string
 *                       expirationDate:
 *                         type: string
 *                         format: date-time
 *                 count:
 *                   type: number
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/reports/buffer', storageController.getBufferReport);

/**
 * @swagger
 * /api/storage/reports/defects:
 *   get:
 *     summary: Отчет по некондиции
 *     description: Возвращает отчет по зарегистрированной некондиции
 *     tags: [Склад]
 *     responses:
 *       200:
 *         description: Успешное получение отчета
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
 *                         type: number
 *                       productId:
 *                         type: string
 *                       productName:
 *                         type: string
 *                       article:
 *                         type: string
 *                       shk:
 *                         type: string
 *                       defectReason:
 *                         type: string
 *                       executor:
 *                         type: string
 *                       registrationDate:
 *                         type: string
 *                         format: date-time
 *                 count:
 *                   type: number
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/reports/defects', storageController.getDefectsReport);

/**
 * @swagger
 * /api/storage/reports/inventory:
 *   get:
 *     summary: Отчет по инвентаризациям
 *     description: Возвращает отчет по проведенным инвентаризациям
 *     tags: [Склад]
 *     responses:
 *       200:
 *         description: Успешное получение отчета
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
 *                         type: number
 *                       productId:
 *                         type: string
 *                       productName:
 *                         type: string
 *                       article:
 *                         type: string
 *                       shk:
 *                         type: string
 *                       locationId:
 *                         type: string
 *                       wrShk:
 *                         type: string
 *                       prunitId:
 *                         type: string
 *                       prunitName:
 *                         type: string
 *                       previousQuantity:
 *                         type: number
 *                       newQuantity:
 *                         type: number
 *                       executor:
 *                         type: string
 *                       inventoryDate:
 *                         type: string
 *                         format: date-time
 *                 count:
 *                   type: number
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/reports/inventory', storageController.getInventoryReport);

module.exports = router;
