const storageRepository = require('../repositories/StorageRepository');
const logger = require('../utils/logger');

class StorageService {
  /**
   * Поиск товара по ШК или артикулу
   */
  async findItems(params) {
    try {
      // Проверка корректности входных данных
      if (params.shk && typeof params.shk !== 'string') {
        throw new Error('Некорректный формат штрих-кода');
      }
      if (params.article && typeof params.article !== 'string') {
        throw new Error('Некорректный формат артикула');
      }

      const items = await storageRepository.findByShkOrArticle(params);

      if (items.length === 0) {
        return {
          success: false,
          errorCode: 404,
          msg: 'Товары не найдены'
        };
      }

      return {
        success: true,
        data: items.map(item => item.toJSON())
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

      const items = await storageRepository.getStorageInfo(params);

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
      const units = await storageRepository.getStorageUnits(productId);

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
      const item = await storageRepository.getById(productId);
      if (!item) {
        return {
          success: false,
          errorCode: 404,
          msg: 'Товар не найден'
        };
      }

      // Обновляем количество
      const updated = await storageRepository.updateQuantity(productId, prunitId, quantity);

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
      const storageInfo = await storageRepository.getStorageInfo({ productId });
      if (storageInfo.length === 0) {
        return {
          success: false,
          errorCode: 404,
          msg: 'Товар не найден'
        };
      }

      const item = storageInfo[0];

      // Проверяем существование единицы хранения
      const units = await storageRepository.getStorageUnits(productId);
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

      const created = await storageRepository.create(bufferData);

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
      const bufferStock = await storageRepository.getBufferStock(productId);

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
        const updated = await storageRepository.update(productId, {
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
        const locations = await storageRepository.getPickingLocations(productId);

        if (locations.length === 0) {
          return {
            success: false,
            errorCode: 404,
            msg: 'Не найдены адреса комплектации для товара'
          };
        }

        // Перемещаем товар в зону комплектации
        const updated = await storageRepository.update(productId, {
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
