const StorageRepository = require('../repositories/StorageRepository');
const { connectToDatabase } = require('../config/database');
const logger = require('../utils/logger');

class StorageService {
  constructor() {
    this.repository = null;
    this.initialize().catch(error => {
      logger.error('Ошибка при инициализации StorageService:', error);
    });
  }

  async initialize() {
    try {
      const pool = await connectToDatabase();
      this.repository = new StorageRepository(pool);
      logger.info('StorageService успешно инициализирован');
    } catch (error) {
      logger.error('Ошибка при инициализации StorageService:', error);
      throw error;
    }
  }

  async searchByArticle(article) {
    try {
      if (!this.repository) {
        await this.initialize();
      }
      logger.info(`Поиск товара по артикулу: ${article}`);
      const items = await this.repository.findItems(article);

      if (!items || items.length === 0) {
        logger.info(`Товар с артикулом ${article} не найден`);
        return {
          success: false,
          message: 'Товар не найден',
          data: null
        };
      }

      logger.info(`Найдено товаров: ${items.length}`);
      return {
        success: true,
        message: 'Товар найден',
        data: items
      };
    } catch (error) {
      logger.error('Ошибка при поиске товара:', error);
      throw error;
    }
  }

  /**
   * Поиск товара по ШК или артикулу
   */
  async findItems(params) {
    try {
      if (!this.repository) {
        await this.initialize();
      }
      // Проверка корректности входных данных
      if (params.shk && typeof params.shk !== 'string') {
        throw new Error('Некорректный формат штрих-кода');
      }
      if (params.article && typeof params.article !== 'string') {
        throw new Error('Некорректный формат артикула');
      }

      const items = await this.repository.findByShkOrArticle(params);

      if (!items || items.length === 0) {
        return {
          success: false,
          errorCode: 404,
          msg: 'Товары не найдены'
        };
      }

      return {
        success: true,
        data: items
      };
    } catch (error) {
      logger.error('Ошибка при поиске товаров:', error);
      throw error;
    }
  }

  /**
   * Получение информации о товаре из x_Storage_Full_Info
   */
  async getStorageInfo(params) {
    try {
      // Проверка корректности входных данных
      if (params.productId && typeof params.productId !== 'string') {
        throw new Error('Некорректный формат ID товара');
      }
      if (params.shk && typeof params.shk !== 'string') {
        throw new Error('Некорректный формат штрих-кода');
      }

      const items = await this.repository.getStorageInfo(params);

      if (items.length === 0) {
        return {
          success: false,
          errorCode: 404,
          msg: 'Информация о товаре не найдена'
        };
      }

      // Группируем по адресам буфера
      const bufferItems = items.filter(item => item.idScklad && item.idScklad.startsWith('BUFFER'));
      const pickingItems = items.filter(item => item.idScklad && !item.idScklad.startsWith('BUFFER'));

      return {
        success: true,
        data: {
          bufferStock: bufferItems.map(item => item.toJSON()),
          pickingLocations: pickingItems.map(item => item.toJSON())
        }
      };
    } catch (error) {
      logger.error('Ошибка при получении информации о товаре:', error);
      throw error;
    }
  }

