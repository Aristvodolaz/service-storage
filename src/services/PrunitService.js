const prunitRepository = require('../repositories/PrunitRepository');
const logger = require('../utils/logger');

/**
 * Сервис для работы с Prunit
 */
class PrunitService {
  /**
   * Поиск информации о продукте по его ID
   * @param {string} productId - ID продукта
   * @returns {Promise<Array>} - Массив найденных записей
   * @throws {Error} - Если не указан ID продукта или произошла ошибка
   */
  async searchPrunit(productId) {
    logger.info(`Запрос на поиск информации о продукте с ID: ${productId || 'не указан'}`);

    if (!productId) {
      throw new Error('Необходимо указать ID продукта');
    }

    try {
      const result = await prunitRepository.findByProductId(productId);

      if (result.length === 0) {
        logger.warn(`Продукт с ID ${productId} не найден`);
        throw new Error('Продукт не найден');
      }

      logger.info(`Информация о продукте найдена успешно: ${result.length} записей`);
      return result;
    } catch (error) {
      logger.error(`Ошибка при поиске информации о продукте: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }
}

module.exports = new PrunitService(); 