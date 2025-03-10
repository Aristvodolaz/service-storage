const { connectToDatabase } = require('../config/database');
const StorageItem = require('../models/StorageItem');
const logger = require('../utils/logger');

class StorageRepository {
  constructor(pool) {
    this.pool = pool;

    // Справочник типов единиц хранения
    this.prunitTypes = {
      0: { name: 'не указан', brief: 'не указан' },
      1: { name: 'Единица', brief: 'Ед' },
      2: { name: 'Минимальная Упаковка', brief: 'Мин.Уп' },
      3: { name: 'Промежуточная Упаковка', brief: 'Пр.Уп' },
      10: { name: 'Фабричная Упаковка', brief: 'Фб.Уп' },
      11: { name: 'Паллет', brief: 'Паллет' }
    };
  }

  /**
   * Поиск товара по ШК или артикулу
   */
  async findByShkOrArticle(params) {
    try {
      logger.info('Начало выполнения findByShkOrArticle');
      logger.info('Параметры поиска:', JSON.stringify(params));

      const { shk, article } = params;

      let query;

      if (shk) {
        query = `
          SELECT * FROM OPENQUERY(OW,
            'SELECT
              a.id,
              a.name,
              a.PIECE_GTIN as shk,
              a.article_id_real,
              a.qnt_in_pallet
            FROM wms.article a
            WHERE a.PIECE_GTIN = ''${shk}''
            AND a.article_id_real = a.id'
          )
        `;
      } else if (article) {
        query = `
          SELECT * FROM OPENQUERY(OW,
            'SELECT
              a.id,
              a.name,
              a.PIECE_GTIN as shk,
              a.article_id_real,
              a.qnt_in_pallet
            FROM wms.article a
            WHERE a.id = ''${article}''
            AND a.article_id_real = a.id'
          )
        `;
      }

      logger.info('Выполняемый SQL запрос:', query);
      const result = await this.pool.request().query(query);
      logger.info(`Получено записей: ${result.recordset.length}`);
      logger.info('Результаты поиска:', JSON.stringify(result.recordset));

      return result.recordset;
    } catch (error) {
      logger.error('Ошибка при поиске товара:', error);
      throw error;
    }
  }


  /**
   * Получение информации о товаре из x_Storage_Full_Info
   */
  async getStorageInfo(params) {
    try {
      const { productId, shk } = params;

      let query = `
        SELECT *
        FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]
        WHERE 1=1
      `;

      if (productId) {
        query += ` AND ID = @productId`;
      }
      if (shk) {
        query += ` AND SHK = @shk`;
      }

      query += ` ORDER BY Expiration_Date DESC`;

      const request = this.pool.request();
      if (productId) request.input('productId', productId);
      if (shk) request.input('shk', shk);

      const result = await request.query(query);
      return result.recordset.map(item => new StorageItem(item));
    } catch (error) {
      logger.error('Ошибка при получении информации о товаре:', error);
      throw error;
    }
  }

  /**
   * Создание новой записи в x_Storage_Full_Info
   */
  async create(data) {
    try {
      const query = `
        INSERT INTO [SPOe_rc].[dbo].[x_Storage_Full_Info]
        (ID, Name, Article, SHK, Product_QNT, Prunit_Name, Prunit_Id,
         WR_SHK, id_scklad, Expiration_Date, Start_Expiration_Date,
         End_Expiration_Date, Executor, Place_QNT, Condition_State)
        VALUES
        (@id, @name, @article, @shk, @productQnt, @prunitName, @prunitId,
         @wrShk, @idScklad, @expirationDate, @startExpirationDate,
         @endExpirationDate, @executor, @placeQnt, @conditionState)
      `;

      const result = await this.pool.request()
        .input('id', data.id)
        .input('name', data.name)
        .input('article', data.article)
        .input('shk', data.shk)
        .input('productQnt', data.productQnt)
        .input('prunitName', data.prunitName)
        .input('prunitId', data.prunitId)
        .input('wrShk', data.wrShk)
        .input('idScklad', data.idScklad)
        .input('expirationDate', data.expirationDate)
        .input('startExpirationDate', data.startExpirationDate)
        .input('endExpirationDate', data.endExpirationDate)
        .input('executor', data.executor)
        .input('placeQnt', data.placeQnt)
        .input('conditionState', data.conditionState)
        .query(query);

      return result.rowsAffected[0] > 0;
    } catch (error) {
      logger.error('Ошибка при создании записи:', error);
      throw error;
    }
  }

