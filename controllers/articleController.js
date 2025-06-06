const mssql = require('mssql');
const { connectToDatabase } = require('../config/database');
const logger = require('../utils/logger');

// Функция для выполнения SQL-запроса с обработкой ошибок
const executeQuery = async (pool, query, params = {}) => {
  try {
    logger.debug(`Выполнение SQL-запроса: ${query}`);
    const request = pool.request();

    // Добавляем параметры к запросу для предотвращения SQL-инъекций
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
    });

    const result = await request.query(query);
    logger.debug(`Запрос выполнен успешно, получено ${result.recordset.length} записей`);
    return result.recordset;
  } catch (error) {
    logger.error(`Ошибка выполнения запроса: ${error.message}`, { stack: error.stack });
    throw new Error(`Ошибка выполнения запроса: ${error.message}`);
  }
};

// Функция поиска товара по ШК
const searchArticleBySHK = async (pool, shk) => {
  logger.info(`Поиск товара по ШК: ${shk}`);
  const query = `
    SELECT *
    FROM OPENQUERY(OW, 'SELECT id, name, COALESCE(qnt_in_pallet, 0) as qnt_in_pallet FROM wms.article WHERE (PIECE_GTIN = ''@shk'' or or FPACK_GTIN= ''@shk'') and article_id_real = id')
  `;
  return await executeQuery(pool, query, { shk });
};

// Функция поиска товара по артикулу
const searchArticleById = async (pool, article) => {
  logger.info(`Поиск товара по артикулу: ${article}`);
  const query = `
    SELECT *
    FROM OPENQUERY(OW, 'SELECT id, name, COALESCE(qnt_in_pallet, 0) as qnt_in_pallet FROM wms.article WHERE ID = ''@article'' and article_id_real = id')
  `;
  return await executeQuery(pool, query, { article });
};

// Основная функция контроллера
const searchByArticle = async (req, res) => {
  const { shk, article } = req.query; // Извлекаем параметры из запроса

  logger.info(`Запрос на поиск товара: ШК = ${shk || 'не указан'}, Артикул = ${article || 'не указан'}`);

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      logger.error('Не удалось подключиться к базе данных');
      return res.status(500).json({
        success: false,
        msg: 'Ошибка подключения к базе данных',
        errorCode: 500
      });
    }

    let result = [];

    if (shk) {
      result = await searchArticleBySHK(pool, shk);
    } else if (article) {
      result = await searchArticleById(pool, article);
    }

    if (result.length === 0) {
      logger.warn(`Товар не найден: ШК = ${shk || 'не указан'}, Артикул = ${article || 'не указан'}`);
      return res.status(404).json({
        success: false,
        msg: 'Товар не найден',
        errorCode: 404
      });
    }

    logger.info(`Товар найден успешно: ${result.length} записей`);
    res.status(200).json({
      success: true,
      value: result,
      errorCode: 200
    });
  } catch (error) {
    logger.error(`Ошибка при поиске товара: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      msg: `Ошибка при поиске товара: ${error.message}`,
      errorCode: 500
    });
  }
};

module.exports = {
  searchByArticle,
};
