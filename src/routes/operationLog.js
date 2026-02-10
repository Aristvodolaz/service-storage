const express = require('express');
const router = express.Router();
const operationLogController = require('../controllers/OperationLogController');
const { query } = require('express-validator');
const { validate } = require('../middlewares/validator');

/**
 * @swagger
 * tags:
 *   name: Логи операций
 *   description: API для работы с логами операций
 */

/**
 * @swagger
 * /api/logs:
 *   get:
 *     summary: Получение списка логов операций
 *     tags: [Логи операций]
 *     parameters:
 *       - in: query
 *         name: endpoint
 *         schema:
 *           type: string
 *         description: Фильтр по endpoint (частичное совпадение)
 *       - in: query
 *         name: http_method
 *         schema:
 *           type: string
 *           enum: [GET, POST, PUT, DELETE, PATCH]
 *         description: Фильтр по HTTP методу
 *       - in: query
 *         name: executor
 *         schema:
 *           type: string
 *         description: Фильтр по исполнителю
 *       - in: query
 *         name: status_code
 *         schema:
 *           type: integer
 *         description: Фильтр по коду статуса HTTP
 *       - in: query
 *         name: operation_result
 *         schema:
 *           type: string
 *           enum: [success, error]
 *         description: Фильтр по результату операции
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Дата начала периода (ISO 8601)
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Дата окончания периода (ISO 8601)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *           maximum: 1000
 *         description: Количество записей на странице
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Смещение для пагинации
 *     responses:
 *       200:
 *         description: Список логов операций
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
 *                         type: integer
 *                       endpoint:
 *                         type: string
 *                       http_method:
 *                         type: string
 *                       status_code:
 *                         type: integer
 *                       execution_time_ms:
 *                         type: integer
 *                       executor:
 *                         type: string
 *                       operation_result:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/', [
  query('endpoint').optional().isString().trim(),
  query('http_method').optional().isIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  query('executor').optional().isString().trim(),
  query('status_code').optional().isInt(),
  query('operation_result').optional().isIn(['success', 'error']),
  query('date_from').optional().isISO8601(),
  query('date_to').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 1000 }),
  query('offset').optional().isInt({ min: 0 }),
  validate
], operationLogController.getLogs);

/**
 * @swagger
 * /api/logs/statistics:
 *   get:
 *     summary: Получение статистики по логам операций
 *     tags: [Логи операций]
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Дата начала периода (ISO 8601)
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Дата окончания периода (ISO 8601)
 *     responses:
 *       200:
 *         description: Статистика по логам
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
 *                     total:
 *                       type: integer
 *                       description: Общее количество операций
 *                     successful:
 *                       type: integer
 *                       description: Количество успешных операций
 *                     errors:
 *                       type: integer
 *                       description: Количество операций с ошибками
 *                     successRate:
 *                       type: number
 *                       description: Процент успешных операций
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/statistics', [
  query('date_from').optional().isISO8601(),
  query('date_to').optional().isISO8601(),
  validate
], operationLogController.getStatistics);

/**
 * @swagger
 * /api/logs/report:
 *   get:
 *     summary: Получение отчета по логам для фронтенда
 *     description: Возвращает структурированный отчет с агрегированными данными для построения графиков и таблиц
 *     tags: [Логи операций]
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Дата начала периода (ISO 8601)
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Дата окончания периода (ISO 8601)
 *       - in: query
 *         name: executor
 *         schema:
 *           type: string
 *         description: Фильтр по исполнителю
 *       - in: query
 *         name: endpoint
 *         schema:
 *           type: string
 *         description: Фильтр по endpoint (частичное совпадение)
 *       - in: query
 *         name: group_by
 *         schema:
 *           type: string
 *           enum: [hour, day, endpoint, executor, status_code, method]
 *           default: hour
 *         description: Тип группировки данных
 *       - in: query
 *         name: include_details
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Включить детальные логи в ответ (макс 1000 записей)
 *     responses:
 *       200:
 *         description: Отчет по логам
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
 *                       properties:
 *                         total_operations:
 *                           type: integer
 *                           description: Общее количество операций
 *                         successful_operations:
 *                           type: integer
 *                           description: Количество успешных операций
 *                         failed_operations:
 *                           type: integer
 *                           description: Количество операций с ошибками
 *                         success_rate:
 *                           type: string
 *                           description: Процент успешных операций
 *                         avg_execution_time_ms:
 *                           type: integer
 *                           description: Среднее время выполнения (мс)
 *                         max_execution_time_ms:
 *                           type: integer
 *                           description: Максимальное время выполнения (мс)
 *                         period:
 *                           type: object
 *                           properties:
 *                             from:
 *                               type: string
 *                             to:
 *                               type: string
 *                         filters:
 *                           type: object
 *                           properties:
 *                             executor:
 *                               type: string
 *                             endpoint:
 *                               type: string
 *                     grouped_data:
 *                       type: array
 *                       description: Агрегированные данные по группам
 *                       items:
 *                         type: object
 *                         properties:
 *                           total_count:
 *                             type: integer
 *                           success_count:
 *                             type: integer
 *                           error_count:
 *                             type: integer
 *                           success_rate:
 *                             type: string
 *                           avg_execution_time:
 *                             type: integer
 *                           min_execution_time:
 *                             type: integer
 *                           max_execution_time:
 *                             type: integer
 *                           unique_executors:
 *                             type: integer
 *                           unique_ips:
 *                             type: integer
 *                     group_by:
 *                       type: string
 *                       description: Тип использованной группировки
 *                     details:
 *                       type: array
 *                       description: Детальные логи (если include_details=true)
 *       400:
 *         description: Ошибка валидации параметров
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/report', [
  query('date_from').optional().isISO8601(),
  query('date_to').optional().isISO8601(),
  query('executor').optional().isString().trim(),
  query('endpoint').optional().isString().trim(),
  query('group_by').optional().isIn(['hour', 'day', 'endpoint', 'executor', 'status_code', 'method']),
  query('include_details').optional().isBoolean(),
  validate
], operationLogController.getReport);

module.exports = router;