  /**
   * Обновление записи в x_Storage_Full_Info
   */
  async update(id, data) {
    try {
      let updateFields = `
        Product_QNT = @productQnt,
        Place_QNT = @placeQnt,
        Condition_State = @conditionState,
        Executor = @executor,
        id_scklad = @idScklad
      `;

      // Добавляем WR_SHK, если он указан
      if (data.wrShk) {
        updateFields += `, WR_SHK = @wrShk`;
      }

      // Добавляем Expiration_Date, если он указан
      if (data.expirationDate) {
        updateFields += `, Expiration_Date = @expirationDate`;
      }

      const query = `
        UPDATE [SPOe_rc].[dbo].[x_Storage_Full_Info]
        SET ${updateFields}
        WHERE ID = @id AND Prunit_Id = @prunitId
      `;

      const request = this.pool.request()
        .input('id', id)
        .input('prunitId', data.prunitId)
        .input('productQnt', data.productQnt)
        .input('placeQnt', data.placeQnt)
        .input('conditionState', data.conditionState)
        .input('executor', data.executor)
        .input('idScklad', data.idScklad);

      // Добавляем параметры, если они указаны
      if (data.wrShk) {
        request.input('wrShk', data.wrShk);
      }

      if (data.expirationDate) {
        request.input('expirationDate', data.expirationDate);
      }

      const result = await request.query(query);

      return result.rowsAffected[0] > 0;
    } catch (error) {
      logger.error('Ошибка при обновлении записи:', error);
      throw error;
    }
  }

  /**
   * Удаление записи из x_Storage_Full_Info
   */
  async delete(id, prunitId) {
    try {
      const query = `
        DELETE FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]
        WHERE ID = @id AND Prunit_Id = @prunitId
      `;

      const result = await this.pool.request()
        .input('id', id)
        .input('prunitId', prunitId)
        .query(query);

      return result.rowsAffected[0] > 0;
    } catch (error) {
      logger.error('Ошибка при удалении записи:', error);
      throw error;
    }
  }

  /**
   * Получить текстовое описание типа единицы хранения
   * @param {number} typeId - ID типа единицы хранения
   * @returns {Object} Объект с полным названием и кратким обозначением
   */
  getPrunitTypeText(typeId) {
    return this.prunitTypes[typeId] || this.prunitTypes[0];
  }

  /**
   * Получение списка единиц хранения для артикула
   */
  async getStorageUnits(productId) {
    try {
      logger.info('Начало поиска по productId:', productId);

      const query = `
        SELECT * FROM OPENQUERY(OW,
          'SELECT
            id,
            prunit_type_id,
            COALESCE(parent_qnt, 0) as parent_qnt,
            COALESCE(product_qnt, 0) as product_qnt,
            product_id
          FROM wms.prunit
          WHERE product_id = ''${productId}''
          AND rec_state = ''1'''
        )
      `;

      logger.info('SQL запрос:', query);

      const result = await this.pool.request().query(query);
      logger.info(`Получено записей: ${result.recordset.length}`);

      // Добавляем текстовое описание к каждой записи
      const records = result.recordset.map(record => {
        // Получаем тип из справочника по PRUNIT_TYPE_ID
        const typeId = parseInt(record.PRUNIT_TYPE_ID);
        const typeInfo = this.getPrunitTypeText(typeId);

        logger.info('Тип единицы хранения:', {
          typeId,
          originalValue: record.PRUNIT_TYPE_ID,
          typeInfo
        });

        return {
          id: record.ID,
          type: typeId,
          typeName: typeInfo.name,
          brief: typeInfo.brief,
          parentQnt: parseFloat(record.PARENT_QNT) || 0,
          productQnt: parseFloat(record.PRODUCT_QNT) || 0,
          productId: record.PRODUCT_ID
        };
      });

      return records;
    } catch (error) {
      logger.error('Ошибка при поиске по productId:', error);
      throw error;
    }
  }

  /**
   * Получение адресов комплектации для артикула
   */
  async getPickingLocations(productId) {
    try {
      const query = `
        SELECT * FROM OPENQUERY(OW,
          'SELECT
            id_scklad,
            name_scklad
          FROM wms.x_Storage_Full_Info
          WHERE id = ''${productId}''
          AND id_scklad NOT LIKE ''BUFFER%''
          GROUP BY id_scklad, name_scklad'
        )
      `;

      const result = await this.pool.request().query(query);
      return result.recordset;
    } catch (error) {
      logger.error('Error in getPickingLocations:', error);
      throw error;
    }
  }

  /**
   * Получение остатков в буфере
   */
  async getBufferStock(productId) {
    try {
      const query = `
        SELECT
          ID,
          Prunit_Id,
          Product_QNT,
          Place_QNT,
          Condition_State,
          Expiration_Date,
          id_scklad,
          WR_SHK
        FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]
        WHERE ID = @productId
        AND id_scklad LIKE 'BUFFER%'
        ORDER BY Expiration_Date DESC
      `;

      const result = await this.pool.request()
        .input('productId', productId)
        .query(query);

      return result.recordset;
    } catch (error) {
      logger.error('Ошибка при получении остатков в буфере:', error);
      throw error;
    }
  }

