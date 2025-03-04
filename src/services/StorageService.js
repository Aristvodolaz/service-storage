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
      const { productId, prunitId, quantity, executor, wrShk } = params;

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

      // Создаем новую запись в буфере
      const bufferData = {
        id: productId,
        name: item.name,
        article: item.article,
        shk: item.shk,
        productQnt: quantity,
        prunitId: prunitId,
        prunitName: item.prunitName,
        wrShk: wrShk,
        idScklad: 'BUFFER',
        executor: executor,
        placeQnt: quantity,
        conditionState: 'кондиция',
        expirationDate: item.expirationDate,
        startExpirationDate: item.startExpirationDate,
        endExpirationDate: item.endExpirationDate
      };

      const created = await this.repository.create(bufferData);

      if (!created) {
        return {
          success: false,
          errorCode: 400,
          msg: 'Не удалось разместить товар в буфер'
        };
      }

      return {
        success: true,
        msg: 'Товар успешно размещен в буфер'
      };
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
}

module.exports = new StorageService();
