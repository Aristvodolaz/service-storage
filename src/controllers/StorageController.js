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
      const { prunitId, quantity, executor, wrShk, conditionState, expirationDate } = req.body;

      if (!productId || !prunitId || !quantity || !executor || !wrShk) {
        return res.status(400).json({
          success: false,
          errorCode: 400,
          msg: 'Необходимо указать все обязательные параметры'
        });
      }

      // Проверка корректности состояния товара
      if (conditionState && !['кондиция', 'некондиция'].includes(conditionState)) {
        return res.status(400).json({
          success: false,
          errorCode: 400,
          msg: 'Некорректное значение состояния товара'
        });
      }

      const result = await storageService.moveToBuffer({
        productId,
        prunitId,
        quantity,
        executor,
        wrShk,
        conditionState,
        expirationDate
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

  /**
   * Забор товара из ячейки
   */
  async pickFromLocation(req, res) {
    try {
      const { productId } = req.params;
      const { locationId, prunitId, quantity, executor } = req.body;

      logger.info('Получен запрос на забор товара из ячейки');
      logger.info('Параметры запроса:', { productId, locationId, prunitId, quantity, executor });

      if (!productId || !locationId || !prunitId || !quantity || !executor) {
        logger.warn('Не указаны все обязательные параметры');
        return res.status(400).json({
          success: false,
          errorCode: 400,
          msg: 'Необходимо указать все обязательные параметры'
        });
      }

      // Проверяем, что количество является числом
      const parsedQuantity = parseFloat(quantity);
      if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
        logger.warn('Некорректное значение количества:', quantity);
        return res.status(400).json({
          success: false,
          errorCode: 400,
          msg: 'Количество должно быть положительным числом'
        });
      }

      const result = await storageService.pickFromLocation({
        productId,
        locationId,
        prunitId,
        quantity: parsedQuantity,
        executor
      });

      if (!result.success) {
        logger.warn('Забор товара завершился неудачей:', result.msg);
        return res.status(result.errorCode).json(result);
      }

      logger.info('Товар успешно изъят из ячейки');
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Ошибка при заборе товара из ячейки:', error);
      return res.status(500).json({
        success: false,
        errorCode: 500,
        msg: 'Внутренняя ошибка сервера'
      });
    }
  }

  /**
   * Получение списка товаров в ячейке (инвентаризация по ячейке)
   */
  async getLocationItems(req, res) {
    try {
      const { locationId } = req.params;

      logger.info('Получен запрос на инвентаризацию по ячейке');
      logger.info('ID ячейки:', locationId);

      if (!locationId) {
        logger.warn('Не указан ID ячейки');
        return res.status(400).json({
          success: false,
          errorCode: 400,
          msg: 'Необходимо указать ID ячейки'
        });
      }

      const result = await storageService.getLocationItems(locationId);

      if (!result.success) {
        logger.warn('Инвентаризация по ячейке завершилась неудачей:', result.msg);
        return res.status(result.errorCode).json(result);
      }

      logger.info('Инвентаризация по ячейке успешно завершена');
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Ошибка при инвентаризации по ячейке:', error);
      return res.status(500).json({
        success: false,
        errorCode: 500,
        msg: 'Внутренняя ошибка сервера'
      });
    }
  }

  /**
   * Получение списка ячеек, в которых хранится товар (инвентаризация по артикулу)
   */
  async getArticleLocations(req, res) {
    try {
      const { article } = req.params;

      logger.info('Получен запрос на инвентаризацию по артикулу');
      logger.info('Артикул:', article);

      if (!article) {
        logger.warn('Не указан артикул');
        return res.status(400).json({
          success: false,
          errorCode: 400,
          msg: 'Необходимо указать артикул'
        });
      }

      const result = await storageService.getArticleLocations(article);

      if (!result.success) {
        logger.warn('Инвентаризация по артикулу завершилась неудачей:', result.msg);
        return res.status(result.errorCode).json(result);
      }

      logger.info('Инвентаризация по артикулу успешно завершена');
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Ошибка при инвентаризации по артикулу:', error);
      return res.status(500).json({
        success: false,
        errorCode: 500,
        msg: 'Внутренняя ошибка сервера'
      });
    }
  }

  /**
   * Очистка ячейки (функция "Адрес пуст")
   */
  async clearLocation(req, res) {
    try {
      const { locationId } = req.params;
      const { executor } = req.body;

      logger.info('Получен запрос на очистку ячейки');
      logger.info('Параметры запроса:', { locationId, executor });

      if (!locationId || !executor) {
        logger.warn('Не указаны все обязательные параметры');
        return res.status(400).json({
          success: false,
          errorCode: 400,
          msg: 'Необходимо указать ID ячейки и ID исполнителя'
        });
      }

      const result = await storageService.clearLocation({
        locationId,
        executor
      });

      if (!result.success) {
        logger.warn('Очистка ячейки завершилась неудачей:', result.msg);
        return res.status(result.errorCode).json(result);
      }

      logger.info('Ячейка успешно очищена');
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Ошибка при очистке ячейки:', error);
      return res.status(500).json({
        success: false,
        errorCode: 500,
        msg: 'Внутренняя ошибка сервера'
      });
    }
  }

  /**
   * Обновление данных инвентаризации
   */
  async updateInventory(req, res) {
    try {
      const { productId, locationId } = req.params;
      const { prunitId, quantity, conditionState, expirationDate, executor } = req.body;

      logger.info('Получен запрос на обновление данных инвентаризации');
      logger.info('Параметры запроса:', { productId, locationId, prunitId, quantity, conditionState, expirationDate, executor });

      if (!productId || !locationId || !prunitId || quantity === undefined || !executor) {
        logger.warn('Не указаны все обязательные параметры');
        return res.status(400).json({
          success: false,
          errorCode: 400,
          msg: 'Необходимо указать все обязательные параметры'
        });
      }

      // Проверяем, что количество является числом
      const parsedQuantity = parseFloat(quantity);
      if (isNaN(parsedQuantity) || parsedQuantity < 0) {
        logger.warn('Некорректное значение количества:', quantity);
        return res.status(400).json({
          success: false,
          errorCode: 400,
          msg: 'Количество должно быть неотрицательным числом'
        });
      }

      // Проверяем корректность состояния товара
      if (conditionState && !['кондиция', 'некондиция'].includes(conditionState)) {
        logger.warn('Некорректное значение состояния товара:', conditionState);
        return res.status(400).json({
          success: false,
          errorCode: 400,
          msg: 'Некорректное значение состояния товара'
        });
      }

      // Проверяем корректность срока годности
      if (expirationDate && isNaN(Date.parse(expirationDate))) {
        logger.warn('Некорректный формат срока годности:', expirationDate);
        return res.status(400).json({
          success: false,
          errorCode: 400,
          msg: 'Некорректный формат срока годности'
        });
      }

      const result = await storageService.updateInventory({
        productId,
        locationId,
        prunitId,
        quantity: parsedQuantity,
        conditionState,
        expirationDate,
        executor
      });

      if (!result.success) {
        logger.warn('Обновление данных инвентаризации завершилось неудачей:', result.msg);
        return res.status(result.errorCode).json(result);
      }

      logger.info('Данные инвентаризации успешно обновлены');
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Ошибка при обновлении данных инвентаризации:', error);
      return res.status(500).json({
        success: false,
        errorCode: 500,
        msg: 'Внутренняя ошибка сервера'
      });
    }
  }

  /**
   * Перемещение товара между ячейками (пятнашка)
   */
  async moveItemBetweenLocations(req, res) {
    try {
      const { productId } = req.params;
      const {
        sourceLocationId,
        targetLocationId,
        targetWrShk,
        prunitId,
        quantity,
        conditionState,
        expirationDate,
        executor
      } = req.body;

      logger.info('=== НАЧАЛО ОПЕРАЦИИ ПЕРЕМЕЩЕНИЯ ТОВАРА ===');
      logger.info(`Товар: ${productId}, Единица хранения: ${prunitId}, Количество: ${quantity}`);
      logger.info(`Откуда: ${sourceLocationId}, Куда: ${targetLocationId} (ШК: ${targetWrShk})`);
      logger.info(`Исполнитель: ${executor}`);
      if (conditionState) logger.info(`Состояние товара: ${conditionState}`);
      if (expirationDate) logger.info(`Срок годности: ${expirationDate}`);

      if (!productId || !sourceLocationId || !targetLocationId || !targetWrShk || !prunitId || !quantity || !executor) {
        logger.warn('Не указаны все обязательные параметры');
        return res.status(400).json({
          success: false,
          errorCode: 400,
          msg: 'Необходимо указать все обязательные параметры'
        });
      }

      // Проверяем, что количество является числом
      const parsedQuantity = parseFloat(quantity);
      if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
        logger.warn('Некорректное значение количества:', quantity);
        return res.status(400).json({
          success: false,
          errorCode: 400,
          msg: 'Количество должно быть положительным числом'
        });
      }

      // Проверяем корректность состояния товара
      if (conditionState && !['кондиция', 'некондиция'].includes(conditionState)) {
        logger.warn('Некорректное значение состояния товара:', conditionState);
        return res.status(400).json({
          success: false,
          errorCode: 400,
          msg: 'Некорректное значение состояния товара'
        });
      }

      // Проверяем корректность срока годности
      if (expirationDate && isNaN(Date.parse(expirationDate))) {
        logger.warn('Некорректный формат срока годности:', expirationDate);
        return res.status(400).json({
          success: false,
          errorCode: 400,
          msg: 'Некорректный формат срока годности'
        });
      }

      const result = await storageService.moveItemBetweenLocations({
        productId,
        sourceLocationId,
        targetLocationId,
        targetWrShk,
        prunitId,
        quantity: parsedQuantity,
        conditionState,
        expirationDate,
        executor
      });

      if (!result.success) {
        logger.warn('Перемещение товара завершилось неудачей:', result.msg);
        logger.info('=== КОНЕЦ ОПЕРАЦИИ ПЕРЕМЕЩЕНИЯ ТОВАРА (НЕУДАЧА) ===');
        return res.status(result.errorCode).json(result);
      }

      // Подробное логирование результата
      logger.info('=== РЕЗУЛЬТАТ ОПЕРАЦИИ ПЕРЕМЕЩЕНИЯ ТОВАРА ===');
      logger.info(`Товар "${result.data.movedInfo.name}" (ID: ${result.data.movedInfo.productId}, Артикул: ${result.data.movedInfo.article})`);
      logger.info(`Единица хранения: ${result.data.movedInfo.prunitName} (ID: ${result.data.movedInfo.prunitId})`);
      logger.info(`Перемещено: ${result.data.movedInfo.quantity} ед.`);
      logger.info(`Из ячейки: ${result.data.sourceInfo.locationId} (было: ${result.data.sourceInfo.previousQuantity}, осталось: ${result.data.sourceInfo.remainingQuantity} ед.)`);
      logger.info(`В ячейку: ${result.data.targetInfo.locationId} (ШК: ${result.data.targetInfo.wrShk}, было: ${result.data.targetInfo.previousQuantity}, стало: ${result.data.targetInfo.newQuantity} ед.)`);
      logger.info(`Состояние товара: ${result.data.movedInfo.conditionState}`);
      if (result.data.movedInfo.expirationDate) logger.info(`Срок годности: ${result.data.movedInfo.expirationDate}`);
      logger.info(`Полное перемещение: ${result.data.movedInfo.isFullMove ? 'Да' : 'Нет'}`);
      logger.info('=== КОНЕЦ ОПЕРАЦИИ ПЕРЕМЕЩЕНИЯ ТОВАРА (УСПЕХ) ===');

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Ошибка при перемещении товара между ячейками:', error);
      logger.info('=== КОНЕЦ ОПЕРАЦИИ ПЕРЕМЕЩЕНИЯ ТОВАРА (ОШИБКА) ===');
      return res.status(500).json({
        success: false,
        errorCode: 500,
        msg: 'Внутренняя ошибка сервера'
      });
    }
  }

  /**
   * Получение детальной информации о товаре по ШК или артикулу
   */
  async getDetailedItemInfo(req, res) {
    try {
      const { shk, article, wrShk } = req.query;

      logger.info('Получен запрос на получение детальной информации о товаре');
      logger.info('Параметры запроса:', { shk, article, wrShk });

      if (!shk && !article && !wrShk) {
        logger.warn('Не указан ШК, артикул или ШК ячейки');
        return res.status(400).json({
          success: false,
          errorCode: 400,
          msg: 'Необходимо указать ШК, артикул или ШК ячейки'
        });
      }

      const result = await storageService.getDetailedItemInfo({ shk, article, wrShk });

      if (!result || !result.success) {
        let errorMsg = 'Информация не найдена';
        if (shk) errorMsg = `Товар с ШК ${shk} не найден`;
        if (article) errorMsg = `Товар с артикулом ${article} не найден`;
        if (wrShk) errorMsg = `Ячейка с ШК ${wrShk} не найдена или пуста`;

        logger.warn('Получение детальной информации завершилось неудачей:', errorMsg);
        return res.status(404).json({
          success: false,
          errorCode: 404,
          msg: errorMsg
        });
      }

      logger.info('Детальная информация успешно получена');
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Ошибка при получении детальной информации о товаре:', error);
      return res.status(500).json({
        success: false,
        errorCode: 500,
        msg: 'Внутренняя ошибка сервера'
      });
    }
  }

  /**
   * Получение списка всех ячеек хранения
   */
  async getAllLocations(req, res) {
    try {
      logger.info('Запрос на получение списка всех ячеек хранения');

      const locations = await storageService.getAllLocations();

      return res.status(200).json({
        success: true,
        data: locations,
        count: locations.length
      });
    } catch (error) {
      logger.error('Error in StorageController.getAllLocations:', error);
      return res.status(500).json({
        success: false,
        message: 'Ошибка при получении списка ячеек хранения',
        error: error.message
      });
    }
  }

  /**
   * Регистрация некондиции
   */
  async registerDefect(req, res) {
    try {
      const { productId, defectReason, executor } = req.body;

      logger.info('Запрос на регистрацию некондиции:', JSON.stringify(req.body));

      // Проверка обязательных параметров
      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'Не указан ID товара (productId)'
        });
      }

      if (!defectReason) {
        return res.status(400).json({
          success: false,
          message: 'Не указана причина некондиции (defectReason)'
        });
      }

      if (!executor) {
        return res.status(400).json({
          success: false,
          message: 'Не указан исполнитель (executor)'
        });
      }

      const result = await storageService.registerDefect(req.body);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error in StorageController.registerDefect:', error);
      return res.status(500).json({
        success: false,
        message: 'Ошибка при регистрации некондиции',
        error: error.message
      });
    }
  }

  /**
   * Получение отчета по остаткам в буфере
   */
  async getBufferReport(req, res) {
    try {
      logger.info('Запрос на получение отчета по остаткам в буфере');

      const result = await storageService.getBufferReport();

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error in StorageController.getBufferReport:', error);
      return res.status(500).json({
        success: false,
        message: 'Ошибка при получении отчета по остаткам в буфере',
        error: error.message
      });
    }
  }

  /**
   * Получение отчета по некондиции
   */
  async getDefectsReport(req, res) {
    try {
      logger.info('Запрос на получение отчета по некондиции');

      const result = await storageService.getDefectsReport();

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error in StorageController.getDefectsReport:', error);
      return res.status(500).json({
        success: false,
        message: 'Ошибка при получении отчета по некондиции',
        error: error.message
      });
    }
  }

  /**
   * Получение отчета по инвентаризациям
   */
  async getInventoryReport(req, res) {
    try {
      logger.info('Запрос на получение отчета по инвентаризациям');

      const result = await storageService.getInventoryReport();

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error in StorageController.getInventoryReport:', error);
      return res.status(500).json({
        success: false,
        message: 'Ошибка при получении отчета по инвентаризациям',
        error: error.message
      });
    }
  }
}

module.exports = new StorageController();