  /**
   * Проверка наличия товара в указанной ячейке
   */
  async getExistingItemInLocation(productId, prunitId, wrShk, idScklad) {
    try {
      logger.info('Проверка наличия товара в ячейке:', { productId, prunitId, wrShk, idScklad });

      const query = `
        SELECT
          ID,
          Prunit_Id,
          Product_QNT,
          Place_QNT,
          Condition_State,
          Expiration_Date,
          id_scklad,
          WR_SHK
        FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]
        WHERE ID = @productId
        AND Prunit_Id = @prunitId
        AND WR_SHK = @wrShk
        AND id_scklad = @idScklad
      `;

      const result = await this.pool.request()
        .input('productId', productId)
        .input('prunitId', prunitId)
        .input('wrShk', wrShk)
        .input('idScklad', idScklad)
        .query(query);

      logger.info(`Найдено записей: ${result.recordset.length}`);

      return result.recordset;
    } catch (error) {
      logger.error('Ошибка при проверке наличия товара в ячейке:', error);
      throw error;
    }
  }

  async findItems(article) {
    try {
      logger.info('Начало выполнения findItems');
      logger.info('Поиск по артикулу:', article);

      const query = `
        SELECT * FROM OPENQUERY(OW,
          'SELECT
            a.id,
            a.name,
            a.PIECE_GTIN as shk,
            a.article_id_real,
            a.qnt_in_pallet
          FROM wms.article a
          WHERE CAST(a.id AS VARCHAR) = ''${article}''
          AND a.article_id_real = a.id'
        )
      `;

      logger.info('Выполняемый SQL запрос:', query);
      const result = await this.pool.request().query(query);
      logger.info(`Получено записей: ${result.recordset.length}`);
      logger.info('Результаты поиска:', JSON.stringify(result.recordset));

      return result.recordset;
    } catch (error) {
      logger.error('Ошибка в findItems:', error);
      throw error;
    }
  }

  async pickFromLocation(data) {
    try {
      const { productId, locationId, prunitId, quantity, executor } = data;

      logger.info('Забор товара из ячейки:', JSON.stringify(data));

      // Проверяем наличие товара в указанной ячейке
      const query = `
        SELECT * FROM OPENQUERY(OW,
          'SELECT
            id,
            name,
            article_id_real as article,
            PIECE_GTIN as shk,
            prunit_id,
            prunit_name,
            product_qnt,
            place_qnt,
            id_scklad,
            name_scklad
          FROM wms.x_Storage_Full_Info
          WHERE id = ''${productId}''
          AND id_scklad = ''${locationId}''
          AND prunit_id = ''${prunitId}'''
        )
      `;

      logger.info('SQL запрос для проверки наличия товара:', query);
      const result = await this.pool.request().query(query);

      if (result.recordset.length === 0) {
        logger.warn('Товар не найден в указанной ячейке');
        return null;
      }

      const item = result.recordset[0];

      // Проверяем достаточное количество
      if (item.product_qnt < quantity) {
        logger.warn(`Недостаточное количество товара: доступно ${item.product_qnt}, запрошено ${quantity}`);
        return { error: 'insufficient_quantity', available: item.product_qnt };
      }

      const newQuantity = item.product_qnt - quantity;

      if (newQuantity <= 0) {
        // Если количество становится нулевым или отрицательным, удаляем запись
        logger.info('Количество товара стало нулевым, удаляем запись');

        const deleteQuery = `
          DELETE FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]
          WHERE ID = @productId
          AND Prunit_Id = @prunitId
          AND id_scklad = @locationId
        `;

        logger.info('SQL запрос для удаления записи:', deleteQuery);
        await this.pool.request()
          .input('productId', productId)
          .input('prunitId', prunitId)
          .input('locationId', locationId)
          .query(deleteQuery);
      } else {
        // Обновляем количество товара в ячейке
        const updateQuery = `
          EXEC OW.wms.sp_UpdateStorageQuantity
            @ProductId = '${productId}',
            @LocationId = '${locationId}',
            @PrunitId = '${prunitId}',
            @Quantity = ${newQuantity},
            @Executor = '${executor}'
        `;

        logger.info('SQL запрос для обновления количества:', updateQuery);
        await this.pool.request().query(updateQuery);
      }

      return {
        id: productId,
        locationId: locationId,
        prunitId: prunitId,
        name: item.name,
        article: item.article,
        shk: item.shk,
        previousQuantity: item.product_qnt,
        newQuantity: newQuantity,
        pickedQuantity: quantity,
        isDeleted: newQuantity <= 0
      };
    } catch (error) {
      logger.error('Error in pickFromLocation:', error);
      throw error;
    }
  }

