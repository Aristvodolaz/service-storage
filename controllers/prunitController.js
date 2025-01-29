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

// Функция поиска информации о продукте по его ID
const searchPrunitByProductId = async (pool, productId) => {
  const query = `
    SELECT ID, PRODUCT_ID, PRODUCT_QNT, PRUNIT_TYPE_ID 
    FROM OPENQUERY(OW, 'SELECT ID, PRODUCT_ID, PRODUCT_QNT, PRUNIT_TYPE_ID FROM wms.prunit 
                     WHERE product_id = ''${productId}'' AND rec_state = ''1''')
  `;
  return await executeQuery(pool, query);
};

// Контроллер для поиска информации о продукте
const searchPrunit = async (req, res) => {
  const { productId } = req.query;

  console.log("Попытка поиска информации о продукте с ID:", productId);

  if (!productId) {
    return res.status(400).json({ success: false, msg: 'Необходимо указать ID продукта', errorCode: 400 });
  }

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    const result = await searchPrunitByProductId(pool, productId);

    if (result.length === 0) {
      return res.status(404).json({ success: false, msg: 'Продукт не найден', errorCode: 404 });
    }

    res.status(200).json({ success: true, value: result, errorCode: 200 });
  } catch (error) {
    console.error('Ошибка при поиске информации о продукте:', error);
    res.status(500).json({ success: false, msg: 'Ошибка при поиске информации о продукте', errorCode: 500 });
  }
};

module.exports = {
  searchPrunit,
};
