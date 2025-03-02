const articleRepository = require('../repositories/ArticleRepository');
const logger = require('../utils/logger');

/**
 * Сервис для работы с артикулами
 */
class ArticleService {
  /**
   * Поиск товара по ШК или артикулу
   * @param {string} shk - Штрих-код товара (опционально)
   * @param {string} articleId - ID артикула (опционально)
   * @returns {Promise<Array>} - Массив найденных артикулов
   * @throws {Error} - Если не указан ни ШК, ни артикул или произошла ошибка
   */
  async searchArticle(shk, articleId) {
    logger.info(`Запрос на поиск товара: ШК = ${shk || 'не указан'}, Артикул = ${articleId || 'не указан'}`);

    try {
      let result = [];
      
      if (shk) {
        result = await articleRepository.findByShk(shk);
      } else if (articleId) {
        result = await articleRepository.findById(articleId);
      } else {
        throw new Error('Необходимо указать ШК или артикул');
      }

      if (result.length === 0) {
        logger.warn(`Товар не найден: ШК = ${shk || 'не указан'}, Артикул = ${articleId || 'не указан'}`);
        throw new Error('Товар не найден');
      }

      logger.info(`Товар найден успешно: ${result.length} записей`);
      return result;
    } catch (error) {
      logger.error(`Ошибка при поиске товара: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }
}

module.exports = new ArticleService(); 