  /**
   * Получение списка товаров в ячейке
   */
  async getLocationItems(locationId) {
    try {
      logger.info(`Получение списка товаров в ячейке: ${locationId}`);

      const query = `
        SELECT * FROM OPENQUERY(OW,
          'SELECT
            id,
            name,
            article_id_real as article,
            PIECE_GTIN as shk,
            prunit_id,
            prunit_name,
            product_qnt,
            place_qnt,
            id_scklad,
            name_scklad,
            condition_state,
            expiration_date,
            start_expiration_date,
            end_expiration_date
          FROM wms.x_Storage_Full_Info
          WHERE id_scklad = ''${locationId}''
          AND product_qnt > 0
          ORDER BY name'
        )
      `;

      logger.info('SQL запрос для получения товаров в ячейке:', query);
      const result = await this.pool.request().query(query);
      logger.info(`Получено записей: ${result.recordset.length}`);

      return result.recordset;
    } catch (error) {
      logger.error('Error in getLocationItems:', error);
      throw error;
    }
  }

  /**
   * Получение списка ячеек, в которых хранится товар
   */
  async getArticleLocations(article) {
    try {
      logger.info(`Получение списка ячеек для товара: ${article}`);

      const query = `
        SELECT * FROM OPENQUERY(OW,
          'SELECT
            id,
            name,
            article_id_real as article,
            PIECE_GTIN as shk,
            prunit_id,
            prunit_name,
            product_qnt,
            place_qnt,
            id_scklad,
            name_scklad,
            condition_state,
            expiration_date,
            start_expiration_date,
            end_expiration_date
          FROM wms.x_Storage_Full_Info
          WHERE id = ''${article}''
          AND product_qnt > 0
          ORDER BY id_scklad'
        )
      `;

      logger.info('SQL запрос для получения ячеек товара:', query);
      const result = await this.pool.request().query(query);
      logger.info(`Получено записей: ${result.recordset.length}`);

      return result.recordset;
    } catch (error) {
      logger.error('Error in getArticleLocations:', error);
      throw error;
    }
  }

  /**
   * Очистка ячейки (установка нулевого количества для всех товаров)
   */
  async clearLocation(locationId, executor) {
    try {
      logger.info(`Очистка ячейки: ${locationId}, исполнитель: ${executor}`);

      // Сначала получаем список товаров в ячейке
      const items = await this.getLocationItems(locationId);

      if (items.length === 0) {
        logger.info(`Ячейка ${locationId} пуста`);
        return { success: true, message: 'Ячейка пуста', clearedItems: [] };
      }

      // Обнуляем количество каждого товара
      const clearedItems = [];

      for (const item of items) {
        const updateQuery = `
          EXEC OW.wms.sp_UpdateStorageQuantity
            @ProductId = '${item.id}',
            @LocationId = '${locationId}',
            @PrunitId = '${item.prunit_id}',
            @Quantity = 0,
            @Executor = '${executor}'
        `;

        logger.info('SQL запрос для обнуления количества:', updateQuery);
        await this.pool.request().query(updateQuery);

        clearedItems.push({
          id: item.id,
          name: item.name,
          article: item.article,
          shk: item.shk,
          prunitId: item.prunit_id,
          prunitName: item.prunit_name,
          previousQuantity: item.product_qnt,
          newQuantity: 0
        });
      }

      return { success: true, message: 'Ячейка очищена', clearedItems };
    } catch (error) {
      logger.error('Error in clearLocation:', error);
      throw error;
    }
  }

  /**
   * Обновление данных инвентаризации
   */
  async updateInventory(data) {
    try {
      const { productId, locationId, prunitId, quantity, conditionState, expirationDate, executor } = data;

      logger.info('Обновление данных инвентаризации:', JSON.stringify(data));

      // Проверяем наличие товара в указанной ячейке
      const checkQuery = `
        SELECT * FROM OPENQUERY(OW,
          'SELECT
            id,
            name,
            article_id_real as article,
            PIECE_GTIN as shk,
            prunit_id,
            prunit_name,
            product_qnt,
            place_qnt,
            id_scklad,
            name_scklad
          FROM wms.x_Storage_Full_Info
          WHERE id = ''${productId}''
          AND id_scklad = ''${locationId}''
          AND prunit_id = ''${prunitId}'''
        )
      `;

      logger.info('SQL запрос для проверки наличия товара:', checkQuery);
      const checkResult = await this.pool.request().query(checkQuery);

      let previousQuantity = 0;
      let isNewItem = false;

      if (checkResult.recordset.length === 0) {
        // Товар не найден в ячейке, это новая запись
        isNewItem = true;

        // Получаем информацию о товаре
        const productQuery = `
          SELECT * FROM OPENQUERY(OW,
            'SELECT
              id,
              name,
              article_id_real as article,
              PIECE_GTIN as shk
            FROM wms.article
            WHERE id = ''${productId}'''
          )
        `;

        logger.info('SQL запрос для получения информации о товаре:', productQuery);
        const productResult = await this.pool.request().query(productQuery);

        if (productResult.recordset.length === 0) {
          logger.warn(`Товар с ID ${productId} не найден`);
          return null;
        }
      } else {
        previousQuantity = checkResult.recordset[0].product_qnt;
      }

      // Обновляем или создаем запись
      const updateQuery = `
        EXEC OW.wms.sp_UpdateInventory
          @ProductId = '${productId}',
          @LocationId = '${locationId}',
          @PrunitId = '${prunitId}',
          @Quantity = ${quantity},
          @ConditionState = '${conditionState || 'кондиция'}',
          @ExpirationDate = ${expirationDate ? `'${expirationDate}'` : 'NULL'},
          @Executor = '${executor}'
      `;

      logger.info('SQL запрос для обновления инвентаризации:', updateQuery);
      await this.pool.request().query(updateQuery);

      return {
        id: productId,
        locationId: locationId,
        prunitId: prunitId,
        previousQuantity: previousQuantity,
        newQuantity: quantity,
        isNewItem: isNewItem
      };
    } catch (error) {
      logger.error('Error in updateInventory:', error);
      throw error;
    }
  }

