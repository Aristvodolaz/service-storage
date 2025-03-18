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
 * tags:
 *   name: Desktop
 *   description: Методы API для desktop-приложения
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
 * /api/storage/info:
 *   get:
 *     summary: Получение информации о товаре по артикулу, ШК или ШК ячейки
 *     description: Если параметры не указаны, возвращает все записи из таблицы x_Storage_Full_Info
 *     tags: [Склад]
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
 *       - in: query
 *         name: wrShk
 *         schema:
 *           type: string
 *         description: Штрих-код ячейки
 *     responses:
 *       200:
 *         description: Информация о товаре или все записи из таблицы x_Storage_Full_Info, если параметры не указаны
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/info', [
  query('article').optional().isString().trim(),
  query('shk').optional().isString().trim(),
  query('wrShk').optional().isString().trim(),
  validate
], storageController.getStorageInfo);

/**
 * @swagger
 * /api/storage/{productId}/info:
 *   get:
 *     summary: Получение информации о товаре по ID
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
 *         description: Информация о товаре
 *       400:
 *         description: Ошибка валидации параметров
 *       404:
 *         description: Товар не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/:productId/info', [
  param('productId').isString().trim().notEmpty(),
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
 * /api/storage/{productId}/pick:
 *   post:
 *     summary: Снятие товара из ячейки
 *     description: Снимает товар из указанной ячейки. Проверяет наличие товара по артикулу, единице хранения, штрих-коду ячейки и ID склада. Уменьшает только количество в ячейке (place_qnt), не изменяя общее количество товара (product_qnt). При достижении нулевого количества в ячейке запись не удаляется, а сохраняется с нулевым значением place_qnt.
 *     tags: [Склад]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Артикул товара
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
 *               - locationId
 *             properties:
 *               prunitId:
 *                 oneOf:
 *                   - type: string
 *                   - type: number
 *                 description: ID единицы хранения
 *               quantity:
 *                 type: number
 *                 description: Количество для снятия
 *               executor:
 *                 type: string
 *                 description: ID исполнителя
 *               locationId:
 *                 type: string
 *                 description: Штрих-код ячейки (WR_SHK)
 *               sklad_id:
 *                 type: string
 *                 description: ID склада (соответствует полю id_scklad в базе данных)
 *     responses:
 *       200:
 *         description: Товар успешно снят с ячейки
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 locationId:
 *                   type: string
 *                   description: Штрих-код ячейки
 *                 prunitId:
 *                   type: string
 *                   description: ID единицы хранения
 *                 name:
 *                   type: string
 *                   description: Наименование товара
 *                 article:
 *                   type: string
 *                   description: Артикул товара
 *                 shk:
 *                   type: string
 *                   description: Штрих-код товара
 *                 conditionState:
 *                   type: string
 *                   description: Состояние товара
 *                 previousQuantity:
 *                   type: number
 *                   description: Предыдущее количество в ячейке
 *                 newQuantity:
 *                   type: number
 *                   description: Новое количество в ячейке
 *                 pickedQuantity:
 *                   type: number
 *                   description: Снятое количество
 *                 isDeleted:
 *                   type: boolean
 *                   description: Флаг удаления записи (всегда false, так как записи не удаляются)
 *                 productQnt:
 *                   type: number
 *                   description: Общее количество товара (не изменяется при снятии)
 *       400:
 *         description: Ошибка валидации параметров
 *       404:
 *         description: Товар не найден в указанной ячейке
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/:productId/pick', [
  param('productId').isString().trim().notEmpty(),
  body('prunitId').isString().trim().notEmpty(),
  body('quantity').isNumeric().toFloat(),
  body('executor').isString().trim().notEmpty(),
  body('locationId').isString().trim().notEmpty(),
  body('sklad_id').isString().trim().notEmpty(),
  validate
], storageController.pickFromLocation.bind(storageController));

/**
 * @swagger
 * /api/storage/{productId}/buffer:
 *   post:
 *     summary: Добавление товара в буфер
 *     description: Добавляет товар в буфер с учетом артикула, единицы хранения, штрих-кода ячейки и ID склада. Если найдена запись с таким же артикулом, единицей хранения, штрих-кодом ячейки и ID склада - обновляет количество, иначе создает новую запись с автоматически сгенерированным уникальным ID.
 *     tags: [Склад]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Артикул товара
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
 *                 oneOf:
 *                   - type: string
 *                   - type: number
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
 *               conditionState:
 *                 type: string
 *                 enum: [кондиция, некондиция]
 *                 description: Состояние товара
 *               expirationDate:
 *                 type: string
 *                 description: Срок годности (формат YYYY-MM-DD или DD.MM.YYYY)
 *               name:
 *                 type: string
 *                 description: Наименование товара
 *               article:
 *                 type: string
 *                 description: Артикул товара
 *               shk:
 *                 type: string
 *                 description: Штрих-код товара
 *               sklad_id:
 *                 type: string
 *                 description: ID склада (соответствует полю id_scklad в базе данных)
 *     responses:
 *       200:
 *         description: Товар успешно добавлен в буфер
 *         content:
 *           application/json:
 *             schema:
 *               type: boolean
 *               description: true - операция выполнена успешно
 *       400:
 *         description: Ошибка валидации параметров
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/:productId/buffer', [
  param('productId').isString().trim().notEmpty(),
  body('prunitId').custom(value => {
    // Принимаем как строки, так и числа
    return value !== undefined && value !== null && (typeof value === 'string' || typeof value === 'number');
  }),
  body('quantity').isFloat({ min: 0.01 }),
  body('executor').isString().trim().notEmpty(),
  body('wrShk').isString().trim().notEmpty(),
  body('conditionState').optional().custom(value => {
    // Принимаем любые значения, контроллер сам нормализует их
    return true;
  }),
  body('expirationDate').optional().custom(value => {
    // Принимаем любые строки, контроллер сам проверит формат
    return true;
  }),
  body('name').optional().isString(),
  body('article').optional().isString(),
  body('shk').optional().isString(),
  body('sklad_id').optional().isString(),
  validate
], storageController.moveToBuffer);

/**
 * @swagger
 * /api/storage/{productId}/buffer/out:
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
 *               - locationId
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
 *               locationId:
 *                 type: string
 *                 description: ID местоположения в буфере
 *     responses:
 *       200:
 *         description: Товар успешно перемещен из буфера
 *       400:
 *         description: Ошибка валидации параметров
 *       404:
 *         description: Товар не найден в буфере
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/:productId/buffer/out', [
  param('productId').isString().trim().notEmpty(),
  body('prunitId').isString().trim().notEmpty(),
  body('quantity').isFloat({ min: 0.01 }),
  body('condition').isIn(['кондиция', 'некондиция']),
  body('executor').isString().trim().notEmpty(),
  body('locationId').isString().trim().notEmpty(),
  validate
], storageController.moveFromBuffer);

/**
 * @swagger
 * /api/storage/{productId}/buffer/move:
 *   post:
 *     summary: Перемещение товара между буферными ячейками
 *     description: Перемещает товар между ячейками. Если в целевой ячейке уже есть товар с таким же артикулом, единицей хранения и ID склада, то количества суммируются. Если данные не совпадают, создается новая запись с автоматически сгенерированным ID.
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
 *               id_sklad:
 *                 type: string
 *                 description: ID склада. Если указан, то перемещение будет выполнено только для товаров с указанным ID склада.
 *     responses:
 *       200:
 *         description: Товар успешно перемещен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 msg:
 *                   type: string
 *                   example: Товар успешно перемещен
 *                 data:
 *                   type: object
 *                   properties:
 *                     sourceItem:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         article:
 *                           type: string
 *                         shk:
 *                           type: string
 *                         previousQuantity:
 *                           type: number
 *                         newQuantity:
 *                           type: number
 *                         prunitId:
 *                           type: string
 *                         prunitName:
 *                           type: string
 *                     targetItem:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         article:
 *                           type: string
 *                         shk:
 *                           type: string
 *                         previousQuantity:
 *                           type: number
 *                         newQuantity:
 *                           type: number
 *                         prunitId:
 *                           type: string
 *                         prunitName:
 *                           type: string
 *                         isNewRecord:
 *                           type: boolean
 *                           description: Флаг, указывающий, была ли создана новая запись
 *                     conditionState:
 *                       type: string
 *                     expirationDate:
 *                       type: string
 *                       format: date
 *       400:
 *         description: Ошибка валидации параметров, недостаточное количество или исходная и целевая ячейки совпадают
 *       404:
 *         description: Товар не найден в указанной ячейке
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/:productId/buffer/move', [
  param('productId').isString().trim().notEmpty(),
  body('sourceLocationId').isString().trim().notEmpty(),
  body('targetLocationId').isString().trim().notEmpty(),
  body('prunitId').isString().trim().notEmpty(),
  body('quantity').isFloat({ min: 0.01 }),
  body('executor').isString().trim().notEmpty(),
  body('conditionState').optional().isIn(['кондиция', 'некондиция']),
  body('expirationDate').optional().isISO8601(),
  body('id_sklad').optional().isString().trim(),
  validate
], storageController.moveItemBetweenLocations);

/**
 * @swagger
 * /api/storage/pick-from-location-by-sklad-id:
 *   post:
 *     summary: Снятие товара из ячейки с учетом поля sklad_id
 *     description: Снимает указанное количество товара из ячейки хранения с учетом идентификатора склада. Уменьшает только количество в ячейке (place_qnt), не изменяя общее количество товара (product_qnt). При достижении нулевого количества в ячейке запись не удаляется, а сохраняется с нулевым значением place_qnt.
 *     tags: [Склад]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - WR_SHK
 *               - prunitId
 *               - quantity
 *               - executor
 *             properties:
 *               productId:
 *                 type: string
 *                 description: ID товара
 *               WR_SHK:
 *                 type: string
 *                 description: Штрих-код ячейки
 *               prunitId:
 *                 type: string
 *                 description: ID единицы хранения
 *               quantity:
 *                 type: number
 *                 description: Количество товара для снятия
 *               executor:
 *                 type: string
 *                 description: ID исполнителя операции
 *               sklad_id:
 *                 type: string
 *                 description: ID склада. Если указан, то снятие товара будет произведено только для товаров с указанным ID склада в данной ячейке.
 *     responses:
 *       200:
 *         description: Товар успешно снят из ячейки
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
 *                   example: Товар успешно снят из ячейки
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: ID товара
 *                     locationId:
 *                       type: string
 *                       description: ID ячейки
 *                     prunitId:
 *                       type: string
 *                       description: ID единицы хранения
 *                     name:
 *                       type: string
 *                       description: Наименование товара
 *                     article:
 *                       type: string
 *                       description: Артикул товара
 *                     shk:
 *                       type: string
 *                       description: Штрих-код товара
 *                     conditionState:
 *                       type: string
 *                       description: Состояние товара
 *                     previousQuantity:
 *                       type: number
 *                       description: Предыдущее количество товара в ячейке
 *                     newQuantity:
 *                       type: number
 *                       description: Новое количество товара в ячейке
 *                     pickedQuantity:
 *                       type: number
 *                       description: Снятое количество товара
 *                     isDeleted:
 *                       type: boolean
 *                       description: Флаг удаления записи (всегда false, так как записи не удаляются)
 *                     productQnt:
 *                       type: number
 *                       description: Общее количество товара (не изменяется при снятии)
 *       400:
 *         description: Ошибка в запросе или недостаточное количество товара
 *       404:
 *         description: Товар не найден в указанной ячейке с указанным ID склада
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/pick-from-location-by-sklad-id', [
  body('productId').isString().notEmpty(),
  body('WR_SHK').isString().notEmpty(),
  body('prunitId').isString().notEmpty(),
  body('quantity').isNumeric().toFloat(),
  body('executor').isString().notEmpty(),
  body('sklad_id').optional().isString()
], validate, storageController.pickFromLocationBySkladId.bind(storageController));

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
 *     description: Получение списка товаров в указанной ячейке
 *     tags: [Склад, Desktop]
 *     parameters:
 *       - in: path
 *         name: locationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID ячейки
 *       - in: query
 *         name: sklad_id
 *         schema:
 *           type: string
 *         description: ID склада (опционально)
 *       - in: query
 *         name: id_sklad
 *         schema:
 *           type: string
 *         description: ID склада (альтернативное имя параметра, опционально)
 *     responses:
 *       200:
 *         description: Список товаров в ячейке
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
 *                         description: ID товара
 *                       name:
 *                         type: string
 *                         description: Наименование товара
 *                       article:
 *                         type: string
 *                         description: Артикул товара
 *                       shk:
 *                         type: string
 *                         description: Штрих-код товара
 *                       prunit_id:
 *                         type: string
 *                       prunit_name:
 *                         type: string
 *                       product_qnt:
 *                         type: number
 *                       id_scklad:
 *                         type: string
 *       400:
 *         description: Некорректные параметры запроса
 *       404:
 *         description: Товары в ячейке не найдены
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/inventory/location/:locationId', [
  param('locationId').isString().trim().notEmpty(),
  query('sklad_id').optional().isString().trim(),
  query('id_sklad').optional().isString().trim(),
  validate
], storageController.getLocationItems);

/**
 * @swagger
 * /api/storage/inventory/article/{article}:
 *   get:
 *     summary: Инвентаризация по артикулу
 *     tags: [Склад, Desktop]
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
 * /api/storage/location/{locationId}/clear:
 *   post:
 *     summary: Очистка ячейки
 *     description: Установка нулевого количества для всех товаров в ячейке
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
 *                 description: ID исполнителя операции
 *               sklad_id:
 *                 type: string
 *                 description: ID склада (опционально). Если указан, то очистка будет произведена только для товаров с указанным ID склада в данной ячейке.
 *     responses:
 *       200:
 *         description: Ячейка успешно очищена
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
 *                   example: Ячейка очищена
 *                 clearedItems:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: ID товара
 *                       name:
 *                         type: string
 *                         description: Наименование товара
 *                       article:
 *                         type: string
 *                         description: Артикул товара
 *                       shk:
 *                         type: string
 *                         description: Штрих-код товара
 *                       prunitId:
 *                         type: string
 *                         description: ID единицы хранения
 *                       prunitName:
 *                         type: string
 *                         description: Наименование единицы хранения
 *                       previousQuantity:
 *                         type: number
 *                         description: Предыдущее количество товара
 *                       newQuantity:
 *                         type: number
 *                         description: Новое количество товара (всегда 0)
 *       400:
 *         description: Некорректные параметры запроса
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/location/:locationId/clear', [
  param('locationId').isString().trim().notEmpty(),
  body('executor').isString().trim().notEmpty(),
  body('sklad_id').optional().isString().trim(),
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
 *     description: Возвращает отчет по остаткам товаров в буфере из таблицы x_Storage_Full_Info. Выбирает записи, где WR_SHK не NULL.
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
 *                         oneOf:
 *                           - type: string
 *                           - type: number
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
 *                         format: date
 *                       createdAt:
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

/**
 * @swagger
 * /api/storage/location-items/{locationId}:
 *   get:
 *     summary: Получение списка товаров в ячейке
 *     tags: [Склад]
 *     parameters:
 *       - in: path
 *         name: locationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID ячейки
 *       - in: query
 *         name: id_sklad
 *         required: false
 *         schema:
 *           type: string
 *         description: ID склада (опционально). Если указан, то будут возвращены только товары с указанным ID склада в данной ячейке.
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
router.get('/location-items/:locationId', [
  param('locationId').isString().trim().notEmpty(),
  query('id_sklad').optional().isString().trim(),
  validate
], storageController.getLocationItems);

/**
 * @swagger
 * /api/storage/location/{locationId}/details:
 *   get:
 *     summary: Получение детальной информации о ячейке
 *     description: Возвращает подробную информацию о ячейке, включая список товаров, статистику и группировку по артикулам
 *     tags: [Desktop, Склад]
 *     parameters:
 *       - in: path
 *         name: locationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Штрих-код ячейки
 *       - in: query
 *         name: id_scklad
 *         required: false
 *         schema:
 *           type: string
 *         description: ID склада (опционально). Если указан, то будут возвращены только товары с указанным ID склада в данной ячейке.
 *       - in: query
 *         name: sklad_id
 *         required: false
 *         schema:
 *           type: string
 *         description: Альтернативное имя для параметра id_scklad.
 *     responses:
 *       200:
 *         description: Успешное получение информации о ячейке
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     locationId:
 *                       type: string
 *                       description: Штрих-код ячейки
 *                     skladId:
 *                       type: string
 *                       description: ID склада
 *                     totalItems:
 *                       type: integer
 *                       description: Общее количество товаров в ячейке
 *                     totalQuantity:
 *                       type: number
 *                       description: Общее количество единиц товаров в ячейке
 *                     uniqueArticles:
 *                       type: integer
 *                       description: Количество уникальных артикулов в ячейке
 *                     items:
 *                       type: array
 *                       description: Список товаров в ячейке
 *                       items:
 *                         type: object
 *                     articleGroups:
 *                       type: array
 *                       description: Группировка товаров по артикулам
 *                       items:
 *                         type: object
 *       400:
 *         description: Некорректные параметры запроса
 *       404:
 *         description: Ячейка не найдена или пуста
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/location/:locationId/details', [
  param('locationId').isString().trim().notEmpty(),
  query('id_scklad').optional().isString().trim(),
  query('sklad_id').optional().isString().trim(),
  validate
], storageController.getLocationDetails);

/**
 * @swagger
 * /api/storage/article/{article}/details:
 *   get:
 *     summary: Получение детальной информации о товаре по артикулу
 *     description: Возвращает подробную информацию о товаре, включая список ячеек, где он хранится, статистику и группировку по ячейкам и единицам хранения
 *     tags: [Desktop, Склад]
 *     parameters:
 *       - in: path
 *         name: article
 *         required: true
 *         schema:
 *           type: string
 *         description: Артикул товара
 *     responses:
 *       200:
 *         description: Успешное получение информации о товаре
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     article:
 *                       type: string
 *                       description: Артикул товара
 *                     name:
 *                       type: string
 *                       description: Наименование товара
 *                     shk:
 *                       type: string
 *                       description: Штрих-код товара
 *                     totalLocations:
 *                       type: integer
 *                       description: Общее количество ячеек, где хранится товар
 *                     totalQuantity:
 *                       type: number
 *                       description: Общее количество единиц товара на складе
 *                     uniqueUnits:
 *                       type: integer
 *                       description: Количество уникальных единиц хранения
 *                     locations:
 *                       type: array
 *                       description: Список ячеек, где хранится товар
 *                       items:
 *                         type: object
 *                     locationGroups:
 *                       type: array
 *                       description: Группировка по ячейкам
 *                       items:
 *                         type: object
 *                     unitGroups:
 *                       type: array
 *                       description: Группировка по единицам хранения
 *                       items:
 *                         type: object
 *       400:
 *         description: Некорректные параметры запроса
 *       404:
 *         description: Товар не найден или отсутствует на складе
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/article/:article/details', [
  param('article').isString().trim().notEmpty(),
  validate
], storageController.getArticleDetails);

/**
 * @swagger
 * /api/storage/inventory/{locationId}:
 *   post:
 *     summary: Выполнение инвентаризации ячейки
 *     description: Выполняет инвентаризацию ячейки, сравнивая фактическое наличие товаров с данными в системе
 *     tags: [Desktop, Склад]
 *     parameters:
 *       - in: path
 *         name: locationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Штрих-код ячейки
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *               - executor
 *             properties:
 *               items:
 *                 type: array
 *                 description: Список товаров, обнаруженных при инвентаризации
 *                 items:
 *                   type: object
 *                   required:
 *                     - article
 *                     - prunitId
 *                     - quantity
 *                   properties:
 *                     article:
 *                       type: string
 *                       description: Артикул товара
 *                     name:
 *                       type: string
 *                       description: Наименование товара (опционально, для новых товаров)
 *                     prunitId:
 *                       type: string
 *                       description: ID единицы хранения
 *                     quantity:
 *                       type: number
 *                       description: Фактическое количество товара
 *                     shk:
 *                       type: string
 *                       description: Штрих-код товара (опционально, для новых товаров)
 *                     conditionState:
 *                       type: string
 *                       enum: [кондиция, некондиция]
 *                       description: Состояние товара (опционально)
 *                     notes:
 *                       type: string
 *                       description: Примечания к товару (опционально)
 *               executor:
 *                 type: string
 *                 description: ID исполнителя инвентаризации
 *               idScklad:
 *                 type: string
 *                 description: ID склада (опционально)
 *               updateQuantities:
 *                 type: boolean
 *                 description: Флаг, указывающий, нужно ли обновлять количества товаров в системе (по умолчанию false)
 *     responses:
 *       200:
 *         description: Инвентаризация успешно выполнена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     locationId:
 *                       type: string
 *                       description: Штрих-код ячейки
 *                     idScklad:
 *                       type: string
 *                       description: ID склада
 *                     status:
 *                       type: string
 *                       enum: [match, discrepancy, completed]
 *                       description: Статус инвентаризации
 *                     message:
 *                       type: string
 *                       description: Сообщение о результате инвентаризации
 *                     inventoryResults:
 *                       type: array
 *                       description: Результаты инвентаризации по каждому товару
 *                       items:
 *                         type: object
 *       400:
 *         description: Некорректные параметры запроса
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/inventory/:locationId', [
  param('locationId').isString().trim().notEmpty(),
  body('items').isArray(),
  body('executor').isString().trim().notEmpty(),
  body('idScklad').optional().isString().trim(),
  body('updateQuantities').optional().isBoolean(),
  validate
], storageController.performInventory);

/**
 * @swagger
 * /api/storage/inventory/history:
 *   get:
 *     summary: Получение истории инвентаризаций
 *     description: Возвращает историю инвентаризаций с возможностью фильтрации по различным параметрам
 *     tags: [Desktop, Склад]
 *     parameters:
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: string
 *         description: Штрих-код ячейки для фильтрации
 *       - in: query
 *         name: article
 *         schema:
 *           type: string
 *         description: Артикул товара для фильтрации
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Начальная дата для фильтрации (формат YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Конечная дата для фильтрации (формат YYYY-MM-DD)
 *       - in: query
 *         name: executor
 *         schema:
 *           type: string
 *         description: ID исполнителя для фильтрации
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [match, surplus, shortage, missing, not_found]
 *         description: Статус инвентаризации для фильтрации
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Ограничение количества записей
 *     responses:
 *       200:
 *         description: История инвентаризаций успешно получена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     records:
 *                       type: array
 *                       description: Записи истории инвентаризаций
 *                       items:
 *                         type: object
 *                     groupedRecords:
 *                       type: array
 *                       description: Записи, сгруппированные по дате и ячейке
 *                       items:
 *                         type: object
 *       400:
 *         description: Некорректные параметры запроса
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/inventory/history', [
  query('locationId').optional().isString().trim(),
  query('article').optional().isString().trim(),
  query('startDate').optional().isString().trim(),
  query('endDate').optional().isString().trim(),
  query('executor').optional().isString().trim(),
  query('status').optional().isString().trim(),
  query('limit').optional().isInt().toInt(),
  validate
], storageController.getInventoryHistory);

/**
 * @swagger
 * /api/storage/inventory/summary:
 *   get:
 *     summary: Получение сводного отчета по инвентаризациям
 *     description: Возвращает сводный отчет по инвентаризациям с различными статистическими данными
 *     tags: [Desktop, Склад]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Начальная дата для фильтрации (формат YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Конечная дата для фильтрации (формат YYYY-MM-DD)
 *       - in: query
 *         name: executor
 *         schema:
 *           type: string
 *         description: ID исполнителя для фильтрации
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [match, surplus, shortage, missing, not_found]
 *         description: Статус инвентаризации для фильтрации
 *     responses:
 *       200:
 *         description: Сводный отчет по инвентаризациям успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       description: Общая статистика по инвентаризациям
 *                     details:
 *                       type: object
 *                       description: Детальная статистика по различным параметрам
 *                     inventories:
 *                       type: array
 *                       description: Список инвентаризаций
 *                       items:
 *                         type: object
 *       400:
 *         description: Некорректные параметры запроса
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/inventory/summary', [
  query('startDate').optional().isString().trim(),
  query('endDate').optional().isString().trim(),
  query('executor').optional().isString().trim(),
  query('status').optional().isString().trim(),
  validate
], storageController.getInventorySummary);

/**
 * @swagger
 * /api/storage/article-info:
 *   get:
 *     summary: Получение информации о товаре по артикулу или ШК с фильтрацией по id_sklad
 *     tags: [Storage]
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
 *       - in: query
 *         name: id_sklad
 *         schema:
 *           type: string
 *         description: ID склада
 *     responses:
 *       200:
 *         description: Успешное получение информации о товаре
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     article:
 *                       type: string
 *                       example: "12345"
 *                     shk:
 *                       type: string
 *                       example: "1234567890"
 *                     name:
 *                       type: string
 *                       example: "Товар 1"
 *                     totalItems:
 *                       type: integer
 *                       example: 2
 *                     totalQuantity:
 *                       type: number
 *                       example: 10.5
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                     locations:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Ошибка в запросе
 *       404:
 *         description: Товар не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
// Получение информации о товаре по артикулу или ШК с фильтрацией по id_sklad
router.get('/article-info', storageController.getArticleInfoBySklad);

/**
 * @swagger
 * /api/storage/empty-cells:
 *   get:
 *     summary: Получение списка пустых ячеек
 *     tags: [Storage]
 *     parameters:
 *       - in: query
 *         name: id_sklad
 *         schema:
 *           type: string
 *         description: ID склада (WR_House) для фильтрации пустых ячеек
 *     responses:
 *       200:
 *         description: Успешное получение списка пустых ячеек
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     cells:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "1"
 *                           name:
 *                             type: string
 *                             example: "Ячейка A1"
 *                           shk:
 *                             type: string
 *                             example: "SHK123456"
 *                           wrHouse:
 *                             type: string
 *                             example: "Склад 1"
 *                     count:
 *                       type: integer
 *                       example: 10
 *       500:
 *         description: Внутренняя ошибка сервера
 */
