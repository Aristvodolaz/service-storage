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

// Функция поиска информации о продукте по его ID
const searchPrunitByProductId = async (pool, productId) => {
  logger.info(`Поиск информации о продукте по ID: ${productId}`);
  const query = `
    SELECT ID, PRODUCT_ID, PRODUCT_QNT, PRUNIT_TYPE_ID 
    FROM OPENQUERY(OW, 'SELECT ID, PRODUCT_ID, PRODUCT_QNT, PRUNIT_TYPE_ID FROM wms.prunit 
                     WHERE product_id = ''@productId'' AND rec_state = ''1''')
  `;
  return await executeQuery(pool, query, { productId });
};

// Контроллер для поиска информации о продукте
const searchPrunit = async (req, res) => {
  const { productId } = req.query;

  logger.info(`Запрос на поиск информации о продукте с ID: ${productId || 'не указан'}`);

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

    const result = await searchPrunitByProductId(pool, productId);

    if (result.length === 0) {
      logger.warn(`Продукт с ID ${productId} не найден`);
      return res.status(404).json({ 
        success: false, 
        msg: 'Продукт не найден', 
        errorCode: 404 
      });
    }

    logger.info(`Информация о продукте найдена успешно: ${result.length} записей`);
    res.status(200).json({ 
      success: true, 
      value: result, 
      errorCode: 200 
    });
  } catch (error) {
    logger.error(`Ошибка при поиске информации о продукте: ${error.message}`, { stack: error.stack });
    res.status(500).json({ 
      success: false, 
      msg: `Ошибка при поиске информации о продукте: ${error.message}`, 
      errorCode: 500 
    });
  }
};

module.exports = {
  searchPrunit,
};