  /**
   * Перемещение товара между ячейками (пятнашка)
   */
  async moveItemBetweenLocations(data) {
    try {
      const {
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
      } = data;

      logger.info('Перемещение товара между ячейками:', JSON.stringify(data));

      // Проверяем наличие товара в исходной ячейке
      const checkQuery = `
        SELECT * FROM OPENQUERY(OW,
          'SELECT
            id,
            name,
            article_id_real as article,
            PIECE_GTIN as shk,
            prunit_id,
            prunit_name,
            product_qnt,
            place_qnt,
            id_scklad,
            name_scklad,
            condition_state,
            expiration_date
          FROM wms.x_Storage_Full_Info
          WHERE id = ''${productId}''
          AND id_scklad = ''${sourceLocationId}''
          AND prunit_id = ''${prunitId}'''
        )
      `;

      logger.info('SQL запрос для проверки наличия товара в исходной ячейке:', checkQuery);
      const checkResult = await this.pool.request().query(checkQuery);

      if (checkResult.recordset.length === 0) {
        logger.warn(`Товар с ID ${productId} не найден в ячейке ${sourceLocationId}`);
        return null;
      }

      const item = checkResult.recordset[0];

      // Проверяем достаточное количество
      if (item.product_qnt < quantity) {
        logger.warn(`Недостаточное количество товара: доступно ${item.product_qnt}, запрошено ${quantity}`);
        return { error: 'insufficient_quantity', available: item.product_qnt };
      }

      // Если это полное перемещение, используем существующие значения состояния и срока годности
      const finalConditionState = isFullMove ? item.condition_state : (conditionState || item.condition_state);
      const finalExpirationDate = isFullMove ? item.expiration_date : (expirationDate || item.expiration_date);

      const newSourceQuantity = item.product_qnt - quantity;

      // 1. Обрабатываем исходную ячейку
      if (newSourceQuantity <= 0) {
        // Если количество становится нулевым или отрицательным, удаляем запись
        logger.info('Количество товара в исходной ячейке стало нулевым, удаляем запись');

        const deleteQuery = `
          DELETE FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]
          WHERE ID = @productId
          AND Prunit_Id = @prunitId
          AND id_scklad = @sourceLocationId
        `;

        logger.info('SQL запрос для удаления записи из исходной ячейки:', deleteQuery);
        await this.pool.request()
          .input('productId', productId)
          .input('prunitId', prunitId)
          .input('sourceLocationId', sourceLocationId)
          .query(deleteQuery);
      } else {
        // Уменьшаем количество в исходной ячейке
        const sourceUpdateQuery = `
          EXEC OW.wms.sp_UpdateStorageQuantity
            @ProductId = '${productId}',
            @LocationId = '${sourceLocationId}',
            @PrunitId = '${prunitId}',
            @Quantity = ${newSourceQuantity},
            @Executor = '${executor}'
        `;

        logger.info('SQL запрос для обновления количества в исходной ячейке:', sourceUpdateQuery);
        await this.pool.request().query(sourceUpdateQuery);
      }

      // 2. Проверяем наличие товара в целевой ячейке
      const targetCheckQuery = `
        SELECT * FROM OPENQUERY(OW,
          'SELECT
            id,
            product_qnt
          FROM wms.x_Storage_Full_Info
          WHERE id = ''${productId}''
          AND id_scklad = ''${targetLocationId}''
          AND prunit_id = ''${prunitId}'''
        )
      `;

      logger.info('SQL запрос для проверки наличия товара в целевой ячейке:', targetCheckQuery);
      const targetCheckResult = await this.pool.request().query(targetCheckQuery);

      let targetQuantity = 0;
      if (targetCheckResult.recordset.length > 0) {
        targetQuantity = targetCheckResult.recordset[0].product_qnt;
      }

      // 3. Добавляем или обновляем количество в целевой ячейке
      const targetUpdateQuery = `
        EXEC OW.wms.sp_UpdateInventory
          @ProductId = '${productId}',
          @LocationId = '${targetLocationId}',
          @PrunitId = '${prunitId}',
          @Quantity = ${targetQuantity + quantity},
          @ConditionState = '${finalConditionState}',
          @ExpirationDate = ${finalExpirationDate ? `'${finalExpirationDate}'` : 'NULL'},
          @WrShk = '${targetWrShk}',
          @Executor = '${executor}'
      `;

      logger.info('SQL запрос для обновления количества в целевой ячейке:', targetUpdateQuery);
      await this.pool.request().query(targetUpdateQuery);

      return {
        id: productId,
        name: item.name,
        article: item.article,
        shk: item.shk,
        prunitId: prunitId,
        prunitName: item.prunit_name,
        sourceLocationId: sourceLocationId,
        targetLocationId: targetLocationId,
        targetWrShk: targetWrShk,
        movedQuantity: quantity,
        sourceRemainingQuantity: newSourceQuantity,
        targetNewQuantity: targetQuantity + quantity,
        conditionState: finalConditionState,
        expirationDate: finalExpirationDate
      };
    } catch (error) {
      logger.error('Error in moveItemBetweenLocations:', error);
      throw error;
    }
  }

