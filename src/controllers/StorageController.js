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
      const { shk, article, wrShk } = req.query;

      logger.info('Получен запрос на получение информации о товаре');
      logger.info('Параметры запроса:', { productId, shk, article, wrShk });

      if (!productId && !shk && !article && !wrShk) {
        logger.warn('Не указаны параметры поиска (ID товара, ШК, артикул или ШК ячейки)');
        return res.status(400).json({
          success: false,
          errorCode: 400,
          msg: 'Необходимо указать ID товара, ШК, артикул или ШК ячейки'
        });
      }

      const result = await storageService.getStorageInfo({ productId, shk, article, wrShk });

      if (!result.success) {
        logger.warn('Получение информации о товаре завершилось неудачей:', result.msg);
        return res.status(result.errorCode).json(result);
      }

      logger.info('Информация о товаре успешно получена');
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
      const {
        prunitId,
        quantity,
        executor,
        wrShk,
        conditionState,
        expirationDate,
        name,
        article,
        shk,
        sklad_id
      } = req.body;

      logger.info('Получен запрос на размещение товара в буфер');
      logger.info('Параметры запроса:', {
        productId,
        prunitId,
        quantity,
        executor,
        wrShk,
        conditionState,
        expirationDate,
        name,
        article,
        shk,
        sklad_id
      });

      // Проверяем наличие обязательных параметров
      if (!productId || !prunitId || !quantity || !executor || !wrShk) {
        logger.warn('Не указаны обязательные параметры');
        return res.status(400).json({
          success: false,
          errorCode: 400,
          msg: 'Необходимо указать все обязательные параметры (productId, prunitId, quantity, executor, wrShk)'
        });
      }

      // Проверка корректности состояния товара
      let normalizedCondition = 'кондиция'; // Значение по умолчанию
      if (conditionState) {
        // Преобразуем значения для совместимости
        normalizedCondition = conditionState.toLowerCase();
        if (normalizedCondition === 'bad' || normalizedCondition === 'некондиция') {
          normalizedCondition = 'некондиция';
        } else if (normalizedCondition === 'good' || normalizedCondition === 'кондиция') {
          normalizedCondition = 'кондиция';
        } else {
          logger.warn('Некорректное значение состояния товара:', conditionState);
          return res.status(400).json({
            success: false,
            errorCode: 400,
            msg: 'Некорректное значение состояния товара. Допустимые значения: "кондиция", "некондиция", "good", "bad"'
          });
        }
        req.body.conditionState = normalizedCondition;
      }

      // Проверка корректности дат
      let parsedDate = null;
      if (expirationDate) {
        // Пробуем разные форматы даты
        if (!isNaN(Date.parse(expirationDate))) {
          // Стандартный формат ISO
          parsedDate = new Date(expirationDate);
        } else {
          // Пробуем формат DD.MM.YYYY
          const parts = expirationDate.split('.');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // месяцы в JS начинаются с 0
            const year = parseInt(parts[2], 10);

            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
              parsedDate = new Date(year, month, day);
            }
          }
        }

        if (!parsedDate || isNaN(parsedDate.getTime())) {
          logger.warn('Некорректный формат срока годности:', expirationDate);
          return res.status(400).json({
            success: false,
            errorCode: 400,
            msg: 'Некорректный формат срока годности. Используйте формат YYYY-MM-DD или DD.MM.YYYY'
          });
        }

        // Преобразуем дату в формат ISO для дальнейшей обработки
        req.body.expirationDate = parsedDate.toISOString().split('T')[0];
      }

      // Вызываем сервис для размещения товара в буфер
      const result = await storageService.moveToBuffer({
        productId,
        prunitId,
        quantity: parseFloat(quantity),
        executor,
        wrShk,
        conditionState: normalizedCondition,
        expirationDate: parsedDate,
        name,
        article,
        shk,
        sklad_id
      });

      if (!result.success) {
        logger.warn('Размещение товара в буфер завершилось неудачей:', result.msg);
        return res.status(result.errorCode).json(result);
      }

      logger.info('Товар успешно размещен в буфер');
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
      const { prunitId, quantity, condition, executor, locationId } = req.body;

      logger.info('Получен запрос на перемещение товара из буфера');
      logger.info('Параметры запроса:', { productId, prunitId, quantity, condition, executor, locationId });

      if (!productId || !prunitId || !quantity || !condition || !executor || !locationId) {
        logger.warn('Не указаны все обязательные параметры');
        return res.status(400).json({
          success: false,
          errorCode: 400,
          msg: 'Необходимо указать все обязательные параметры'
        });
      }

      if (!['кондиция', 'некондиция'].includes(condition)) {
        logger.warn('Некорректное значение состояния товара:', condition);
        return res.status(400).json({
          success: false,
          errorCode: 400,
          msg: 'Некорректное значение состояния товара'
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

      const result = await storageService.moveFromBuffer({
        productId,
        prunitId,
        quantity: parsedQuantity,
        condition,
        executor,
        locationId
      });

      if (!result.success) {
        logger.warn('Перемещение товара из буфера завершилось неудачей:', result.msg);
        return res.status(result.errorCode).json(result);
      }

      logger.info('Товар успешно перемещен из буфера');
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
   * Снятие товара из ячейки
   */
  async pickFromLocation(req, res) {
    try {
      const { productId, WR_SHK, prunitId, quantity, executor } = req.body;

      logger.info('Запрос на снятие товара из ячейки:', req.body);

      const result = await storageService.pickFromLocation({
        productId,
        locationId: WR_SHK,
        prunitId,
        quantity: parseFloat(quantity),
        executor
      });

      return res.status(200).json({
        success: true,
        message: 'Товар успешно снят из ячейки',
        data: result
      });
    } catch (error) {
      logger.error('Ошибка при снятии товара из ячейки:', error);
      return res.status(500).json({
        success: false,
        message: `Внутренняя ошибка сервера: ${error.message}`
      });
    }
  }

  /**
   * Снятие товара из ячейки с учетом поля sklad_id
   */
  async pickFromLocationBySkladId(req, res) {
    try {
      const { productId, WR_SHK, prunitId, quantity, executor, sklad_id } = req.body;

      logger.info('Запрос на снятие товара из ячейки с учетом sklad_id:', req.body);

      const result = await storageService.pickFromLocationBySkladId({
        productId,
        locationId: WR_SHK,
        prunitId,
        quantity: parseFloat(quantity),
        executor,
        sklad_id
      });

      return res.status(200).json({
        success: true,
        message: 'Товар успешно снят из ячейки',
        data: result
      });
    } catch (error) {
      logger.error('Ошибка при снятии товара из ячейки:', error);
      return res.status(500).json({
        success: false,
        message: `Внутренняя ошибка сервера: ${error.message}`
      });
    }
  }

  /**
   * Получение списка товаров в ячейке (инвентаризация по ячейке)
   */
  async getLocationItems(req, res) {
    try {
      const { locationId } = req.params;
      // Проверяем оба возможных имени параметра
      const sklad_id = req.query.sklad_id || req.query.id_sklad;

      logger.info('Получен запрос на инвентаризацию по ячейке');
      logger.info('ID ячейки:', locationId);
      if (sklad_id) {
        logger.info('ID склада:', sklad_id);
      }

      if (!locationId) {
        logger.warn('Не указан ID ячейки');
        return res.status(400).json({
          success: false,
          errorCode: 400,
          msg: 'Необходимо указать ID ячейки'
        });
      }

      const result = await storageService.getLocationItems(locationId, sklad_id);

      if (!result.success) {
        return res.status(result.errorCode).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Ошибка при получении списка товаров в ячейке:', error);
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
   * Очистка ячейки (установка нулевого количества для всех товаров)
   */
  async clearLocation(req, res) {
    try {
      const { locationId } = req.params;
      const { executor, sklad_id } = req.body;

      logger.info('Получен запрос на очистку ячейки');
      logger.info('Параметры запроса:', { locationId, executor, sklad_id });

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
        executor,
        sklad_id
      });

      if (!result.success) {
        return res.status(result.errorCode).json(result);
      }

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
