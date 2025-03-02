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

// Функция поиска сотрудника по ID
const searchEmployeeById = async (pool, id) => {
  logger.info(`Поиск сотрудника по ID: ${id}`);
  const query = `
    SELECT ID, FULL_NAME 
    FROM OPENQUERY(OW, 'SELECT ID, FULL_NAME FROM staff.employee WHERE id = ''@id''')
  `;
  return await executeQuery(pool, query, { id });
};

// Основная функция контроллера
const searchBySHKForAuth = async (req, res) => {
  const { id } = req.query;

  logger.info(`Запрос на авторизацию сотрудника с ID: ${id || 'не указан'}`);

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

    const result = await searchEmployeeById(pool, id);

    if (result.length === 0) {
      logger.warn(`Сотрудник с ID ${id} не найден`);
      return res.status(404).json({ 
        success: false, 
        msg: 'Сотрудник не найден', 
        errorCode: 404 
      });
    }

    logger.info(`Сотрудник успешно авторизован: ${result[0].FULL_NAME}`);
    res.status(200).json({ 
      success: true, 
      value: result, 
      errorCode: 200 
    });
  } catch (error) {
    logger.error(`Ошибка при авторизации сотрудника: ${error.message}`, { stack: error.stack });
    res.status(500).json({ 
      success: false, 
      msg: `Ошибка при авторизации сотрудника: ${error.message}`, 
      errorCode: 500 
    });
  }
};

module.exports = {
  searchBySHKForAuth,
};