  /**
   * Получение детальной информации о товаре по ШК или артикулу
   */
  async getDetailedItemInfo(params) {
    try {
      const { shk, article, wrShk } = params;

      logger.info('Получение детальной информации о товаре:', JSON.stringify(params));

      let productId;
      let locationId;

      // Поиск по штрих-коду ячейки
      if (wrShk) {
        const locationQuery = `
          SELECT locationId FROM [SPOe_rc].[dbo].[x_Storage_Locations]
          WHERE WR_SHK = @wrShk
        `;

        logger.info('SQL запрос для поиска ячейки по ШК:', locationQuery);
        const locationResult = await this.pool.request()
          .input('wrShk', wrShk)
          .query(locationQuery);

        if (locationResult.recordset.length === 0) {
          logger.warn(`Ячейка с ШК ${wrShk} не найдена`);
          return null;
        }

        locationId = locationResult.recordset[0].locationId;

        // Получаем все товары в этой ячейке
        const itemsQuery = `
          SELECT p.ID, p.Name, p.Article, p.SHK, b.Product_QNT,
                 l.locationId, l.WR_SHK, b.Expiration_Date, b.conditionState,
                 b.prunitId, pt.typeName
          FROM [SPOe_rc].[dbo].[x_Storage_Full_Info] p
          LEFT JOIN [SPOe_rc].[dbo].[x_Storage_Buffer] b ON p.ID = b.productId
          LEFT JOIN [SPOe_rc].[dbo].[x_Storage_Locations] l ON b.locationId = l.locationId
          LEFT JOIN [SPOe_rc].[dbo].[x_Storage_PrunitTypes] pt ON b.prunitId = pt.prunitId
          WHERE l.locationId = @locationId AND b.Product_QNT > 0
        `;

        logger.info('SQL запрос для получения товаров в ячейке:', itemsQuery);
        const itemsResult = await this.pool.request()
          .input('locationId', locationId)
          .query(itemsQuery);

        if (itemsResult.recordset.length === 0) {
          logger.warn(`Товары в ячейке с ID ${locationId} не найдены`);
          return { locationId, items: [] };
        }

        // Группируем товары по ID
        const groupedItems = {};

        itemsResult.recordset.forEach(item => {
          if (!groupedItems[item.ID]) {
            groupedItems[item.ID] = {
              productId: item.ID,
              article: item.Article,
              name: item.Name,
              shk: item.SHK,
              productQNT: 0,
              units: [],
              locations: []
            };
          }

          // Добавляем единицу хранения, если её ещё нет
          const unitExists = groupedItems[item.ID].units.some(u => u.prunitId === item.prunitId);
          if (!unitExists) {
            groupedItems[item.ID].units.push({
              prunitId: item.prunitId,
              typeName: item.typeName,
              productQnt: 1 // Предполагаем, что это количество в единице хранения
            });
          }

          // Добавляем информацию о местоположении
          groupedItems[item.ID].locations.push({
            locationId: item.locationId,
            quantity: item.Product_QNT,
            conditionState: item.conditionState,
            expirationDate: item.Expiration_Date
          });

          // Суммируем общее количество
          groupedItems[item.ID].productQNT += item.Product_QNT;
        });

        return {
          locationId,
          wrShk,
          items: Object.values(groupedItems)
        };
      }
      // Поиск по ШК товара
      else if (shk) {
        const findByShkQuery = `
          SELECT * FROM OPENQUERY(OW,
            'SELECT
              id
            FROM wms.article
            WHERE PIECE_GTIN = ''${shk}''
            AND article_id_real = id'
          )
        `;

        logger.info('SQL запрос для поиска товара по ШК:', findByShkQuery);
        const shkResult = await this.pool.request().query(findByShkQuery);

        if (shkResult.recordset.length === 0) {
          logger.warn(`Товар с ШК ${shk} не найден`);
          return null;
        }

        productId = shkResult.recordset[0].id;
      }
      // Поиск по артикулу товара
      else if (article) {
        const findByArticleQuery = `
          SELECT * FROM OPENQUERY(OW,
            'SELECT
              id
            FROM wms.article
            WHERE id = ''${article}''
            AND article_id_real = id'
          )
        `;

        logger.info('SQL запрос для поиска товара по артикулу:', findByArticleQuery);
        const articleResult = await this.pool.request().query(findByArticleQuery);

        if (articleResult.recordset.length === 0) {
          logger.warn(`Товар с артикулом ${article} не найден`);
          return null;
        }

        productId = articleResult.recordset[0].id;
      } else {
        logger.warn('Не указан ШК, артикул или ШК ячейки');
        return null;
      }

      // Если мы нашли товар по ШК или артикулу, получаем детальную информацию
      if (productId) {
        // Получаем базовую информацию о товаре
        const basicInfoQuery = `
          SELECT * FROM OPENQUERY(OW,
            'SELECT
              id,
              name,
              article_id_real as article,
              PIECE_GTIN as shk
            FROM wms.article
            WHERE id = ''${productId}'''
          )
        `;

        logger.info('SQL запрос для получения базовой информации о товаре:', basicInfoQuery);
        const basicInfoResult = await this.pool.request().query(basicInfoQuery);

        if (basicInfoResult.recordset.length === 0) {
          logger.warn(`Базовая информация о товаре с ID ${productId} не найдена`);
          return null;
        }

        const basicInfo = basicInfoResult.recordset[0];

        // Получаем информацию о единицах хранения
        const unitsQuery = `
          SELECT p.ID, pt.prunitId, pt.typeName, p.product_qnt
          FROM [SPOe_rc].[dbo].[x_Storage_Prunits] p
          JOIN [SPOe_rc].[dbo].[x_Storage_PrunitTypes] pt ON p.prunitTypeId = pt.prunitTypeId
          WHERE p.productId = @productId
        `;

        logger.info('SQL запрос для получения информации о единицах хранения:', unitsQuery);
        const unitsResult = await this.pool.request()
          .input('productId', productId)
          .query(unitsQuery);

        const units = unitsResult.recordset.map(unit => ({
          prunitId: unit.prunitId,
          typeName: unit.typeName,
          productQnt: unit.product_qnt
        }));

        // Получаем информацию о местоположениях товара
        const locationsQuery = `
          SELECT b.locationId, l.WR_SHK, b.Product_QNT as quantity,
                 b.conditionState, b.Expiration_Date as expirationDate
          FROM [SPOe_rc].[dbo].[x_Storage_Buffer] b
          JOIN [SPOe_rc].[dbo].[x_Storage_Locations] l ON b.locationId = l.locationId
          WHERE b.productId = @productId AND b.Product_QNT > 0
        `;

        logger.info('SQL запрос для получения информации о местоположениях товара:', locationsQuery);
        const locationsResult = await this.pool.request()
          .input('productId', productId)
          .query(locationsQuery);

        const locations = locationsResult.recordset.map(loc => ({
          locationId: loc.locationId,
          wrShk: loc.WR_SHK,
          quantity: loc.quantity,
          conditionState: loc.conditionState,
          expirationDate: loc.expirationDate
        }));

        // Вычисляем общее количество товара
        const totalQuantity = locations.reduce((sum, loc) => sum + loc.quantity, 0);

        return {
          productId: basicInfo.id,
          article: basicInfo.article,
          name: basicInfo.name,
          shk: basicInfo.shk,
          productQNT: totalQuantity,
          units,
          locations
        };
      }

      return null;
    } catch (error) {
      logger.error('Error in getDetailedItemInfo:', error);
      throw error;
    }
  }

