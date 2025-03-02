const prunitService = require('../services/PrunitService');
const logger = require('../utils/logger');

/**
 * Контроллер для работы с Prunit
 */
class PrunitController {
  /**
   * Поиск информации о продукте по его ID
   * @param {Object} req - HTTP запрос
   * @param {Object} res - HTTP ответ
   */
  async searchPrunit(req, res) {
    const { productId } = req.query;

    try {
      const result = await prunitService.searchPrunit(productId);
      
      res.status(200).json({ 
        success: true, 
        value: result, 
        errorCode: 200 
      });
    } catch (error) {
      if (error.message === 'Продукт не найден') {
        return res.status(404).json({ 
          success: false, 
          msg: error.message, 
          errorCode: 404 
        });
      }
      
      if (error.message === 'Необходимо указать ID продукта') {
        return res.status(400).json({ 
          success: false, 
          msg: error.message, 
          errorCode: 400 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        msg: `Ошибка при поиске информации о продукте: ${error.message}`, 
        errorCode: 500 
      });
    }
  }
}

module.exports = new PrunitController(); 