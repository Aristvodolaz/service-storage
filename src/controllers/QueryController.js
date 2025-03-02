const { pool } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Выполняет запрос к базе данных через OPENQUERY
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
const executeOpenQuery = async (req, res) => {
  try {
    const { warehouseId, articleId } = req.query;

    // Проверка наличия обязательных параметров
    if (!warehouseId || !articleId) {
      return res.status(400).json({
        code: 400,
        message: 'Необходимо указать warehouseId и articleId'
      });
    }

    logger.info(`Выполнение запроса OPENQUERY: warehouseId = ${warehouseId}, articleId = ${articleId}`);

    // Формирование SQL-запроса с параметрами
    const query = `
      SELECT * FROM OPENQUERY(OW, 'SELECT * FROM wms.pick_article_rule
      WHERE warehouse_id = ''${warehouseId}'' AND article_id = ''${articleId}''')
    `;

    // Выполнение запроса
    const result = await pool.request().query(query);

    // Если данные не найдены
    if (result.recordset.length === 0) {
      return res.status(404).json({
        code: 404,
        message: `Данные не найдены для warehouse_id = ${warehouseId} и article_id = ${articleId}`
      });
    }

    // Возвращаем результат
    return res.status(200).json(result.recordset);
  } catch (error) {
    logger.error(`Ошибка при выполнении запроса OPENQUERY: ${error.message}`);
    return res.status(500).json({
      code: 500,
      message: 'Внутренняя ошибка сервера при выполнении запроса'
    });
  }
};

/**
 * Выполняет произвольный SQL-запрос с параметрами
 * @param {Object} req - HTTP запрос
 * @param {Object} res - HTTP ответ
 */
const executeCustomQuery = async (req, res) => {
  try {
    const { query, params } = req.body;

    // Проверка наличия запроса
    if (!query) {
      return res.status(400).json({
        code: 400,
        message: 'Необходимо указать SQL-запрос'
      });
    }

    logger.info(`Выполнение произвольного SQL-запроса: ${query}`);

    // Создаем запрос
    const request = pool.request();

    // Добавляем параметры, если они есть
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(key => {
        request.input(key, params[key]);
      });
    }

    // Выполнение запроса
    const result = await request.query(query);

    // Возвращаем результат
    return res.status(200).json({
      rowCount: result.rowsAffected[0],
      data: result.recordset || []
    });
  } catch (error) {
    logger.error(`Ошибка при выполнении произвольного SQL-запроса: ${error.message}`);
    return res.status(500).json({
      code: 500,
      message: 'Внутренняя ошибка сервера при выполнении запроса',
      error: error.message
    });
  }
};

module.exports = {
  executeOpenQuery,
  executeCustomQuery
};
