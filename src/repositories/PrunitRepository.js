const { connectToDatabase } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Репозиторий для работы с Prunit
 */
class PrunitRepository {
  constructor() {
    // Справочник типов единиц хранения
    this.prunitTypes = {
      0: { name: 'не указан', brief: 'не указан' },
      1: { name: 'Единица', brief: 'Ед' },
      2: { name: 'Минимальная Упаковка', brief: 'Мин.Уп' },
      3: { name: 'Промежуточная Упаковка', brief: 'Пр.Уп' },
      10: { name: 'Фабричная Упаковка', brief: 'Фб.Уп' },
      11: { name: 'Паллет', brief: 'Паллет' }
    };
  }

  /**
   * Получить текстовое описание типа единицы хранения
   * @param {number} typeId - ID типа единицы хранения
   * @returns {Object} Объект с полным названием и кратким обозначением
   */
  getPrunitTypeText(typeId) {
    return this.prunitTypes[typeId] || this.prunitTypes[0];
  }

  /**
   * Поиск информации о продукте по его ID
   * @param {string} productId - ID продукта
   * @returns {Promise<Array>} Массив найденных записей
   */
  async findByProductId(productId) {
    try {
      logger.info('Начало поиска по productId:', productId);

      const pool = await connectToDatabase();
      const query = `
        SELECT * FROM OPENQUERY(OW,
          'SELECT
            id,
            prunit_type_id,
            COALESCE(parent_qnt, 0) as parent_qnt,
            COALESCE(product_qnt, 0) as product_qnt,
            product_id
          FROM wms.prunit
          WHERE product_id = ''${productId}''
          AND rec_state = ''1'''
        )
      `;

      logger.info('SQL запрос:', query);

      const result = await pool.request().query(query);
      logger.info(`Получено записей: ${result.recordset.length}`);

      // Добавляем текстовое описание к каждой записи
      const records = result.recordset.map(record => {
        // Получаем тип из справочника по PRUNIT_TYPE_ID
        const typeId = parseInt(record.PRUNIT_TYPE_ID);
        const typeInfo = this.prunitTypes[typeId] || this.prunitTypes[0];

        logger.info('Тип единицы хранения:', {
          typeId,
          originalValue: record.PRUNIT_TYPE_ID,
          typeInfo
        });

        return {
          ...record,
          prunit_text: typeInfo.name,
          prunit_brief: typeInfo.brief
        };
      });

      return records;
    } catch (error) {
      logger.error('Ошибка при поиске по productId:', error);
      throw error;
    }
  }

  /**
   * Получение данных по типу единицы хранения
   * @param {number} prunitTypeId - Тип единицы хранения
   * @returns {Promise<Array>} Массив найденных записей
   */
  async getByType(prunitTypeId) {
    try {
      logger.info('Начало выполнения getByType с параметром:', prunitTypeId);

      const pool = await connectToDatabase();

      // Проверяем, что prunitTypeId является числом
      if (isNaN(prunitTypeId)) {
        throw new Error('Тип единицы хранения должен быть числом');
      }

      // Преобразуем в число для корректного сравнения
      const typeIdNum = parseInt(prunitTypeId);

      const query = `
        SELECT * FROM OPENQUERY(OW,
          'SELECT
            id,
            prunit_type_id,
            COALESCE(parent_qnt, 0) as parent_qnt,
            COALESCE(product_qnt, 0) as product_qnt
          FROM wms.prunit
          WHERE CAST(prunit_type_id AS INT) = ${typeIdNum}
          AND rec_state = ''1'''
        )
      `;

      logger.info('SQL запрос:', query);

      const result = await pool.request().query(query);
      logger.info(`Получено записей: ${result.recordset.length}`);

      // Добавляем текстовое описание к каждой записи
      const records = result.recordset.map(record => {
        // Получаем тип из справочника по PRUNIT_TYPE_ID
        const typeId = parseInt(record.PRUNIT_TYPE_ID);
        const typeInfo = this.prunitTypes[typeId] || this.prunitTypes[0];

        logger.info('Тип единицы хранения:', {
          typeId,
          originalValue: record.PRUNIT_TYPE_ID,
          typeInfo
        });

        return {
          ...record,
          prunit_text: typeInfo.name,
          prunit_brief: typeInfo.brief
        };
      });

      return records;
    } catch (error) {
      logger.error('Ошибка при получении данных по типу:', error);
      throw error;
    }
  }
}

module.exports = new PrunitRepository();
