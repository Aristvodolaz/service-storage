const BaseRepository = require('./BaseRepository');
const Prunit = require('../models/Prunit');
const logger = require('../utils/logger');

/**
 * Репозиторий для работы с Prunit
 */
class PrunitRepository extends BaseRepository {
  /**
   * Поиск информации о продукте по его ID
   * @param {string} productId - ID продукта
   * @returns {Promise<Array<Prunit>>} - Массив найденных записей
   */
  async findByProductId(productId) {
    logger.info(`Поиск информации о продукте по ID: ${productId}`);
    const query = `
      SELECT ID, PRODUCT_ID, PRODUCT_QNT, PRUNIT_TYPE_ID 
      FROM OPENQUERY(OW, 'SELECT ID, PRODUCT_ID, PRODUCT_QNT, PRUNIT_TYPE_ID FROM wms.prunit 
                       WHERE product_id = ''@productId'' AND rec_state = ''1''')
    `;
    const result = await this.executeQuery(query, { productId });
    return Prunit.fromDatabaseArray(result);
  }
}

module.exports = new PrunitRepository(); 