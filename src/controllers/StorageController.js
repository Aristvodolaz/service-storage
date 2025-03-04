const storageService = require('../services/StorageService');
const logger = require('../utils/logger');

class StorageController {
  /**
   * Поиск товара по ШК или артикулу
   */
  async findItems(req, res) {
    try {
      logger.info('Получен запрос на поиск товаров');
      logger.info('Query параметры:', JSON.stringify(req.query));

      const { shk, article } = req.query;

      if (!shk && !article) {
        logger.warn('Не указаны параметры поиска (ШК или артикул)');
        return res.status(400).json({
          success: false,
          errorCode: 400,
          msg: 'Необходимо указать ШК или артикул'
        });
      }

      logger.info('Вызов сервиса для поиска товаров');
      const result = await storageService.findItems({ shk, article });
      logger.info('Результат поиска:', JSON.stringify(result));

      if (!result.success) {
        logger.warn('Поиск завершился неудачей:', result.msg);
        return res.status(result.errorCode).json(result);
      }

      logger.info('Поиск успешно завершен');
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Ошибка при поиске товаров:', error);
      return res.status(500).json({
        success: false,
        errorCode: 500,
        msg: 'Внутренняя ошибка сервера'
      });
    }
  }

  /**
   * Получение информации о товаре
   */
  async getStorageInfo(req, res) {
    try {
      const { productId } = req.params;
      const { shk } = req.query;

      if (!productId && !shk) {
        return res.status(400).json({
          success: false,
          errorCode: 400,
          msg: 'Необходимо указать ID товара или штрих-код'
        });
      }

      const result = await storageService.getStorageInfo({ productId, shk });

      if (!result.success) {
        return res.status(result.errorCode).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Ошибка при получении информации о товаре:', error);
      return res.status(500).json({
        success: false,
        errorCode: 500,
        msg: 'Внутренняя ошибка сервера'
      });
    }
  }

  /**
   * Получение списка единиц хранения для артикула
   */
  async getStorageUnits(req, res) {
    try {
      const { productId } = req.params;

      if (!productId) {
        return res.status(400).json({
          success: false,
          errorCode: 400,
          msg: 'Необходимо указать ID товара'
        });
      }

      const result = await storageService.getStorageUnits(productId);

      if (!result.success) {
        return res.status(result.errorCode).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Ошибка при получении единиц хранения:', error);
      return res.status(500).json({
        success: false,
        errorCode: 500,
        msg: 'Внутренняя ошибка сервера'
      });
    }
  }

  /**
   * Обновление количества товара
   */
  async updateQuantity(req, res) {
    try {
      const { productId } = req.params;
      const { prunitId, quantity } = req.body;

      if (!productId || !prunitId || !quantity) {
        return res.status(400).json({
          success: false,
          errorCode: 400,
          msg: 'Необходимо указать ID товара, ID единицы хранения и количество'
        });
      }

      const result = await storageService.updateQuantity({ productId, prunitId, quantity });

      if (!result.success) {
        return res.status(result.errorCode).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Ошибка при обновлении количества:', error);
      return res.status(500).json({
        success: false,
        errorCode: 500,
        msg: 'Внутренняя ошибка сервера'
      });
    }
  }

  /**
   * Размещение товара в буфер
   */
  async moveToBuffer(req, res) {
    try {
      const { productId } = req.params;
      const { prunitId, quantity, executor, wrShk } = req.body;

      if (!productId || !prunitId || !quantity || !executor || !wrShk) {
        return res.status(400).json({
          success: false,
          errorCode: 400,
          msg: 'Необходимо указать все обязательные параметры'
        });
      }

      const result = await storageService.moveToBuffer({
        productId,
        prunitId,
        quantity,
        executor,
        wrShk
      });

      if (!result.success) {
        return res.status(result.errorCode).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Ошибка при размещении товара в буфер:', error);
      return res.status(500).json({
        success: false,
        errorCode: 500,
        msg: 'Внутренняя ошибка сервера'
      });
    }
  }

  /**
   * Перемещение товара из буфера
   */
  async moveFromBuffer(req, res) {
    try {
      const { productId } = req.params;
      const { prunitId, quantity, condition, executor } = req.body;

      if (!productId || !prunitId || !quantity || !condition || !executor) {
        return res.status(400).json({
          success: false,
          errorCode: 400,
          msg: 'Необходимо указать все обязательные параметры'
        });
      }

      if (!['кондиция', 'некондиция'].includes(condition)) {
        return res.status(400).json({
          success: false,
          errorCode: 400,
          msg: 'Некорректное значение состояния товара'
        });
      }

      const result = await storageService.moveFromBuffer({
        productId,
        prunitId,
        quantity,
        condition,
        executor
      });

      if (!result.success) {
        return res.status(result.errorCode).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Ошибка при перемещении товара из буфера:', error);
      return res.status(500).json({
        success: false,
        errorCode: 500,
        msg: 'Внутренняя ошибка сервера'
      });
    }
  }

  async search(req, res) {
    try {
      const { article } = req.query;

      if (!article) {
        return res.status(400).json({
          success: false,
          message: 'Не указан артикул для поиска'
        });
      }

      const result = await storageService.searchByArticle(article);
      return res.json(result);
    } catch (error) {
      logger.error('Ошибка при поиске товара:', error);
      return res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера'
      });
    }
  }
}

module.exports = new StorageController();