  /**
   * Получение списка всех ячеек хранения
   */
  async getAllLocations() {
    try {
      logger.info('Получение списка всех ячеек хранения');

      const query = `
        SELECT * FROM OPENQUERY(OW,
          'SELECT DISTINCT
            id_scklad as locationId,
            name_scklad as locationName
          FROM wms.x_Storage_Full_Info
          WHERE id_scklad IS NOT NULL
          ORDER BY id_scklad'
        )
      `;

      logger.info('SQL запрос для получения списка ячеек:', query);
      const result = await this.pool.request().query(query);
      logger.info(`Получено ячеек: ${result.recordset.length}`);

      return result.recordset;
    } catch (error) {
      logger.error('Error in getAllLocations:', error);
      throw error;
    }
  }

  /**
   * Регистрация некондиции
   */
  async registerDefect(data) {
    try {
      const { productId, defectReason, executor } = data;

      logger.info('Регистрация некондиции:', JSON.stringify(data));

      // Проверяем существование товара
      const checkQuery = `
        SELECT * FROM OPENQUERY(OW,
          'SELECT
            id,
            name,
            article_id_real as article
          FROM wms.article
          WHERE id = ''${productId}'''
        )
      `;

      logger.info('SQL запрос для проверки существования товара:', checkQuery);
      const checkResult = await this.pool.request().query(checkQuery);

      if (checkResult.recordset.length === 0) {
        logger.warn(`Товар с ID ${productId} не найден`);
        return null;
      }

      // Регистрируем некондицию
      const query = `
        INSERT INTO [SPOe_rc].[dbo].[x_Storage_Defects]
        (productId, defectReason, executor, registrationDate)
        VALUES
        (@productId, @defectReason, @executor, GETDATE())
      `;

      logger.info('SQL запрос для регистрации некондиции:', query);
      const result = await this.pool.request()
        .input('productId', productId)
        .input('defectReason', defectReason)
        .input('executor', executor)
        .query(query);

      return result.rowsAffected[0] > 0;
    } catch (error) {
      logger.error('Error in registerDefect:', error);
      throw error;
    }
  }

