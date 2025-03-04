const prunitService = require('../services/PrunitService');
const logger = require('../utils/logger');

/**
 * Контроллер для работы с Prunit
 */
class PrunitController {
  /**
   * Получение единиц хранения по типу
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getByType(req, res) {
    try {
      const { type } = req.params;
      logger.info('Получен запрос на получение единиц хранения по типу:', type);

      const result = await prunitService.getByType(type);

      if (!result.success) {
        return res.status(result.errorCode).json({
          success: false,
          msg: result.msg
        });
      }

      return res.json(result);
    } catch (error) {
      logger.error('Ошибка при обработке запроса:', error);
      return res.status(500).json({
        success: false,
        msg: 'Внутренняя ошибка сервера'
      });
    }
  }

  /**
   * Поиск информации о продукте по его ID
   * @param {Object} req - HTTP запрос
   * @param {Object} res - HTTP ответ
   */
  async searchPrunit(req, res) {
    try {
      const { productId } = req.query;
      logger.info('Получен запрос на поиск информации о продукте:', productId);

      const result = await prunitService.searchPrunit(productId);

      if (!result.success) {
        return res.status(result.errorCode).json(result);
      }

      return res.json(result);
    } catch (error) {
      logger.error('Ошибка при обработке запроса:', error);
      return res.status(500).json({
        success: false,
        msg: 'Внутренняя ошибка сервера'
      });
    }
  }
}

module.exports = new PrunitController();
