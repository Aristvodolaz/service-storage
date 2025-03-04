const prunitRepository = require('../repositories/PrunitRepository');
const logger = require('../utils/logger');

/**
 * Сервис для работы с Prunit
 */
class PrunitService {
  /**
   * Поиск информации о продукте по его ID
   * @param {string} productId - ID продукта
   * @returns {Promise<Object>} - Объект с результатами поиска
   */
  async searchPrunit(productId) {
    try {
      logger.info(`Запрос на поиск информации о продукте с ID: ${productId || 'не указан'}`);

      if (!productId) {
        return {
          success: false,
          errorCode: 400,
          msg: 'Необходимо указать ID продукта'
        };
      }

      const units = await prunitRepository.findByProductId(productId);

      if (units.length === 0) {
        logger.warn(`Продукт с ID ${productId} не найден`);
        return {
          success: false,
          errorCode: 404,
          msg: 'Продукт не найден'
        };
      }

      logger.info(`Информация о продукте найдена успешно: ${units.length} записей`);
      return {
        success: true,
        data: units
      };
    } catch (error) {
      logger.error(`Ошибка при поиске информации о продукте: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }

  /**
   * Получение единиц хранения по типу
   * @param {number} prunitTypeId - Тип единицы хранения
   */
  async getByType(prunitTypeId) {
    try {
      logger.info('Получение единиц хранения по типу:', prunitTypeId);

      // Преобразуем входной параметр в число
      const typeId = parseInt(prunitTypeId);

      // Проверяем, что значение является числом
      if (isNaN(typeId)) {
        return {
          success: false,
          errorCode: 400,
          msg: 'Тип единицы хранения должен быть числом'
        };
      }

      const units = await prunitRepository.getByType(typeId);

      if (units.length === 0) {
        return {
          success: false,
          errorCode: 404,
          msg: 'Единицы хранения не найдены'
        };
      }

      return {
        success: true,
        data: units
      };
    } catch (error) {
      logger.error('Ошибка при получении единиц хранения:', error);
      throw error;
    }
  }
}

module.exports = new PrunitService();
