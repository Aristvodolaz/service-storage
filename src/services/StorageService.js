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
  async getStorageInfo({ productId, shk, article, wrShk }) {
    try {
      logger.info('Получение информации о товаре:', { productId, shk, article, wrShk });

      // Если параметры не указаны, возвращаем все записи
      const pool = await connectToDatabase();
      let query = `
        SELECT
        *
        FROM x_Storage_Full_Info
        WHERE 1=1
      `;

      const params = [];

      if (productId) {
        query += ` AND ID = @productId`;
        params.push({ name: 'productId', value: productId });
      }
      if (shk) {
        query += ` AND SHK = @shk`;
        params.push({ name: 'shk', value: shk }); image.png
      }
      if (article) {
        query += ` AND Article = @article`;
        params.push({ name: 'article', value: article });
      }
      if (wrShk) {
        query += ` AND WR_SHK = @wrShk`;
        params.push({ name: 'wrShk', value: wrShk });
      }

      const request = pool.request();
      params.forEach(param => {
        request.input(param.name, param.value);
      });

      const result = await request.query(query);

      if (!result.recordset || result.recordset.length === 0) {
        let errorMsg = 'Товар не найден';
        if (productId) errorMsg = `Товар с ID ${productId} не найден`;
        if (shk) errorMsg = `Товар с ШК ${shk} не найден`;
        if (article) errorMsg = `Товар с артикулом ${article} не найден`;
        if (wrShk) errorMsg = `Ячейка с ШК ${wrShk} не найдена или пуста`;

        return {
          success: false,
          errorCode: 404,
          msg: errorMsg
        };
      }

      // Если параметры не указаны, возвращаем все записи без группировки
      if (!productId && !shk && !article && !wrShk) {
        return {
          success: true,
          data: result.recordset
        };
      }

      // Группируем результаты по товарам
      const products = {};
      result.recordset.forEach(record => {
        if (!products[record.ID]) {
          products[record.ID] = {
            id: record.ID,
            name: record.Name,
            article: record.Article,
            shk: record.SHK,
            units: {}
          };
        }

        if (record.Prunit_Id && !products[record.ID].units[record.Prunit_Id]) {
          products[record.ID].units[record.Prunit_Id] = {
            id: record.Prunit_Id,
            name: record.Prunit_Name,
            locations: []
          };
        }

        if (record.WR_SHK) {
          products[record.ID].units[record.Prunit_Id].locations.push({
            wrShk: record.WR_SHK,
            quantity: record.Place_QNT,
            conditionState: record.Condition_State,
            expirationDate: record.Expiration_Date,
            createdAt: record.Create_Date,
            updatedAt: record.Update_Date,
            idScklad: record.id_scklad
          });
        }
      });

      return {
        success: true,
        data: Object.values(products)
      };
    } catch (error) {
      logger.error('Ошибка при получении информации о товаре:', error);
      return {
        success: false,
        errorCode: 500,
        msg: 'Внутренняя ошибка сервера'
      };
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

      const {
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
      } = params;

      logger.info('Начало выполнения moveToBuffer');
      logger.info('Параметры:', JSON.stringify(params));

      // Проверка корректности входных данных
      if (typeof productId !== 'string') {
        throw new Error('Некорректный формат ID товара');
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

      // Добавляем товар в буфер
      const result = await this.repository.addToBuffer({
        productId,
        prunitId,
        quantity,
        executor,
        wrShk,
        conditionState: conditionState || 'кондиция',
        expirationDate,
        name,
        article,
        shk,
        sklad_id
      });

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
          quantity,
          locationId: wrShk,
          wrShk,
          conditionState: conditionState || 'кондиция',
          expirationDate
        }
      };
    } catch (error) {
      logger.error('Ошибка при размещении товара в буфер:', error);
      return {
        success: false,
        errorCode: 500,
        msg: 'Внутренняя ошибка сервера: ' + error.message
      };
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

      const { productId, prunitId, quantity, condition, executor, locationId } = params;

      // Проверка корректности входных данных
      if (typeof productId !== 'string') {
        throw new Error('Некорректный формат ID товара');
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
      if (!locationId) {
        throw new Error('Не указан ID местоположения');
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

      // Ищем товар в указанном местоположении
      const bufferItem = bufferStock.find(item =>
        item.prunitId === prunitId &&
        item.locationId === locationId
      );

      if (!bufferItem) {
        return {
          success: false,
          errorCode: 404,
          msg: 'Указанная единица хранения не найдена в буфере'
        };
      }

      // Проверяем доступное количество
      if (bufferItem.quantity < quantity) {
        return {
          success: false,
          errorCode: 400,
          msg: `Недостаточное количество товара в буфере. Доступно: ${bufferItem.quantity}, запрошено: ${quantity}`
        };
      }

      // Определяем, полное ли это изъятие
      const isFullRemoval = bufferItem.quantity <= quantity;
      const newQuantity = bufferItem.quantity - quantity;

      if (condition === 'некондиция') {
        // Регистрируем некондицию
        await this.repository.registerDefect({
          productId,
          defectReason: 'Перемещение из буфера с отметкой некондиции',
          executor
        });

        // Если это полное изъятие, удаляем запись из буфера
        if (isFullRemoval) {
          // Удаляем запись из буфера
          await this.repository.deleteFromBuffer(productId, prunitId, locationId);
        } else {
          // Обновляем количество в буфере
          await this.repository.updateBufferQuantity({
            productId,
            prunitId,
            locationId,
            quantity: newQuantity,
            conditionState: bufferItem.conditionState,
            expirationDate: bufferItem.expirationDate,
            wrShk: bufferItem.wrShk,
            executor
          });
        }

        // Логируем операцию
        await this.repository.logStorageOperation({
          operationType: 'изъятие_некондиция',
          productId,
          prunitId,
          fromLocationId: locationId,
          toLocationId: null,
          quantity,
          expirationDate: bufferItem.expirationDate,
          conditionState: 'некондиция',
          executor
        });

        return {
          success: true,
          msg: 'Товар помечен как некондиция и изъят из буфера',
          data: {
            productId,
            prunitId,
            locationId,
            removedQuantity: quantity,
            remainingQuantity: newQuantity,
            isFullRemoval
          }
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

        // Выбираем первый адрес комплектации
        const targetLocationId = locations[0].locationId;

        // Если это полное изъятие, удаляем запись из буфера
        if (isFullRemoval) {
          // Удаляем запись из буфера
          await this.repository.deleteFromBuffer(productId, prunitId, locationId);
        } else {
          // Обновляем количество в буфере
          await this.repository.updateBufferQuantity({
            productId,
            prunitId,
            locationId,
            quantity: newQuantity,
            conditionState: bufferItem.conditionState,
            expirationDate: bufferItem.expirationDate,
            wrShk: bufferItem.wrShk,
            executor
          });
        }

        // Добавляем товар в зону комплектации
        await this.repository.addToLocation({
          productId,
          prunitId,
          locationId: targetLocationId,
          quantity,
          conditionState: 'кондиция',
          expirationDate: bufferItem.expirationDate,
          executor
        });

        // Логируем операцию
        await this.repository.logStorageOperation({
          operationType: 'перемещение',
          productId,
          prunitId,
          fromLocationId: locationId,
          toLocationId: targetLocationId,
          quantity,
          expirationDate: bufferItem.expirationDate,
          conditionState: 'кондиция',
          executor
        });

        return {
          success: true,
          msg: 'Товар перемещен из буфера в зону комплектации',
          data: {
            productId,
            prunitId,
            fromLocationId: locationId,
            toLocationId: targetLocationId,
            quantity,
            remainingQuantity: newQuantity,
            isFullRemoval
          }
        };
      }
    } catch (error) {
      logger.error('Ошибка при перемещении товара из буфера:', error);
      return {
        success: false,
        errorCode: 500,
        msg: 'Внутренняя ошибка сервера: ' + error.message
      };
    }
  }

  /**
   * Снятие товара из ячейки
   */
  async pickFromLocation(data) {
    try {
      const { productId, locationId, prunitId, quantity, executor } = data;

      if (!productId || !locationId || !prunitId || !quantity || !executor) {
        throw new Error('Не все обязательные параметры указаны');
      }

      const result = await this.repository.pickFromLocation(data);

      if (!result) {
        throw new Error('Товар не найден в указанной ячейке');
      }

      if (result.error === 'insufficient_quantity') {
        throw new Error(`Недостаточное количество товара: доступно ${result.available}, запрошено ${quantity}`);
      }

      return result;
    } catch (error) {
      logger.error('Error in pickFromLocation service:', error);
      throw error;
    }
  }

  /**
   * Снятие товара из ячейки с учетом поля sklad_id
   */
  async pickFromLocationBySkladId(data) {
    try {
      const { productId, locationId, prunitId, quantity, executor, sklad_id } = data;

      if (!productId || !locationId || !prunitId || !quantity || !executor) {
        throw new Error('Не все обязательные параметры указаны');
      }

      const result = await this.repository.pickFromLocationBySkladId(data);

      if (!result) {
        throw new Error('Товар не найден в указанной ячейке');
      }

      if (result.error === 'insufficient_quantity') {
        throw new Error(`Недостаточное количество товара: доступно ${result.available}, запрошено ${quantity}`);
      }

      return result;
    } catch (error) {
      logger.error('Error in pickFromLocationBySkladId service:', error);
      throw error;
    }
  }

  /**
   * Получение списка товаров в ячейке (инвентаризация по ячейке)
   */
  async getLocationItems(locationId, id_scklad) {
    try {
      if (!this.repository) {
        await this.initialize();
      }

      if (typeof locationId !== 'string') {
        throw new Error('Некорректный формат ID ячейки');
      }

      const items = await this.repository.getLocationItems(locationId, id_scklad);

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
            idSklad: item.id_scklad,
            wrShk: item.wr_shk,
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
   * Очистка ячейки (установка нулевого количества для всех товаров)
   */
  async clearLocation(params) {
    try {
      if (!this.repository) {
        await this.initialize();
      }

      const { locationId, executor, sklad_id } = params;

      if (typeof locationId !== 'string') {
        throw new Error('Некорректный формат ID ячейки');
      }

      if (typeof executor !== 'string') {
        throw new Error('Некорректный формат ID исполнителя');
      }

      const result = await this.repository.clearLocation(locationId, sklad_id, executor);

      if (!result.success) {
        return {
          success: false,
          errorCode: 400,
          msg: 'Не удалось очистить ячейку'
        };
      }

      return result;
    } catch (error) {
      logger.error('Ошибка при очистке ячейки:', error);
      return {
        success: false,
        errorCode: 500,
        msg: 'Внутренняя ошибка сервера'
      };
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
   * Перемещение товара между ячейками
   * @param {Object} params - Параметры перемещения
   * @returns {Promise<Object>} - Результат перемещения
   */
  async moveItemBetweenLocations(params) {
    try {
      logger.info('Начало выполнения moveItemBetweenLocations в сервисе');
      logger.info('Параметры:', JSON.stringify(params));

      // Проверяем обязательные параметры
      const requiredParams = ['productId', 'sourceLocationId', 'targetLocationId', 'prunitId', 'quantity', 'executor'];
      for (const param of requiredParams) {
        if (!params[param]) {
          logger.warn(`Отсутствует обязательный параметр: ${param}`);
          return {
            error: 'missing_param',
            param,
            msg: `Отсутствует обязательный параметр: ${param}`
          };
        }
      }

      // Проверяем, что исходная и целевая ячейки не совпадают
      if (params.sourceLocationId === params.targetLocationId) {
        logger.warn(`Исходная и целевая ячейки совпадают: ${params.sourceLocationId}`);
        return {
          error: 'same_location',
          msg: 'Исходная и целевая ячейки не могут совпадать'
        };
      }

      // Проверяем, что количество положительное
      const quantity = parseFloat(params.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        logger.warn(`Некорректное количество: ${params.quantity}`);
        return {
          error: 'invalid_quantity',
          msg: 'Количество должно быть положительным числом'
        };
      }

      // Вызываем метод репозитория для перемещения товара
      const result = await this.repository.moveItemBetweenLocationsV2({
        productId: params.productId,
        sourceLocationId: params.sourceLocationId,
        targetLocationId: params.targetLocationId,
        targetWrShk: params.targetWrShk,
        prunitId: params.prunitId,
        quantity,
        conditionState: params.conditionState,
        expirationDate: params.expirationDate,
        executor: params.executor,
        isFullMove: params.isFullMove === true,
        id_sklad: params.id_sklad
      });

      logger.info('Результат перемещения товара:', JSON.stringify(result));
      return result;
    } catch (error) {
      logger.error('Ошибка при перемещении товара:', error);
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

  /**
   * Получение детальной информации о ячейке
   * @param {string} locationId - Штрих-код ячейки
   * @param {string} id_scklad - ID склада (опционально)
   * @returns {Promise<Object>} - Детальная информация о ячейке и товарах в ней
   */
  async getLocationDetails(locationId, id_scklad) {
    try {
      logger.info(`Получение детальной информации о ячейке: ${locationId}${id_scklad ? `, склад: ${id_scklad}` : ''}`);

      if (!locationId) {
        logger.warn('Не указан штрих-код ячейки');
        return {
          success: false,
          errorCode: 400,
          msg: 'Необходимо указать штрих-код ячейки'
        };
      }

      const locationDetails = await this.repository.getLocationDetails(locationId, id_scklad);

      if (!locationDetails || !locationDetails.locationId) {
        logger.warn(`Ячейка ${locationId} не найдена или пуста`);
        return {
          success: false,
          errorCode: 404,
          msg: `Ячейка ${locationId} не найдена или пуста`
        };
      }

      return {
        success: true,
        data: locationDetails
      };
    } catch (error) {
      logger.error('Ошибка при получении детальной информации о ячейке:', error);
      return {
        success: false,
        errorCode: 500,
        msg: 'Внутренняя ошибка сервера',
        error: error.message
      };
    }
  }

  /**
   * Получение детальной информации о товаре по артикулу
   * @param {string} article - Артикул товара
   * @returns {Promise<Object>} - Детальная информация о товаре и его размещении
   */
  async getArticleDetails(article) {
    try {
      logger.info(`Получение детальной информации о товаре по артикулу: ${article}`);

      if (!article) {
        logger.warn('Не указан артикул товара');
        return {
          success: false,
          errorCode: 400,
          msg: 'Необходимо указать артикул товара'
        };
      }

      const articleDetails = await this.repository.getArticleDetails(article);

      if (!articleDetails || !articleDetails.totalLocations) {
        logger.warn(`Товар с артикулом ${article} не найден или отсутствует на складе`);
        return {
          success: false,
          errorCode: 404,
          msg: `Товар с артикулом ${article} не найден или отсутствует на складе`
        };
      }

      return {
        success: true,
        data: articleDetails
      };
    } catch (error) {
      logger.error('Ошибка при получении детальной информации о товаре:', error);
      return {
        success: false,
        errorCode: 500,
        msg: 'Внутренняя ошибка сервера',
        error: error.message
      };
    }
  }

  /**
   * Выполнение инвентаризации ячейки
   * @param {Object} data - Данные инвентаризации
   * @returns {Promise<Object>} - Результат инвентаризации
   */
  async performInventory(data) {
    try {
      const { locationId, items, executor, idScklad, updateQuantities = false } = data;

      logger.info(`Выполнение инвентаризации ячейки: ${locationId}${idScklad ? `, склад: ${idScklad}` : ''}`);
      logger.info(`Исполнитель: ${executor}, Обновлять количества: ${updateQuantities}`);

      if (!locationId) {
        logger.warn('Не указан штрих-код ячейки');
        return {
          success: false,
          errorCode: 400,
          msg: 'Необходимо указать штрих-код ячейки'
        };
      }

      if (!executor) {
        logger.warn('Не указан исполнитель');
        return {
          success: false,
          errorCode: 400,
          msg: 'Необходимо указать исполнителя'
        };
      }

      if (!Array.isArray(items)) {
        logger.warn('Некорректный формат списка товаров');
        return {
          success: false,
          errorCode: 400,
          msg: 'Список товаров должен быть массивом'
        };
      }

      // Проверяем корректность данных о товарах
      for (const item of items) {
        if (!item.article || !item.prunitId) {
          logger.warn('Некорректные данные о товаре:', item);
          return {
            success: false,
            errorCode: 400,
            msg: 'Для каждого товара необходимо указать артикул и единицу хранения'
          };
        }

        if (isNaN(parseFloat(item.quantity)) || parseFloat(item.quantity) < 0) {
          logger.warn('Некорректное количество товара:', item);
          return {
            success: false,
            errorCode: 400,
            msg: 'Количество товара должно быть неотрицательным числом'
          };
        }
      }

      // Выполняем инвентаризацию
      const result = await this.repository.performInventory({
        locationId,
        items,
        executor,
        idScklad,
        updateQuantities
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('Ошибка при выполнении инвентаризации:', error);
      return {
        success: false,
        errorCode: 500,
        msg: 'Внутренняя ошибка сервера',
        error: error.message
      };
    }
  }

  /**
   * Получение истории инвентаризаций
   * @param {Object} params - Параметры запроса
   * @returns {Promise<Object>} - История инвентаризаций
   */
  async getInventoryHistory(params = {}) {
    try {
      logger.info('Получение истории инвентаризаций с параметрами:', JSON.stringify(params));

      // Проверяем корректность дат
      if (params.startDate && isNaN(Date.parse(params.startDate))) {
        logger.warn('Некорректный формат начальной даты:', params.startDate);
        return {
          success: false,
          errorCode: 400,
          msg: 'Некорректный формат начальной даты'
        };
      }

      if (params.endDate && isNaN(Date.parse(params.endDate))) {
        logger.warn('Некорректный формат конечной даты:', params.endDate);
        return {
          success: false,
          errorCode: 400,
          msg: 'Некорректный формат конечной даты'
        };
      }

      // Проверяем корректность статуса
      const validStatuses = ['match', 'surplus', 'shortage', 'missing', 'not_found'];
      if (params.status && !validStatuses.includes(params.status)) {
        logger.warn('Некорректный статус инвентаризации:', params.status);
        return {
          success: false,
          errorCode: 400,
          msg: `Некорректный статус инвентаризации. Допустимые значения: ${validStatuses.join(', ')}`
        };
      }

      // Получаем историю инвентаризаций
      const history = await this.repository.getInventoryHistory(params);

      // Группируем записи по дате и ячейке для удобства отображения
      const groupedHistory = {};

      history.forEach(record => {
        const date = new Date(record.inventory_date).toISOString().split('T')[0];
        const key = `${date}_${record.location_id}_${record.id_scklad || 'null'}`;

        if (!groupedHistory[key]) {
          groupedHistory[key] = {
            date,
            locationId: record.location_id,
            idScklad: record.id_scklad,
            executor: record.executor,
            items: []
          };
        }

        groupedHistory[key].items.push({
          id: record.id,
          article: record.article,
          productName: record.product_name,
          prunitId: record.prunit_id,
          prunitName: record.prunit_name,
          systemQuantity: record.system_quantity,
          actualQuantity: record.actual_quantity,
          difference: record.difference,
          status: record.status,
          notes: record.notes
        });
      });

      return {
        success: true,
        data: {
          records: history,
          groupedRecords: Object.values(groupedHistory)
        }
      };
    } catch (error) {
      logger.error('Ошибка при получении истории инвентаризаций:', error);
      return {
        success: false,
        errorCode: 500,
        msg: 'Внутренняя ошибка сервера',
        error: error.message
      };
    }
  }

  /**
   * Получение сводного отчета по инвентаризациям
   * @param {Object} params - Параметры запроса
   * @returns {Promise<Object>} - Сводный отчет по инвентаризациям
   */
  async getInventorySummary(params = {}) {
    try {
      logger.info('Получение сводного отчета по инвентаризациям с параметрами:', JSON.stringify(params));

      // Получаем историю инвентаризаций
      const history = await this.repository.getInventoryHistory(params);

      // Формируем сводный отчет
      const summary = {
        totalInventories: 0,
        totalLocations: new Set(),
        totalArticles: new Set(),
        totalExecutors: new Set(),
        statusCounts: {
          match: 0,
          surplus: 0,
          shortage: 0,
          missing: 0,
          not_found: 0
        },
        totalDifference: 0,
        totalSurplus: 0,
        totalShortage: 0,
        byDate: {},
        byLocation: {},
        byArticle: {},
        byExecutor: {}
      };

      // Группируем записи по дате и ячейке
      const inventoryGroups = {};

      history.forEach(record => {
        const date = new Date(record.inventory_date).toISOString().split('T')[0];
        const key = `${date}_${record.location_id}_${record.id_scklad || 'null'}`;

        if (!inventoryGroups[key]) {
          inventoryGroups[key] = {
            date,
            locationId: record.location_id,
            idScklad: record.id_scklad,
            executor: record.executor,
            items: []
          };

          // Увеличиваем счетчик инвентаризаций
          summary.totalInventories++;

          // Добавляем ячейку в множество
          summary.totalLocations.add(record.location_id);

          // Добавляем исполнителя в множество
          summary.totalExecutors.add(record.executor);

          // Обновляем статистику по датам
          if (!summary.byDate[date]) {
            summary.byDate[date] = {
              count: 0,
              locations: new Set(),
              articles: new Set(),
              statusCounts: {
                match: 0,
                surplus: 0,
                shortage: 0,
                missing: 0,
                not_found: 0
              }
            };
          }
          summary.byDate[date].count++;
          summary.byDate[date].locations.add(record.location_id);

          // Обновляем статистику по ячейкам
          if (!summary.byLocation[record.location_id]) {
            summary.byLocation[record.location_id] = {
              count: 0,
              articles: new Set(),
              statusCounts: {
                match: 0,
                surplus: 0,
                shortage: 0,
                missing: 0,
                not_found: 0
              }
            };
          }
          summary.byLocation[record.location_id].count++;

          // Обновляем статистику по исполнителям
          if (!summary.byExecutor[record.executor]) {
            summary.byExecutor[record.executor] = {
              count: 0,
              locations: new Set(),
              articles: new Set(),
              statusCounts: {
                match: 0,
                surplus: 0,
                shortage: 0,
                missing: 0,
                not_found: 0
              }
            };
          }
          summary.byExecutor[record.executor].count++;
          summary.byExecutor[record.executor].locations.add(record.location_id);
        }

        inventoryGroups[key].items.push({
          id: record.id,
          article: record.article,
          productName: record.product_name,
          prunitId: record.prunit_id,
          prunitName: record.prunit_name,
          systemQuantity: record.system_quantity,
          actualQuantity: record.actual_quantity,
          difference: record.difference,
          status: record.status,
          notes: record.notes
        });

        // Добавляем артикул в множество
        summary.totalArticles.add(record.article);

        // Обновляем счетчики статусов
        summary.statusCounts[record.status]++;

        // Обновляем общую разницу
        summary.totalDifference += record.difference;
        if (record.difference > 0) {
          summary.totalSurplus += record.difference;
        } else if (record.difference < 0) {
          summary.totalShortage += Math.abs(record.difference);
        }

        // Обновляем статистику по датам
        summary.byDate[date].articles.add(record.article);
        summary.byDate[date].statusCounts[record.status]++;

        // Обновляем статистику по ячейкам
        summary.byLocation[record.location_id].articles.add(record.article);
        summary.byLocation[record.location_id].statusCounts[record.status]++;

        // Обновляем статистику по артикулам
        if (!summary.byArticle[record.article]) {
          summary.byArticle[record.article] = {
            name: record.product_name,
            count: 0,
            locations: new Set(),
            statusCounts: {
              match: 0,
              surplus: 0,
              shortage: 0,
              missing: 0,
              not_found: 0
            },
            totalDifference: 0
          };
        }
        summary.byArticle[record.article].count++;
        summary.byArticle[record.article].locations.add(record.location_id);
        summary.byArticle[record.article].statusCounts[record.status]++;
        summary.byArticle[record.article].totalDifference += record.difference;

        // Обновляем статистику по исполнителям
        summary.byExecutor[record.executor].articles.add(record.article);
        summary.byExecutor[record.executor].statusCounts[record.status]++;
      });

      // Преобразуем множества в массивы и подсчитываем размеры
      summary.totalLocations = Array.from(summary.totalLocations);
      summary.totalArticles = Array.from(summary.totalArticles);
      summary.totalExecutors = Array.from(summary.totalExecutors);

      // Преобразуем статистику по датам
      Object.keys(summary.byDate).forEach(date => {
        summary.byDate[date].locations = Array.from(summary.byDate[date].locations);
        summary.byDate[date].articles = Array.from(summary.byDate[date].articles);
        summary.byDate[date].locationsCount = summary.byDate[date].locations.length;
        summary.byDate[date].articlesCount = summary.byDate[date].articles.length;
      });

      // Преобразуем статистику по ячейкам
      Object.keys(summary.byLocation).forEach(location => {
        summary.byLocation[location].articles = Array.from(summary.byLocation[location].articles);
        summary.byLocation[location].articlesCount = summary.byLocation[location].articles.length;
      });

      // Преобразуем статистику по артикулам
      Object.keys(summary.byArticle).forEach(article => {
        summary.byArticle[article].locations = Array.from(summary.byArticle[article].locations);
        summary.byArticle[article].locationsCount = summary.byArticle[article].locations.length;
      });

      // Преобразуем статистику по исполнителям
      Object.keys(summary.byExecutor).forEach(executor => {
        summary.byExecutor[executor].locations = Array.from(summary.byExecutor[executor].locations);
        summary.byExecutor[executor].articles = Array.from(summary.byExecutor[executor].articles);
        summary.byExecutor[executor].locationsCount = summary.byExecutor[executor].locations.length;
        summary.byExecutor[executor].articlesCount = summary.byExecutor[executor].articles.length;
      });

      return {
        success: true,
        data: {
          summary: {
            totalInventories: summary.totalInventories,
            totalLocationsCount: summary.totalLocations.length,
            totalArticlesCount: summary.totalArticles.length,
            totalExecutorsCount: summary.totalExecutors.length,
            statusCounts: summary.statusCounts,
            totalDifference: summary.totalDifference,
            totalSurplus: summary.totalSurplus,
            totalShortage: summary.totalShortage
          },
          details: {
            byDate: summary.byDate,
            byLocation: summary.byLocation,
            byArticle: summary.byArticle,
            byExecutor: summary.byExecutor
          },
          inventories: Object.values(inventoryGroups)
        }
      };
    } catch (error) {
      logger.error('Ошибка при получении сводного отчета по инвентаризациям:', error);
      return {
        success: false,
        errorCode: 500,
        msg: 'Внутренняя ошибка сервера',
        error: error.message
      };
    }
  }

  /**
   * Получение информации о товаре по артикулу или ШК с фильтрацией по id_sklad
   * @param {Object} params - Параметры запроса
   * @returns {Promise<Array>} - Массив записей о товаре
   */
  async getArticleInfoBySklad(params) {
    try {
      if (!this.repository) {
        await this.initialize();
      }

      const { article, shk, id_sklad } = params;

      // Проверяем, что указан хотя бы один параметр для поиска
      if (!article && !shk) {
        return {
          success: false,
          error: 'missing_params',
          msg: 'Необходимо указать артикул или штрих-код товара'
        };
      }

      const result = await this.repository.getArticleInfoBySklad({
        article,
        shk,
        id_sklad
      });

      // Проверяем, вернулась ли ошибка
      if (result && result.error) {
        return {
          success: false,
          error: result.error,
          msg: result.msg
        };
      }

      // Если записей нет, возвращаем пустой массив
      if (!result || result.length === 0) {
        return {
          success: true,
          data: [],
          msg: 'Записи не найдены'
        };
      }

      // Группируем записи по ячейкам
      const locationGroups = {};
      result.forEach(item => {
        const locationKey = item.wrShk || 'unknown';

        if (!locationGroups[locationKey]) {
          locationGroups[locationKey] = {
            locationId: item.wrShk,
            idScklad: item.idScklad,
            items: []
          };
        }

        locationGroups[locationKey].items.push(item);
      });

      return {
        success: true,
        data: {
          article: result[0].article,
          shk: result[0].shk,
          name: result[0].name,
          totalItems: result.length,
          totalQuantity: result.reduce((sum, item) => sum + item.placeQnt, 0),
          items: result,
          locations: Object.values(locationGroups)
        }
      };
    } catch (error) {
      logger.error('Ошибка при получении информации о товаре:', error);
      return {
        success: false,
        error: 'server_error',
        msg: 'Ошибка при получении информации о товаре'
      };
    }
  }

  /**
   * Получение списка пустых ячеек
   * @param {Object} params - Параметры запроса
   * @param {string} params.id_sklad - ID склада (WR_House) для фильтрации (опционально)
   * @returns {Promise<Object>} - Объект с результатами
   */
  async getEmptyCells(params = {}) {
    try {
      if (!this.repository) {
        await this.initialize();
      }

      const result = await this.repository.getEmptyCells(params);

      return {
        success: true,
        data: {
          cells: result,
          count: result.length
        }
      };
    } catch (error) {
      logger.error('Ошибка при получении списка пустых ячеек:', error);
      return {
        success: false,
        error: 'server_error',
        msg: 'Ошибка при получении списка пустых ячеек'
      };
    }
  }
}

module.exports = new StorageService();