  /**
   * Получение отчета по остаткам в буфере
   */
  async getBufferReport() {
    try {
      logger.info('Получение отчета по остаткам в буфере');

      const query = `
        SELECT p.ID as productId, p.Name as productName, p.Article as article, p.SHK as shk,
               b.prunitId, b.quantity,
               l.locationId, l.locationCode, b.conditionState,
               b.expirationDate, b.createdAt
        FROM [SPOe_rc].[dbo].[x_Storage_Full_Info] p
        JOIN [SPOe_rc].[dbo].[x_Storage_Buffer] b ON p.ID = b.productId
        JOIN [SPOe_rc].[dbo].[x_Storage_Locations] l ON b.locationId = l.locationId
        WHERE b.quantity > 0 AND l.isBuffer = 1
        ORDER BY p.Name, l.locationId
      `;

      logger.info('SQL запрос для получения отчета по остаткам в буфере:', query);
      const result = await this.pool.request().query(query);
      logger.info(`Получено записей: ${result.recordset.length}`);

      return result.recordset;
    } catch (error) {
      logger.error('Error in getBufferReport:', error);
      throw error;
    }
  }

  /**
   * Получение отчета по некондиции
   */
  async getDefectsReport() {
    try {
      logger.info('Получение отчета по некондиции');

      const query = `
        SELECT d.id, d.productId, p.Name as productName, p.Article as article, p.SHK as shk,
               d.defectReason, d.executor, d.registrationDate
        FROM [SPOe_rc].[dbo].[x_Storage_Defects] d
        JOIN [SPOe_rc].[dbo].[x_Storage_Full_Info] p ON d.productId = p.ID
        ORDER BY d.registrationDate DESC
      `;

      logger.info('SQL запрос для получения отчета по некондиции:', query);
      const result = await this.pool.request().query(query);
      logger.info(`Получено записей: ${result.recordset.length}`);

      return result.recordset;
    } catch (error) {
      logger.error('Error in getDefectsReport:', error);
      throw error;
    }
  }

  /**
   * Получение отчета по инвентаризациям
   */
  async getInventoryReport() {
    try {
      logger.info('Получение отчета по инвентаризациям');

      const query = `
        SELECT i.id, i.productId, p.Name as productName, p.Article as article, p.SHK as shk,
               i.locationId, l.WR_SHK as wrShk, i.prunitId, pt.typeName as prunitName,
               i.previousQuantity, i.newQuantity, i.executor, i.inventoryDate
        FROM [SPOe_rc].[dbo].[x_Storage_Inventory] i
        JOIN [SPOe_rc].[dbo].[x_Storage_Full_Info] p ON i.productId = p.ID
        JOIN [SPOe_rc].[dbo].[x_Storage_Locations] l ON i.locationId = l.locationId
        JOIN [SPOe_rc].[dbo].[x_Storage_PrunitTypes] pt ON i.prunitId = pt.prunitId
        ORDER BY i.inventoryDate DESC
      `;

      logger.info('SQL запрос для получения отчета по инвентаризациям:', query);
      const result = await this.pool.request().query(query);
      logger.info(`Получено записей: ${result.recordset.length}`);

      return result.recordset;
    } catch (error) {
      logger.error('Error in getInventoryReport:', error);
      throw error;
    }
  }
}

module.exports = StorageRepository;