// Получение списка пустых ячеек
router.get('/empty-cells', storageController.getEmptyCells);

/**
 * @swagger
 * /api/storage/all:
 *   get:
 *     summary: Получение всей информации из таблицы x_Storage_Full_Info
 *     tags: [Storage]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 1000
 *         description: Ограничение количества записей
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Смещение для пагинации
 *       - in: query
 *         name: id_sklad
 *         schema:
 *           type: string
 *         description: ID склада для фильтрации
 *     responses:
 *       200:
 *         description: Успешное получение данных
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           article:
 *                             type: string
 *                           shk:
 *                             type: string
 *                           productQnt:
 *                             type: number
 *                           placeQnt:
 *                             type: number
 *                           prunitId:
 *                             type: string
 *                           prunitName:
 *                             type: string
 *                           wrShk:
 *                             type: string
 *                           idScklad:
 *                             type: string
 *                     total:
 *                       type: integer
 *                       description: Общее количество записей
 *                     limit:
 *                       type: integer
 *                       description: Использованное ограничение количества записей
 *                     offset:
 *                       type: integer
 *                       description: Использованное смещение для пагинации
 *       500:
 *         description: Внутренняя ошибка сервера
 */
// Получение всей информации из таблицы x_Storage_Full_Info
router.get('/all', storageController.getAllStorageInfo);

module.exports = router;
