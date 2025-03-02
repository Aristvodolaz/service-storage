const articleService = require('../services/ArticleService');
const logger = require('../utils/logger');

/**
 * Контроллер для работы с артикулами
 */
class ArticleController {
  /**
   * Поиск товара по ШК или артикулу
   * @param {Object} req - HTTP запрос
   * @param {Object} res - HTTP ответ
   */
  async searchByArticle(req, res) {
    const { shk, article } = req.query;

    try {
      const result = await articleService.searchArticle(shk, article);
      
      res.status(200).json({ 
        success: true, 
        value: result, 
        errorCode: 200 
      });
    } catch (error) {
      if (error.message === 'Товар не найден') {
        return res.status(404).json({ 
          success: false, 
          msg: error.message, 
          errorCode: 404 
        });
      }
      
      if (error.message === 'Необходимо указать ШК или артикул') {
        return res.status(400).json({ 
          success: false, 
          msg: error.message, 
          errorCode: 400 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        msg: `Ошибка при поиске товара: ${error.message}`, 
        errorCode: 500 
      });
    }
  }
}

module.exports = new ArticleController(); 