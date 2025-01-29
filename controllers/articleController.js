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

// Функция поиска товара по ШК
const searchArticleBySHK = async (pool, shk) => {
  const query = `
    SELECT * 
    FROM OPENQUERY(OW, 'SELECT id, name, qnt_in_pallet FROM wms.article WHERE PIECE_GTIN = ''${shk}'' and article_id_real = id')
  `;
  return await executeQuery(pool, query);
};

// Функция поиска товара по артикулу
const searchArticleById = async (pool, article) => {
  const query = `
    SELECT * 
    FROM OPENQUERY(OW, 'SELECT id, name, qnt_in_pallet FROM wms.article WHERE ID = ''${article}'' and article_id_real = id')
  `;
  return await executeQuery(pool, query);
};

// Основная функция контроллера
const searchByArticle = async (req, res) => {
  const { shk, article } = req.query; // Извлекаем параметры из запроса

  console.log("Попытка поиска: ШК =", shk, "Артикул =", article);

  if (!shk && !article) {
    return res.status(400).json({ success: false, msg: 'Необходимо указать ШК или артикул', errorCode: 400 });
  }

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    let result = [];
    
    if (shk) {
      result = await searchArticleBySHK(pool, shk);
    } else if (article) {
      result = await searchArticleById(pool, article);
    }

    if (result.length === 0) {
      return res.status(404).json({ success: false, msg: 'Товар не найден', errorCode: 404 });
    }

    res.status(200).json({ success: true, value: result, errorCode: 200 });
  } catch (error) {
    console.error('Ошибка при поиске:', error);
    res.status(500).json({ success: false, msg: 'Ошибка при поиске', errorCode: 500 });
  }
};

module.exports = {
  searchByArticle,
};