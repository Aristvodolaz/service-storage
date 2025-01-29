const mssql = require('mssql');
const { connectToDatabase } = require('../config/database');

// Функция для выполнения SQL-запроса с обработкой ошибок
const executeQuery = async (pool, query) => {
  try {
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (error) {
    console.error('Ошибка выполнения запроса:', error);
    throw new Error('Ошибка выполнения запроса');
  }
};

// Функция поиска сотрудника по ID
const searchEmployeeById = async (pool, id) => {
    const query = `
      SELECT ID, FULL_NAME 
      FROM OPENQUERY(OW, 'SELECT ID, FULL_NAME FROM staff.employee WHERE id = ''${id}''')
        `;
        return await executeQuery(pool, query);
  };
  
// Основная функция контроллера
const searchBySHKForAuth = async (req, res) => {
    const { id } = req.query;
  
    console.log("Попытка авторизовать ШК: "+id+"")
  
    if (!id) {
      return res.status(400).json({ success: false, msg: 'Необходимо указать ID сотрудника', errorCode: 400 });
    }
  
    try {
      const pool = await connectToDatabase();
      if (!pool) {
        throw new Error('Ошибка подключения к базе данных');
      }
  
      const result = await searchEmployeeById(pool, id);
  
      if (result.length === 0) {
        return res.status(404).json({ success: false, msg: 'Сотрудник не найден', errorCode: 404 });
      }
  
      res.status(200).json({ success: true, value: result, errorCode: 200 });
    } catch (error) {
      console.error('Ошибка при поиске по ID сотрудника:', error);
      res.status(500).json({ success: false, msg: 'Ошибка при поиске по ID сотрудника', errorCode: 500 });
    }
  };
  
  module.exports = {
    searchBySHKForAuth,
  };