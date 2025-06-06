const BaseRepository = require('./BaseRepository');
const Article = require('../models/Article');
const logger = require('../utils/logger');

/**
 * Репозиторий для работы с артикулами
 */
class ArticleRepository extends BaseRepository {
  /**
   * Поиск товара по ШК
   * @param {string} shk - Штрих-код товара
   * @returns {Promise<Array<Article>>} - Массив найденных артикулов
   */
  async findByShk(shk) {
    logger.info(`Поиск товара по ШК: ${shk}`);
    const query = `
      SELECT * 
      FROM OPENQUERY(OW, 'SELECT id, name, COALESCE(qnt_in_pallet, 0) as qnt_in_pallet FROM wms.article WHERE (PIECE_GTIN = ''@shk'' or FPACK_GTIN= ''@shk'') and article_id_real = id')
    `;
    const result = await this.executeQuery(query, { shk });
    return Article.fromDatabaseArray(result);
  }

  /**
   * Поиск товара по артикулу
   * @param {string} articleId - ID артикула
   * @returns {Promise<Array<Article>>} - Массив найденных артикулов
   */
  async findById(articleId) {
    logger.info(`Поиск товара по артикулу: ${articleId}`);
    const query = `
      SELECT * 
      FROM OPENQUERY(OW, 'SELECT id, name, COALESCE(qnt_in_pallet, 0) as qnt_in_pallet FROM wms.article WHERE ID = ''@articleId'' and article_id_real = id')
    `;
    const result = await this.executeQuery(query, { articleId });
    return Article.fromDatabaseArray(result);
  }
}

module.exports = new ArticleRepository(); 