  /**
   * Получение списка единиц хранения для артикула
   */
  async getStorageUnits(productId) {
    try {
      const units = await this.repository.getStorageUnits(productId);

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

  /**
   * Обновление количества товара
   */
  async updateQuantity(params) {
    try {
      const { productId, prunitId, quantity } = params;

      // Проверяем существование товара
      const item = await this.repository.getById(productId);
      if (!item) {
        return {
          success: false,
          errorCode: 404,
          msg: 'Товар не найден'
        };
      }

      // Обновляем количество
      const updated = await this.repository.updateQuantity(productId, prunitId, quantity);

      if (!updated) {
        return {
          success: false,
          errorCode: 400,
          msg: 'Не удалось обновить количество товара'
        };
      }

      return {
        success: true,
        msg: 'Количество товара успешно обновлено'
      };
    } catch (error) {
      logger.error('Ошибка при обновлении количества товара:', error);
      throw error;
    }
  }

  /**
   * Размещение товара в буфер
   */
  async moveToBuffer(params) {
    try {
      if (!this.repository) {
        await this.initialize();
      }

      const { productId, prunitId, quantity, executor, wrShk, conditionState, expirationDate } = params;

      // Проверка корректности входных данных
      if (typeof productId !== 'string') {
        throw new Error('Некорректный формат ID товара');
      }
      if (typeof prunitId !== 'string') {
        throw new Error('Некорректный формат ID единицы хранения');
      }
      if (typeof quantity !== 'number' || quantity <= 0) {
        throw new Error('Некорректное количество');
      }
      if (typeof executor !== 'string') {
        throw new Error('Некорректный формат ID исполнителя');
      }
      if (typeof wrShk !== 'string') {
        throw new Error('Некорректный формат штрих-кода места хранения');
      }
      if (conditionState && !['кондиция', 'некондиция'].includes(conditionState)) {
        throw new Error('Некорректное состояние товара');
      }
      if (expirationDate && isNaN(Date.parse(expirationDate))) {
        throw new Error('Некорректный формат срока годности');
      }

      // Проверяем существование товара
      const storageInfo = await this.repository.getStorageInfo({ productId });
      if (storageInfo.length === 0) {
        return {
          success: false,
          errorCode: 404,
          msg: 'Товар не найден'
        };
      }

      const item = storageInfo[0];

      // Проверяем существование единицы хранения
      const units = await this.repository.getStorageUnits(productId);
      const unit = units.find(u => u.id === prunitId);
      if (!unit) {
        return {
          success: false,
          errorCode: 404,
          msg: 'Единица хранения не найдена'
        };
      }

      // Определяем ID склада в зависимости от состояния товара
      const idScklad = conditionState === 'некондиция' ? 'BUFFER_DEFECT' : 'BUFFER';

      // Проверяем, есть ли уже товар в указанной ячейке
      const existingItems = await this.repository.getExistingItemInLocation(productId, prunitId, wrShk, idScklad);

      let result;

      if (existingItems && existingItems.length > 0) {
        // Товар уже есть в ячейке, обновляем количество
        const existingItem = existingItems[0];
        const newQuantity = existingItem.Product_QNT + quantity;

        // Обновляем запись
        result = await this.repository.update(productId, {
          prunitId,
          productQnt: newQuantity,
          placeQnt: newQuantity,
          conditionState: conditionState || existingItem.Condition_State || 'кондиция',
          executor,
          idScklad,
          wrShk,
          expirationDate: expirationDate || existingItem.Expiration_Date
        });

        if (!result) {
          return {
            success: false,
            errorCode: 400,
            msg: 'Не удалось обновить количество товара в буфере'
          };
        }

        return {
          success: true,
          msg: 'Количество товара в буфере успешно обновлено',
          data: {
            previousQuantity: existingItem.Product_QNT,
            newQuantity: newQuantity,
            location: idScklad
          }
        };
      } else {
        // Товара нет в ячейке, создаем новую запись
        const bufferData = {
          id: productId,
          name: item.name,
          article: item.article,
          shk: item.shk,
          productQnt: quantity,
          prunitId: prunitId,
          prunitName: item.prunitName,
          wrShk: wrShk,
          idScklad: idScklad,
          executor: executor,
          placeQnt: quantity,
          conditionState: conditionState || 'кондиция',
          expirationDate: expirationDate || item.expirationDate,
          startExpirationDate: item.startExpirationDate,
          endExpirationDate: item.endExpirationDate
        };

        result = await this.repository.create(bufferData);

        if (!result) {
          return {
            success: false,
            errorCode: 400,
            msg: 'Не удалось разместить товар в буфер'
          };
        }

        return {
          success: true,
          msg: 'Товар успешно размещен в буфер',
          data: {
            quantity: quantity,
            location: idScklad
          }
        };
      }
    } catch (error) {
      logger.error('Ошибка при размещении товара в буфер:', error);
      throw error;
    }
  }

  /**
   * Перемещение товара из буфера
   */
  async moveFromBuffer(params) {
    try {
      if (!this.repository) {
        await this.initialize();
      }

      const { productId, prunitId, quantity, condition, executor } = params;

      // Проверка корректности входных данных
      if (typeof productId !== 'string') {
        throw new Error('Некорректный формат ID товара');
      }
      if (typeof prunitId !== 'string') {
        throw new Error('Некорректный формат ID единицы хранения');
      }
      if (typeof quantity !== 'number' || quantity <= 0) {
        throw new Error('Некорректное количество');
      }
      if (!['кондиция', 'некондиция'].includes(condition)) {
        throw new Error('Некорректное состояние товара');
      }
      if (typeof executor !== 'string') {
        throw new Error('Некорректный формат ID исполнителя');
      }

      // Получаем информацию о товаре в буфере
      const bufferStock = await this.repository.getBufferStock(productId);

      if (bufferStock.length === 0) {
        return {
          success: false,
          errorCode: 404,
          msg: 'Товар не найден в буфере'
        };
      }

      const bufferItem = bufferStock.find(item => item.Prunit_Id === prunitId);
      if (!bufferItem) {
        return {
          success: false,
          errorCode: 404,
          msg: 'Указанная единица хранения не найдена в буфере'
        };
      }

      // Проверяем доступное количество
      if (bufferItem.Product_QNT < quantity) {
        return {
          success: false,
          errorCode: 400,
          msg: 'Недостаточное количество товара в буфере'
        };
      }

      if (condition === 'некондиция') {
        // Обновляем состояние товара на некондицию
        const updated = await this.repository.update(productId, {
          prunitId,
          productQnt: quantity,
          placeQnt: quantity,
          conditionState: 'некондиция',
          executor,
          idScklad: 'BUFFER_DEFECT'
        });

        if (!updated) {
          return {
            success: false,
            errorCode: 400,
            msg: 'Не удалось обновить состояние товара'
          };
        }

        return {
          success: true,
          msg: 'Товар помечен как некондиция'
        };
      } else {
        // Получаем адреса комплектации
        const locations = await this.repository.getPickingLocations(productId);

        if (locations.length === 0) {
          return {
            success: false,
            errorCode: 404,
            msg: 'Не найдены адреса комплектации для товара'
          };
        }

        // Перемещаем товар в зону комплектации
        const updated = await this.repository.update(productId, {
          prunitId,
          productQnt: quantity,
          placeQnt: quantity,
          conditionState: 'кондиция',
          executor,
          idScklad: locations[0].id_scklad
        });

        if (!updated) {
          return {
            success: false,
            errorCode: 400,
            msg: 'Не удалось переместить товар в зону комплектации'
          };
        }

        return {
          success: true,
          msg: 'Товар перемещен в зону комплектации',
          data: { locations }
        };
      }
    } catch (error) {
      logger.error('Ошибка при перемещении товара из буфера:', error);
      throw error;
    }
  }

  /**
   * Забор товара из ячейки
   */
  async pickFromLocation(params) {
    try {
      if (!this.repository) {
        await this.initialize();
      }

      const { productId, locationId, prunitId, quantity, executor } = params;

      // Проверка корректности входных данных
      if (typeof productId !== 'string') {
        throw new Error('Некорректный формат ID товара');
      }
      if (typeof locationId !== 'string') {
        throw new Error('Некорректный формат ID ячейки');
      }
      if (typeof prunitId !== 'string') {
        throw new Error('Некорректный формат ID единицы хранения');
      }
      if (typeof quantity !== 'number' || quantity <= 0) {
        throw new Error('Некорректное количество');
      }
      if (typeof executor !== 'string') {
        throw new Error('Некорректный формат ID исполнителя');
      }

      // Выполняем забор товара
      const result = await this.repository.pickFromLocation({
        productId,
        locationId,
        prunitId,
        quantity,
        executor
      });

      if (!result) {
        return {
          success: false,
          errorCode: 404,
          msg: 'Товар не найден в указанной ячейке'
        };
      }

      if (result.error === 'insufficient_quantity') {
        return {
          success: false,
          errorCode: 400,
          msg: `Недостаточное количество товара. Доступно: ${result.available}`,
          available: result.available
        };
      }

      return {
        success: true,
        msg: 'Товар успешно изъят из ячейки',
        data: result
      };
    } catch (error) {
      logger.error('Ошибка при заборе товара из ячейки:', error);
      throw error;
    }
  }

  /**
   * Получение списка товаров в ячейке (инвентаризация по ячейке)
   */
  async getLocationItems(locationId) {
    try {
      if (!this.repository) {
        await this.initialize();
      }

      if (typeof locationId !== 'string') {
        throw new Error('Некорректный формат ID ячейки');
      }

      const items = await this.repository.getLocationItems(locationId);

      if (!items || items.length === 0) {
        return {
          success: false,
          errorCode: 404,
          msg: 'Товары в ячейке не найдены'
        };
      }

      // Группируем товары по артикулу для удобства отображения
      const groupedItems = {};

      items.forEach(item => {
        if (!groupedItems[item.id]) {
          groupedItems[item.id] = {
            id: item.id,
            name: item.name,
            article: item.article,
            shk: item.shk,
            locationId: item.id_scklad,
            locationName: item.name_scklad,
            units: []
          };
        }

        groupedItems[item.id].units.push({
          prunitId: item.prunit_id,
          prunitName: item.prunit_name,
          quantity: item.product_qnt,
          conditionState: item.condition_state,
          expirationDate: item.expiration_date
        });
      });

      return {
        success: true,
        data: Object.values(groupedItems)
      };
    } catch (error) {
      logger.error('Ошибка при получении списка товаров в ячейке:', error);
      throw error;
    }
  }

  /**
   * Получение списка ячеек, в которых хранится товар (инвентаризация по артикулу)
   */
  async getArticleLocations(article) {
    try {
      if (!this.repository) {
        await this.initialize();
      }

      if (typeof article !== 'string') {
        throw new Error('Некорректный формат артикула');
      }

      const locations = await this.repository.getArticleLocations(article);

      if (!locations || locations.length === 0) {
        return {
          success: false,
          errorCode: 404,
          msg: 'Ячейки хранения для товара не найдены'
        };
      }

      // Группируем по ячейкам
      const groupedLocations = {};

      locations.forEach(item => {
        if (!groupedLocations[item.id_scklad]) {
          groupedLocations[item.id_scklad] = {
            locationId: item.id_scklad,
            locationName: item.name_scklad,
            productId: item.id,
            productName: item.name,
            article: item.article,
            shk: item.shk,
            units: []
          };
        }

        groupedLocations[item.id_scklad].units.push({
          prunitId: item.prunit_id,
          prunitName: item.prunit_name,
          quantity: item.product_qnt,
          conditionState: item.condition_state,
          expirationDate: item.expiration_date
        });
      });

      return {
        success: true,
        data: Object.values(groupedLocations)
      };
    } catch (error) {
      logger.error('Ошибка при получении списка ячеек для товара:', error);
      throw error;
    }
  }

  /**
   * Очистка ячейки (функция "Адрес пуст")
   */
  async clearLocation(params) {
    try {
      if (!this.repository) {
        await this.initialize();
      }

      const { locationId, executor } = params;

      if (typeof locationId !== 'string') {
        throw new Error('Некорректный формат ID ячейки');
      }

      if (typeof executor !== 'string') {
        throw new Error('Некорректный формат ID исполнителя');
      }

      const result = await this.repository.clearLocation(locationId, executor);

      if (!result.success) {
        return {
          success: false,
          errorCode: 400,
          msg: 'Не удалось очистить ячейку'
        };
      }

      return {
        success: true,
        msg: result.message,
        data: {
          locationId,
          clearedItems: result.clearedItems
        }
      };
    } catch (error) {
      logger.error('Ошибка при очистке ячейки:', error);
      throw error;
    }
  }

  /**
   * Обновление данных инвентаризации
   */
  async updateInventory(params) {
    try {
      if (!this.repository) {
        await this.initialize();
      }

      const { productId, locationId, prunitId, quantity, conditionState, expirationDate, executor } = params;

      // Проверка корректности входных данных
      if (typeof productId !== 'string') {
        throw new Error('Некорректный формат ID товара');
      }
      if (typeof locationId !== 'string') {
        throw new Error('Некорректный формат ID ячейки');
      }
      if (typeof prunitId !== 'string') {
        throw new Error('Некорректный формат ID единицы хранения');
      }
      if (typeof quantity !== 'number' || quantity < 0) {
        throw new Error('Некорректное количество');
      }
      if (conditionState && !['кондиция', 'некондиция'].includes(conditionState)) {
        throw new Error('Некорректное состояние товара');
      }
      if (expirationDate && isNaN(Date.parse(expirationDate))) {
        throw new Error('Некорректный формат срока годности');
      }
      if (typeof executor !== 'string') {
        throw new Error('Некорректный формат ID исполнителя');
      }

      const result = await this.repository.updateInventory({
        productId,
        locationId,
        prunitId,
        quantity,
        conditionState,
        expirationDate,
        executor
      });

      if (!result) {
        return {
          success: false,
          errorCode: 404,
          msg: 'Товар не найден'
        };
      }

      return {
        success: true,
        msg: result.isNewItem ? 'Товар добавлен в ячейку' : 'Данные инвентаризации обновлены',
        data: result
      };
    } catch (error) {
      logger.error('Ошибка при обновлении данных инвентаризации:', error);
      throw error;
    }
  }

  /**
   * Перемещение товара между ячейками (пятнашка)
   */
  async moveItemBetweenLocations(params) {
    try {
      if (!this.repository) {
        await this.initialize();
      }

      const {
        productId,
        sourceLocationId,
        targetLocationId,
        targetWrShk,
        prunitId,
        quantity,
        conditionState,
        expirationDate,
        executor
      } = params;

      // Проверка корректности входных данных
      if (typeof productId !== 'string') {
        throw new Error('Некорректный формат ID товара');
      }
      if (typeof sourceLocationId !== 'string') {
        throw new Error('Некорректный формат ID исходной ячейки');
      }
      if (typeof targetLocationId !== 'string') {
        throw new Error('Некорректный формат ID целевой ячейки');
      }
      if (typeof targetWrShk !== 'string') {
        throw new Error('Некорректный формат штрих-кода целевой ячейки');
      }
      if (typeof prunitId !== 'string') {
        throw new Error('Некорректный формат ID единицы хранения');
      }
      if (typeof quantity !== 'number' || quantity <= 0) {
        throw new Error('Некорректное количество');
      }
      if (conditionState && !['кондиция', 'некондиция'].includes(conditionState)) {
        throw new Error('Некорректное состояние товара');
      }
      if (expirationDate && isNaN(Date.parse(expirationDate))) {
        throw new Error('Некорректный формат срока годности');
      }
      if (typeof executor !== 'string') {
        throw new Error('Некорректный формат ID исполнителя');
      }

      // Получаем информацию о товаре перед перемещением
      const sourceInfo = await this.repository.getLocationItems(sourceLocationId);
      const sourceItem = sourceInfo.find(item =>
        item.id === productId && item.prunit_id === prunitId
      );

      if (!sourceItem) {
        return {
          success: false,
          errorCode: 404,
          msg: 'Товар не найден в исходной ячейке'
        };
      }

      // Проверяем достаточное количество
      if (sourceItem.product_qnt < quantity) {
        return {
          success: false,
          errorCode: 400,
          msg: `Недостаточное количество товара. Доступно: ${sourceItem.product_qnt}, запрошено: ${quantity}`,
          available: sourceItem.product_qnt
        };
      }

      // Получаем информацию о целевой ячейке
      const targetInfo = await this.repository.getLocationItems(targetLocationId);
      const targetItem = targetInfo.find(item =>
        item.id === productId && item.prunit_id === prunitId
      );

      const targetQuantity = targetItem ? targetItem.product_qnt : 0;
      const isFullMove = sourceItem.product_qnt === quantity;

      // Выполняем перемещение
      const result = await this.repository.moveItemBetweenLocations({
        productId,
        sourceLocationId,
        targetLocationId,
        targetWrShk,
        prunitId,
        quantity,
        conditionState,
        expirationDate,
        executor,
        isFullMove
      });

      if (!result) {
        return {
          success: false,
          errorCode: 404,
          msg: 'Не удалось выполнить перемещение товара'
        };
      }

      if (result.error === 'insufficient_quantity') {
        return {
          success: false,
          errorCode: 400,
          msg: `Недостаточное количество товара. Доступно: ${result.available}`,
          available: result.available
        };
      }

      // Формируем подробный ответ
      return {
        success: true,
        msg: 'Товар успешно перемещен',
        data: {
          ...result,
          sourceInfo: {
            locationId: sourceLocationId,
            previousQuantity: sourceItem.product_qnt,
            remainingQuantity: Math.max(0, sourceItem.product_qnt - quantity),
            isEmptied: sourceItem.product_qnt <= quantity
          },
          targetInfo: {
            locationId: targetLocationId,
            wrShk: targetWrShk,
            previousQuantity: targetQuantity,
            newQuantity: targetQuantity + quantity
          },
          movedInfo: {
            productId,
            name: sourceItem.name,
            article: sourceItem.article,
            shk: sourceItem.shk,
            prunitId,
            prunitName: sourceItem.prunit_name,
            quantity,
            conditionState: result.conditionState,
            expirationDate: result.expirationDate,
            isFullMove
          }
        }
      };
    } catch (error) {
      logger.error('Ошибка при перемещении товара между ячейками:', error);
      throw error;
    }
  }

  /**
   * Получение детальной информации о товаре по ШК или артикулу
   */
  async getDetailedItemInfo(params) {
    try {
      if (!this.repository) {
        await this.initialize();
      }

      const { shk, article, wrShk } = params;

      // Проверка корректности входных данных
      if (!shk && !article && !wrShk) {
        throw new Error('Необходимо указать ШК, артикул или ШК ячейки');
      }

      if (shk && typeof shk !== 'string') {
        throw new Error('Некорректный формат штрих-кода');
      }

      if (article && typeof article !== 'string') {
        throw new Error('Некорректный формат артикула');
      }

      if (wrShk && typeof wrShk !== 'string') {
        throw new Error('Некорректный формат штрих-кода ячейки');
      }

      const result = await this.repository.getDetailedItemInfo({ shk, article, wrShk });

      if (!result) {
        return {
          success: false,
          errorCode: 404,
          msg: 'Информация не найдена'
        };
      }

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('Ошибка при получении детальной информации о товаре:', error);
      throw error;
    }
  }

  /**
   * Получение списка всех ячеек хранения
   */
  async getAllLocations() {
    try {
      if (!this.repository) {
        await this.initialize();
      }

      const locations = await this.repository.getAllLocations();

      if (!locations || locations.length === 0) {
        return {
          success: false,
          errorCode: 404,
          msg: 'Ячейки хранения не найдены'
        };
      }

      // Группируем ячейки по типу (буфер и обычные)
      const bufferLocations = locations.filter(loc => loc.locationId.startsWith('BUFFER'));
      const regularLocations = locations.filter(loc => !loc.locationId.startsWith('BUFFER'));

      return {
        success: true,
        data: {
          total: locations.length,
          bufferLocations,
          regularLocations
        }
      };
    } catch (error) {
      logger.error('Ошибка при получении списка ячеек хранения:', error);
      throw error;
    }
  }

  /**
   * Регистрация некондиции
   */
  async registerDefect(data) {
    try {
      if (!this.repository) {
        await this.initialize();
      }

      const { productId, defectReason, executor } = data;

      // Проверка обязательных параметров
      if (!productId) {
        throw new Error('Не указан ID товара (productId)');
      }

      if (!defectReason) {
        throw new Error('Не указана причина некондиции (defectReason)');
      }

      if (!executor) {
        throw new Error('Не указан исполнитель (executor)');
      }

      logger.info('Регистрация некондиции:', JSON.stringify(data));

      const result = await this.repository.registerDefect(data);

      if (result === null) {
        return {
          success: false,
          message: `Товар с ID ${productId} не найден`
        };
      }

      return {
        success: true,
        message: 'Некондиция успешно зарегистрирована'
      };
    } catch (error) {
      logger.error('Error in StorageService.registerDefect:', error);
      throw error;
    }
  }

  /**
   * Получение отчета по остаткам в буфере
   */
  async getBufferReport() {
    try {
      if (!this.repository) {
        await this.initialize();
      }

      logger.info('Получение отчета по остаткам в буфере');

      const result = await this.repository.getBufferReport();

      return {
        success: true,
        data: result,
        count: result.length
      };
    } catch (error) {
      logger.error('Error in StorageService.getBufferReport:', error);
      throw error;
    }
  }

  /**
   * Получение отчета по некондиции
   */
  async getDefectsReport() {
    try {
      if (!this.repository) {
        await this.initialize();
      }

      logger.info('Получение отчета по некондиции');

      const result = await this.repository.getDefectsReport();

      return {
        success: true,
        data: result,
        count: result.length
      };
    } catch (error) {
      logger.error('Error in StorageService.getDefectsReport:', error);
      throw error;
    }
  }

  /**
   * Получение отчета по инвентаризациям
   */
  async getInventoryReport() {
    try {
      if (!this.repository) {
        await this.initialize();
      }

      logger.info('Получение отчета по инвентаризациям');

      const result = await this.repository.getInventoryReport();

      return {
        success: true,
        data: result,
        count: result.length
      };
    } catch (error) {
      logger.error('Error in StorageService.getInventoryReport:', error);
      throw error;
    }
  }
}

module.exports = new StorageService();
