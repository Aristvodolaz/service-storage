const { connectToDatabase } = require('../config/database');
const StorageItem = require('../models/StorageItem');
const logger = require('../utils/logger');
const sql = require('mssql');

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
        SELECT
          l.Id_Scklad as locationId,
          l.Name_Scklad as locationName,
          l.Type_Scklad as locationType
        FROM x_Storage_Locations l
        JOIN x_Storage_Product_Locations pl ON l.Id_Scklad = pl.Location_Id
        WHERE pl.Product_Id = @productId
        AND l.Type_Scklad = 'picking'
      `;

      const request = this.pool.request();
      request.input('productId', sql.VarChar, productId);

      const result = await request.query(query);
      logger.info(`Получены адреса комплектации для товара ${productId}: ${result.recordset.length} записей`);
      return result.recordset;
    } catch (error) {
      logger.error('Ошибка при получении адресов комплектации:', error);
      throw error;
    }
  }

  /**
   * Получение остатков в буфере из x_Storage_Full_Info
   */
  async getBufferStock(productId) {
    try {
      logger.info('Получение остатков в буфере для товара:', productId);

      const query = `
        SELECT
          article as productId,
          Prunit_Id as prunitId,
          id_scklad as locationId,
          Product_QNT as quantity,
          Condition_State as conditionState,
          Expiration_Date as expirationDate,
          WR_SHK as wrShk
        FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]
        WHERE article = @productId
          AND WR_SHK IS NOT NULL
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
   * Получение отчета по остаткам в буфере из x_Storage_Full_Info
   */
  async getBufferReport() {
    try {
      logger.info('Получение отчета по остаткам в буфере');

      const query = `
        SELECT
          p.ID as productId,
          p.Name as productName,
          p.Article as article,
          p.SHK as shk,
          p.Prunit_Id as prunitId,
          p.Product_QNT as quantity,
          p.id_scklad as locationId,
          p.WR_SHK as wrShk,
          p.Condition_State as conditionState,
          p.Expiration_Date as expirationDate,
          p.Create_Date as createdAt
        FROM [SPOe_rc].[dbo].[x_Storage_Full_Info] p
        WHERE p.Product_QNT > 0 AND p.WR_SHK IS NOT NULL
        ORDER BY p.Name, p.id_scklad
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
        WHERE article = @productId
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
      const { productId, locationId, prunitId, quantity, executor, sklad_id } = data;

      logger.info('Забор товара из ячейки:', JSON.stringify(data));

      // Проверяем наличие товара в указанной ячейке
      let query = `
        SELECT
          id,
          name,
          article,
          shk,
          prunit_id,
          prunit_name,
          product_qnt,
          place_qnt,
          id_scklad,
          wr_shk,
          condition_state
        FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]
        WHERE article = @productId
        AND prunit_id = @prunitId
        AND wr_shk = @locationId
        AND (@sklad_id IS NULL AND id_scklad IS NULL OR id_scklad = @sklad_id)`;

      logger.info('SQL запрос для проверки наличия товара:', query);

      const request = this.pool.request()
        .input('productId', productId)
        .input('prunitId', prunitId)
        .input('locationId', locationId)
        .input('sklad_id', sklad_id || null);

      const result = await request.query(query);

      if (result.recordset.length === 0) {
        logger.warn('Товар не найден в указанной ячейке');
        return null;
      }

      const item = result.recordset[0];

      // Проверяем достаточное количество
      const currentQuantity = parseFloat(item.place_qnt) || 0;
      const requestedQuantity = parseFloat(quantity) || 0;

      if (currentQuantity < requestedQuantity) {
        logger.warn(`Недостаточное количество товара: доступно ${currentQuantity}, запрошено ${requestedQuantity}`);
        return { error: 'insufficient_quantity', available: currentQuantity };
      }

      const newQuantity = currentQuantity - requestedQuantity;

      if (newQuantity <= 0) {
        // Если количество становится нулевым или отрицательным, устанавливаем place_qnt = 0
        logger.info('Количество товара стало нулевым, устанавливаем place_qnt = 0');

        let updateQuery = `
          UPDATE [SPOe_rc].[dbo].[x_Storage_Full_Info]
          SET Place_QNT = 0,
              Update_Date = GETDATE(),
              Executor = @executor
          WHERE article = @productId
          AND Prunit_Id = @prunitId
          AND wr_shk = @locationId
          AND (@sklad_id IS NULL AND id_scklad IS NULL OR id_scklad = @sklad_id)`;

        logger.info('SQL запрос для обнуления количества:', updateQuery);

        const updateRequest = this.pool.request()
          .input('productId', productId)
          .input('prunitId', prunitId)
          .input('locationId', locationId)
          .input('executor', executor)
          .input('sklad_id', sklad_id || null);

        await updateRequest.query(updateQuery);
      } else {
        // Обновляем количество товара в ячейке
        // Вычитаем только из place_qnt, product_qnt остается прежним
        let updateQuery = `
          UPDATE [SPOe_rc].[dbo].[x_Storage_Full_Info]
          SET Place_QNT = @newQuantity,
              Update_Date = GETDATE(),
              Executor = @executor
          WHERE article = @productId
          AND Prunit_Id = @prunitId
          AND wr_shk = @locationId
          AND (@sklad_id IS NULL AND id_scklad IS NULL OR id_scklad = @sklad_id)`;

        logger.info('SQL запрос для обновления количества:', updateQuery);

        const updateRequest = this.pool.request()
          .input('productId', productId)
          .input('prunitId', prunitId)
          .input('locationId', locationId)
          .input('newQuantity', newQuantity)
          .input('executor', executor)
          .input('sklad_id', sklad_id || null);

        await updateRequest.query(updateQuery);
      }

      // Логируем операцию
      await this.logStorageOperation({
        operationType: 'изъятие',
        productId,
        prunitId,
        fromLocationId: locationId,
        toLocationId: null,
        quantity: requestedQuantity,
        conditionState: item.condition_state || 'кондиция',
        executor
      });

      return {
        locationId: locationId,
        prunitId: prunitId,
        name: item.name,
        article: item.article,
        shk: item.shk,
        conditionState: item.condition_state,
        previousQuantity: currentQuantity,
        newQuantity: newQuantity,
        pickedQuantity: requestedQuantity,
        isDeleted: newQuantity <= 0,
        productQnt: parseFloat(item.product_qnt) || 0
      };
    } catch (error) {
      logger.error('Error in pickFromLocation:', error);
      throw error;
    }
  }

  /**
   * Снятие товара из ячейки с учетом поля sklad_id
   */
  async pickFromLocationBySkladId(data) {
    try {
      const { productId, locationId, prunitId, quantity, executor, sklad_id } = data;

      logger.info('Забор товара из ячейки по sklad_id:', JSON.stringify(data));

      // Проверяем наличие товара в указанной ячейке
      let checkQuery = `
        SELECT ID, Name, Article, SHK, Prunit_Id, Prunit_Name, Product_QNT, Place_QNT, id_scklad, Condition_State
        FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]
        WHERE article = @productId
          AND Prunit_Id = @prunitId
          AND WR_SHK = @locationId
      `;

      // Если указан sklad_id, добавляем условие
      if (sklad_id) {
        checkQuery += ` AND id_scklad = @sklad_id`;
      }

      logger.info('SQL запрос для проверки наличия товара:', checkQuery);

      const checkRequest = this.pool.request()
        .input('productId', productId)
        .input('prunitId', prunitId)
        .input('locationId', locationId);

      if (sklad_id) {
        checkRequest.input('sklad_id', sklad_id);
      }

      const result = await checkRequest.query(checkQuery);

      if (result.recordset.length === 0) {
        logger.warn('Товар не найден в указанной ячейке');
        return null;
      }

      const item = result.recordset[0];

      // Проверяем достаточное количество
      const currentQuantity = parseFloat(item.Product_QNT) || 0;
      const requestedQuantity = parseFloat(quantity) || 0;

      if (currentQuantity < requestedQuantity) {
        logger.warn(`Недостаточное количество товара: доступно ${currentQuantity}, запрошено ${requestedQuantity}`);
        return { error: 'insufficient_quantity', available: currentQuantity };
      }

      const newQuantity = currentQuantity - requestedQuantity;

      if (newQuantity <= 0) {
        // Если количество становится нулевым или отрицательным, удаляем запись
        logger.info('Количество товара стало нулевым, удаляем запись');

        let deleteQuery = `
          DELETE FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]
          WHERE article = @productId
          AND Prunit_Id = @prunitId
          AND WR_SHK = @locationId
        `;

        // Если указан sklad_id, добавляем условие
        if (sklad_id) {
          deleteQuery += ` AND id_scklad = @sklad_id`;
        }

        logger.info('SQL запрос для удаления записи:', deleteQuery);

        const deleteRequest = this.pool.request()
          .input('productId', productId)
          .input('prunitId', prunitId)
          .input('locationId', locationId);

        if (sklad_id) {
          deleteRequest.input('sklad_id', sklad_id);
        }

        await deleteRequest.query(deleteQuery);
      } else {
        // Обновляем количество товара в ячейке
        let updateQuery = `
          UPDATE [SPOe_rc].[dbo].[x_Storage_Full_Info]
          SET Product_QNT = @newQuantity,
              Place_QNT = @newQuantity,
              Update_Date = GETDATE(),
              Executor = @executor
          WHERE article = @productId
          AND Prunit_Id = @prunitId
          AND WR_SHK = @locationId
        `;

        // Если указан sklad_id, добавляем условие
        if (sklad_id) {
          updateQuery += ` AND id_scklad = @sklad_id`;
        }

        logger.info('SQL запрос для обновления количества:', updateQuery);

        const updateRequest = this.pool.request()
          .input('productId', productId)
          .input('prunitId', prunitId)
          .input('locationId', locationId)
          .input('newQuantity', newQuantity)
          .input('executor', executor);

        if (sklad_id) {
          updateRequest.input('sklad_id', sklad_id);
        }

        await updateRequest.query(updateQuery);
      }

      // Логируем операцию
      await this.logStorageOperation({
        operationType: 'изъятие',
        productId,
        prunitId,
        fromLocationId: locationId,
        toLocationId: null,
        quantity: requestedQuantity,
        conditionState: item.Condition_State || 'кондиция',
        executor
      });

      return {
        locationId: locationId,
        prunitId: prunitId,
        name: item.Name,
        article: item.Article,
        shk: item.WR_SHK,
        conditionState: item.Condition_State,
        previousQuantity: currentQuantity,
        newQuantity: newQuantity,
        pickedQuantity: requestedQuantity,
        isDeleted: newQuantity <= 0
      };
    } catch (error) {
      logger.error('Error in pickFromLocationBySkladId:', error);
      throw error;
    }
  }

  /**
   * Получение списка товаров в ячейке
   */
  async getLocationItems(locationId, id_scklad) {
    try {
      logger.info(`Получение списка товаров в ячейке: ${locationId}${id_scklad ? `, склад: ${id_scklad}` : ''}`);

      // Создаем базовый запрос
      let query = `
        SELECT
          id,
          name,
          article,
          shk,
          prunit_id,
          prunit_name,
          product_qnt,
          place_qnt,
          id_scklad,
          wr_shk,
          condition_state,
          expiration_date,
          start_expiration_date,
          end_expiration_date
        FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]
        WHERE WR_SHK = @locationId
        AND product_qnt > 0
      `;

      // Добавляем условие по id_scklad, если оно указано
      if (id_scklad) {
        query += ` AND id_scklad = @id_scklad`;
      }

      query += ` ORDER BY name`;

      // Создаем параметризованный запрос
      const request = this.pool.request()
        .input('locationId', locationId);

      // Добавляем параметр id_scklad, если он указан
      if (id_scklad) {
        request.input('id_scklad', id_scklad);
      }

      logger.info('SQL запрос для получения товаров в ячейке:', query);
      const result = await request.query(query);
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
        SELECT
          id,
          name,
          article,
          shk,
          prunit_id,
          prunit_name,
          product_qnt,
          place_qnt,
          id_scklad,
          wr_shk,
          condition_state,
          expiration_date,
          start_expiration_date,
          end_expiration_date
        FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]
        WHERE article = @article
        AND product_qnt > 0
        ORDER BY id_scklad
      `;

      logger.info('SQL запрос для получения ячеек товара:', query);
      const result = await this.pool.request()
        .input('article', article)
        .query(query);
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
  async clearLocation(locationId, id_scklad, executor) {
    try {
      logger.info(`Очистка ячейки: ${locationId}${id_scklad ? `, склад: ${id_scklad}` : ''}, исполнитель: ${executor}`);

      // Сначала получаем список товаров в ячейке
      const items = await this.getLocationItems(locationId, id_scklad);

      if (items.length === 0) {
        logger.info(`Ячейка ${locationId}${id_scklad ? `, склад: ${id_scklad}` : ''} пуста`);
        return { success: true, message: 'Ячейка пуста', clearedItems: [] };
      }

      // Обнуляем количество каждого товара
      const clearedItems = [];

      for (const item of items) {
        // Формируем запрос с учетом id_scklad
        let updateQuery = `
          EXEC OW.wms.sp_UpdateStorageQuantity
            @ProductId = '${item.id}',
            @LocationId = '${locationId}',
            @PrunitId = '${item.prunit_id}',
            @Quantity = 0,
            @Executor = '${executor}'`;

        // Добавляем параметр @SkladId, если id_scklad указан
        if (id_scklad) {
          updateQuery += `,
            @SkladId = '${id_scklad}'`;
        }

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
   * Логирование операции в x_Storage_Operations
   */
  async logStorageOperation(data) {
    try {
      logger.info('Логирование операции:', JSON.stringify(data));

      const query = `
        INSERT INTO [SPOe_rc].[dbo].[x_Storage_Operations]
        (operationType, productId, prunitId, fromLocationId, toLocationId,
         quantity, expirationDate, conditionState, executor, executedAt)
        VALUES
        (@operationType, @productId, @prunitId, @fromLocationId, @toLocationId,
         @quantity, @expirationDate, @conditionState, @executor, GETDATE())
      `;

      const request = this.pool.request()
        .input('operationType', data.operationType)
        .input('productId', data.productId)
        .input('prunitId', data.prunitId)
        .input('fromLocationId', sql.NVarChar, data.fromLocationId ? data.fromLocationId.toString() : null)
        .input('toLocationId', sql.NVarChar, data.toLocationId ? data.toLocationId.toString() : null)
        .input('quantity', data.quantity)
        .input('conditionState', data.conditionState)
        .input('executor', data.executor);

      if (data.expirationDate) {
        request.input('expirationDate', data.expirationDate);
      } else {
        request.input('expirationDate', null);
      }

      const result = await request.query(query);
      return result.rowsAffected[0] > 0;
    } catch (error) {
      logger.error('Ошибка при логировании операции:', error);
      // Не выбрасываем ошибку, чтобы не прерывать основную операцию
      return false;
    }
  }

  /**
   * Добавление товара в буфер
   */
  async addToBuffer(data) {
    try {
      logger.info('Добавление товара в буфер:', JSON.stringify(data));

      // Определяем prunit_name из справочника
      const prunitInfo = this.prunitTypes[data.prunitId] || this.prunitTypes[0];
      const prunitName = prunitInfo.name;

      logger.info(`Определен тип единицы хранения: ${prunitName} для prunitId: ${data.prunitId}`);

      // Проверяем существование записи по article
      const checkQuery = `
        SELECT ID, Product_QNT, Place_QNT
        FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]
        WHERE Article = @article
        AND Prunit_Id = @prunitId
        AND WR_SHK = @wrShk
        AND (@idScklad IS NULL AND id_scklad IS NULL OR id_scklad = @idScklad)
      `;

      const checkResult = await this.pool.request()
        .input('article', data.article)
        .input('prunitId', data.prunitId)
        .input('wrShk', data.wrShk)
        .input('idScklad', data.sklad_id || null)
        .query(checkQuery);

      // Если найдена точно такая же запись - обновляем её
      if (checkResult.recordset.length > 0) {
        logger.info('Найдена существующая запись с точным совпадением, обновляем количество');

        const updateQuery = `
          UPDATE [SPOe_rc].[dbo].[x_Storage_Full_Info]
          SET Product_QNT = Product_QNT + @quantity,
              Place_QNT = Place_QNT + @quantity,
              Condition_State = @conditionState,
              Expiration_Date = COALESCE(@expirationDate, Expiration_Date),
              Executor = @executor,
              Prunit_Name = @prunitName,
              Update_Date = GETDATE()
          WHERE Article = @article
          AND Prunit_Id = @prunitId
          AND WR_SHK = @wrShk
          AND (@idScklad IS NULL AND id_scklad IS NULL OR id_scklad = @idScklad)
        `;

        const updateResult = await this.pool.request()
          .input('article', data.article)
          .input('prunitId', data.prunitId)
          .input('quantity', data.quantity)
          .input('wrShk', data.wrShk)
          .input('idScklad', data.sklad_id || null)
          .input('expirationDate', data.expirationDate || null)
          .input('conditionState', data.conditionState || 'кондиция')
          .input('executor', data.executor)
          .input('prunitName', prunitName)
          .query(updateQuery);

        logger.info(`Обновлена существующая запись в буфере. Затронуто строк: ${updateResult.rowsAffected[0]}`);
        return updateResult.rowsAffected[0] > 0;
      }

      // Если точного совпадения нет - создаем новую запись с новым ID
      logger.info('Точное совпадение не найдено, создаем новую запись');

      // Получаем максимальный ID из таблицы
      const getMaxIdQuery = `
        SELECT MAX(CAST(ID as INT)) as maxId
        FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]
      `;

      const maxIdResult = await this.pool.request().query(getMaxIdQuery);
      const maxId = maxIdResult.recordset[0].maxId || 0;
      const newId = (maxId + 1).toString();

      logger.info(`Генерируем новый ID: ${newId}`);

      const insertQuery = `
        INSERT INTO [SPOe_rc].[dbo].[x_Storage_Full_Info]
        (ID, Name, Article, SHK, Product_QNT, Place_QNT, Prunit_Name, Prunit_Id,
         WR_SHK, id_scklad, Expiration_Date, Condition_State, Executor, Create_Date)
        VALUES
        (@newId, @name, @article, @shk, @quantity, @quantity, @prunitName, @prunitId,
         @wrShk, @idScklad, @expirationDate, @conditionState, @executor, GETDATE())
      `;

      const insertResult = await this.pool.request()
        .input('newId', newId)
        .input('name', data.name || '')
        .input('article', data.article || '')
        .input('shk', data.shk || '')
        .input('quantity', data.quantity)
        .input('prunitId', data.prunitId)
        .input('prunitName', prunitName)
        .input('wrShk', data.wrShk)
        .input('idScklad', data.sklad_id || null)
        .input('expirationDate', data.expirationDate || null)
        .input('conditionState', data.conditionState || 'кондиция')
        .input('executor', data.executor)
        .query(insertQuery);

      logger.info(`Добавлена новая запись в буфер с ID ${newId}. Затронуто строк: ${insertResult.rowsAffected[0]}`);
      return insertResult.rowsAffected[0] > 0;
    } catch (error) {
      logger.error('Ошибка при добавлении товара в буфер:', error);
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

      // Получаем информацию о ячейке
      const locationQuery = `
        SELECT DISTINCT
          WR_SHK as locationId,
          id_scklad as skladId,
          COUNT(*) OVER() as totalItems,
          SUM(product_qnt) OVER() as totalQuantity,
          COUNT(DISTINCT article) OVER() as uniqueArticles
        FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]
        WHERE WR_SHK = @locationId
        ${id_scklad ? 'AND id_scklad = @id_scklad' : ''}
        AND product_qnt > 0
      `;

      const locationRequest = this.pool.request()
        .input('locationId', locationId);

      if (id_scklad) {
        locationRequest.input('id_scklad', id_scklad);
      }

      logger.info('SQL запрос для получения информации о ячейке:', locationQuery);
      const locationResult = await locationRequest.query(locationQuery);

      if (locationResult.recordset.length === 0) {
        logger.warn(`Ячейка ${locationId} не найдена или пуста`);
        return {
          locationId,
          skladId: id_scklad || null,
          totalItems: 0,
          totalQuantity: 0,
          uniqueArticles: 0,
          items: []
        };
      }

      const locationInfo = locationResult.recordset[0];

      // Получаем список товаров в ячейке
      const items = await this.getLocationItems(locationId, id_scklad);

      // Группируем товары по артикулу для статистики
      const articleGroups = {};
      items.forEach(item => {
        if (!articleGroups[item.article]) {
          articleGroups[item.article] = {
            article: item.article,
            name: item.name,
            totalQuantity: 0,
            units: []
          };
        }

        articleGroups[item.article].totalQuantity += parseFloat(item.place_qnt) || 0;
        articleGroups[item.article].units.push({
          prunitId: item.prunit_id,
          prunitName: item.prunit_name,
          quantity: parseFloat(item.place_qnt) || 0,
          conditionState: item.condition_state,
          expirationDate: item.expiration_date
        });
      });

      return {
        locationId: locationInfo.locationId,
        skladId: locationInfo.skladId,
        totalItems: locationInfo.totalItems,
        totalQuantity: locationInfo.totalQuantity,
        uniqueArticles: locationInfo.uniqueArticles,
        items: items,
        articleGroups: Object.values(articleGroups)
      };
    } catch (error) {
      logger.error('Error in getLocationDetails:', error);
      throw error;
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

      // Получаем общую информацию о товаре
      const articleQuery = `
        SELECT
          article,
          name,
          shk,
          COUNT(DISTINCT wr_shk) as totalLocations,
          SUM(product_qnt) as totalQuantity,
          COUNT(DISTINCT prunit_id) as uniqueUnits
        FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]
        WHERE article = @article
        AND product_qnt > 0
        GROUP BY article, name, shk
      `;

      logger.info('SQL запрос для получения информации о товаре:', articleQuery);
      const articleResult = await this.pool.request()
        .input('article', article)
        .query(articleQuery);

      if (articleResult.recordset.length === 0) {
        logger.warn(`Товар с артикулом ${article} не найден`);
        return {
          article,
          totalLocations: 0,
          totalQuantity: 0,
          uniqueUnits: 0,
          locations: []
        };
      }

      const articleInfo = articleResult.recordset[0];

      // Получаем список ячеек, где хранится товар
      const locations = await this.getArticleLocations(article);

      // Группируем по ячейкам
      const locationGroups = {};
      locations.forEach(item => {
        const locationKey = `${item.wr_shk}_${item.id_scklad || 'null'}`;

        if (!locationGroups[locationKey]) {
          locationGroups[locationKey] = {
            locationId: item.wr_shk,
            skladId: item.id_scklad,
            totalQuantity: 0,
            units: []
          };
        }

        locationGroups[locationKey].totalQuantity += parseFloat(item.place_qnt) || 0;
        locationGroups[locationKey].units.push({
          prunitId: item.prunit_id,
          prunitName: item.prunit_name,
          quantity: parseFloat(item.place_qnt) || 0,
          conditionState: item.condition_state,
          expirationDate: item.expiration_date
        });
      });

      // Группируем по единицам хранения
      const unitGroups = {};
      locations.forEach(item => {
        if (!unitGroups[item.prunit_id]) {
          unitGroups[item.prunit_id] = {
            prunitId: item.prunit_id,
            prunitName: item.prunit_name,
            totalQuantity: 0,
            locations: []
          };
        }

        unitGroups[item.prunit_id].totalQuantity += parseFloat(item.place_qnt) || 0;

        // Проверяем, есть ли уже такая ячейка в списке
        const existingLocation = unitGroups[item.prunit_id].locations.find(
          loc => loc.locationId === item.wr_shk && loc.skladId === item.id_scklad
        );

        if (existingLocation) {
          existingLocation.quantity += parseFloat(item.place_qnt) || 0;
        } else {
          unitGroups[item.prunit_id].locations.push({
            locationId: item.wr_shk,
            skladId: item.id_scklad,
            quantity: parseFloat(item.place_qnt) || 0,
            conditionState: item.condition_state
          });
        }
      });

      return {
        article: articleInfo.article,
        name: articleInfo.name,
        shk: articleInfo.shk,
        totalLocations: articleInfo.totalLocations,
        totalQuantity: articleInfo.totalQuantity,
        uniqueUnits: articleInfo.uniqueUnits,
        locations: locations,
        locationGroups: Object.values(locationGroups),
        unitGroups: Object.values(unitGroups)
      };
    } catch (error) {
      logger.error('Error in getArticleDetails:', error);
      throw error;
    }
  }

  /**
   * Создание записи инвентаризации
   * @param {Object} data - Данные инвентаризации
   * @returns {Promise<Object>} - Результат создания записи
   */
  async createInventoryRecord(data) {
    try {
      logger.info('Создание записи инвентаризации:', JSON.stringify(data));

      const query = `
        INSERT INTO [SPOe_rc].[dbo].[x_Storage_Inventory]
        (location_id, article, prunit_id, system_quantity, actual_quantity,
         difference, executor, inventory_date, status, notes, id_scklad)
        VALUES
        (@locationId, @article, @prunitId, @systemQuantity, @actualQuantity,
         @difference, @executor, GETDATE(), @status, @notes, @idScklad)
      `;

      const result = await this.pool.request()
        .input('locationId', data.locationId)
        .input('article', data.article)
        .input('prunitId', data.prunitId)
        .input('systemQuantity', data.systemQuantity)
        .input('actualQuantity', data.actualQuantity)
        .input('difference', data.difference)
        .input('executor', data.executor)
        .input('status', data.status)
        .input('notes', data.notes || null)
        .input('idScklad', data.idScklad || null)
        .query(query);

      logger.info(`Запись инвентаризации создана. Затронуто строк: ${result.rowsAffected[0]}`);
      return result.rowsAffected[0] > 0;
    } catch (error) {
      logger.error('Ошибка при создании записи инвентаризации:', error);
      throw error;
    }
  }

  /**
   * Выполнение инвентаризации ячейки
   * @param {Object} data - Данные инвентаризации
   * @returns {Promise<Object>} - Результат инвентаризации
   */
  async performInventory(data) {
    try {
      const { locationId, items, executor, idScklad, updateQuantities } = data;

      logger.info(`Выполнение инвентаризации ячейки: ${locationId}${idScklad ? `, склад: ${idScklad}` : ''}`);
      logger.info(`Исполнитель: ${executor}, Обновлять количества: ${updateQuantities}`);

      // Получаем текущие данные о товарах в ячейке
      const currentItems = await this.getLocationItems(locationId, idScklad);

      if (currentItems.length === 0 && items.length === 0) {
        logger.info(`Ячейка ${locationId} пуста и в инвентаризации нет товаров`);
        return {
          locationId,
          idScklad,
          status: 'completed',
          message: 'Ячейка пуста и в инвентаризации нет товаров',
          inventoryResults: []
        };
      }

      // Создаем словарь текущих товаров для быстрого поиска
      const currentItemsMap = {};
      currentItems.forEach(item => {
        const key = `${item.article}_${item.prunit_id}`;
        currentItemsMap[key] = item;
      });

      // Обрабатываем каждый товар из инвентаризации
      const inventoryResults = [];
      const updatePromises = [];

      for (const item of items) {
        const key = `${item.article}_${item.prunitId}`;
        const currentItem = currentItemsMap[key];

        // Определяем системное количество (0, если товара нет в системе)
        const systemQuantity = currentItem ? parseFloat(currentItem.place_qnt) || 0 : 0;
        const actualQuantity = parseFloat(item.quantity) || 0;
        const difference = actualQuantity - systemQuantity;

        // Определяем статус инвентаризации
        let status = 'match'; // По умолчанию - совпадение
        if (difference > 0) {
          status = 'surplus'; // Излишек
        } else if (difference < 0) {
          status = 'shortage'; // Недостача
        } else if (!currentItem && actualQuantity === 0) {
          status = 'not_found'; // Товар не найден в системе и не обнаружен при инвентаризации
        }

        // Создаем запись инвентаризации
        const inventoryRecord = {
          locationId,
          article: item.article,
          prunitId: item.prunitId,
          systemQuantity,
          actualQuantity,
          difference,
          executor,
          status,
          notes: item.notes,
          idScklad
        };

        // Добавляем запись в результаты
        inventoryResults.push({
          article: item.article,
          name: currentItem ? currentItem.name : item.name || 'Неизвестный товар',
          prunitId: item.prunitId,
          prunitName: currentItem ? currentItem.prunit_name : this.getPrunitTypeText(item.prunitId).name,
          systemQuantity,
          actualQuantity,
          difference,
          status,
          notes: item.notes
        });

        // Создаем запись в таблице инвентаризации
        await this.createInventoryRecord(inventoryRecord);

        // Если нужно обновить количества и есть расхождения
        if (updateQuantities && difference !== 0) {
          if (currentItem) {
            // Товар существует - обновляем количество
            if (actualQuantity > 0) {
              // Обновляем количество
              const updateQuery = `
                UPDATE [SPOe_rc].[dbo].[x_Storage_Full_Info]
                SET Place_QNT = @actualQuantity,
                    Update_Date = GETDATE(),
                    Executor = @executor
                WHERE article = @article
                AND Prunit_Id = @prunitId
                AND WR_SHK = @locationId
                AND (@idScklad IS NULL AND id_scklad IS NULL OR id_scklad = @idScklad)
              `;

              updatePromises.push(
                this.pool.request()
                  .input('article', item.article)
                  .input('prunitId', item.prunitId)
                  .input('locationId', locationId)
                  .input('actualQuantity', actualQuantity)
                  .input('executor', executor)
                  .input('idScklad', idScklad || null)
                  .query(updateQuery)
              );

              // Логируем операцию
              await this.logStorageOperation({
                operationType: 'инвентаризация',
                productId: item.article,
                prunitId: item.prunitId,
                fromLocationId: locationId,
                toLocationId: null,
                quantity: difference,
                conditionState: currentItem.condition_state || 'кондиция',
                executor
              });
            } else {
              // Если фактическое количество 0, устанавливаем place_qnt = 0
              const updateQuery = `
                UPDATE [SPOe_rc].[dbo].[x_Storage_Full_Info]
                SET Place_QNT = 0,
                    Update_Date = GETDATE(),
                    Executor = @executor
                WHERE article = @article
                AND Prunit_Id = @prunitId
                AND WR_SHK = @locationId
                AND (@idScklad IS NULL AND id_scklad IS NULL OR id_scklad = @idScklad)
              `;

              updatePromises.push(
                this.pool.request()
                  .input('article', item.article)
                  .input('prunitId', item.prunitId)
                  .input('locationId', locationId)
                  .input('executor', executor)
                  .input('idScklad', idScklad || null)
                  .query(updateQuery)
              );

              // Логируем операцию
              await this.logStorageOperation({
                operationType: 'инвентаризация',
                productId: item.article,
                prunitId: item.prunitId,
                fromLocationId: locationId,
                toLocationId: null,
                quantity: -systemQuantity,
                conditionState: currentItem.condition_state || 'кондиция',
                executor
              });
            }
          } else if (actualQuantity > 0) {
            // Товар не существует, но обнаружен при инвентаризации - создаем новую запись
            // Получаем максимальный ID из таблицы
            const getMaxIdQuery = `
              SELECT MAX(CAST(ID as INT)) as maxId
              FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]
            `;

            const maxIdResult = await this.pool.request().query(getMaxIdQuery);
            const maxId = maxIdResult.recordset[0].maxId || 0;
            const newId = (maxId + 1).toString();

            // Определяем prunit_name из справочника
            const prunitInfo = this.prunitTypes[item.prunitId] || this.prunitTypes[0];
            const prunitName = prunitInfo.name;

            const insertQuery = `
              INSERT INTO [SPOe_rc].[dbo].[x_Storage_Full_Info]
              (ID, Name, Article, SHK, Product_QNT, Place_QNT, Prunit_Name, Prunit_Id,
               WR_SHK, id_scklad, Condition_State, Executor, Create_Date)
              VALUES
              (@newId, @name, @article, @shk, @quantity, @quantity, @prunitName, @prunitId,
               @wrShk, @idScklad, @conditionState, @executor, GETDATE())
            `;

            updatePromises.push(
              this.pool.request()
                .input('newId', newId)
                .input('name', item.name || 'Добавлено при инвентаризации')
                .input('article', item.article)
                .input('shk', item.shk || '')
                .input('quantity', quantity)
                .input('prunitName', prunitName)
                .input('prunitId', item.prunitId)
                .input('wrShk', locationId)
                .input('idScklad', idScklad || null)
                .input('conditionState', item.conditionState || 'кондиция')
                .input('executor', executor)
                .query(insertQuery)
            );

            // Логируем операцию
            await this.logStorageOperation({
              operationType: 'инвентаризация_добавление',
              productId: item.article,
              prunitId: item.prunitId,
              fromLocationId: null,
              toLocationId: locationId,
              quantity: quantity,
              conditionState: item.conditionState || 'кондиция',
              executor
            });
          }
        }
      }

      // Проверяем товары, которые есть в системе, но не указаны в инвентаризации
      for (const currentItem of currentItems) {
        const key = `${currentItem.article}_${currentItem.prunit_id}`;
        const found = items.some(item => `${item.article}_${item.prunitId}` === key);

        if (!found) {
          // Товар есть в системе, но не указан в инвентаризации
          const systemQuantity = parseFloat(currentItem.place_qnt) || 0;

          // Создаем запись инвентаризации
          const inventoryRecord = {
            locationId,
            article: currentItem.article,
            prunitId: currentItem.prunit_id,
            systemQuantity,
            actualQuantity: 0, // Предполагаем, что товара нет, так как он не указан
            difference: -systemQuantity,
            executor,
            status: 'missing', // Товар не указан в инвентаризации
            notes: 'Товар не указан при инвентаризации',
            idScklad
          };

          // Добавляем запись в результаты
          inventoryResults.push({
            article: currentItem.article,
            name: currentItem.name,
            prunitId: currentItem.prunit_id,
            prunitName: currentItem.prunit_name,
            systemQuantity,
            actualQuantity: 0,
            difference: -systemQuantity,
            status: 'missing',
            notes: 'Товар не указан при инвентаризации'
          });

          // Создаем запись в таблице инвентаризации
          await this.createInventoryRecord(inventoryRecord);

          // Если нужно обновить количества
          if (updateQuantities) {
            // Устанавливаем place_qnt = 0
            const updateQuery = `
              UPDATE [SPOe_rc].[dbo].[x_Storage_Full_Info]
              SET Place_QNT = 0,
                  Update_Date = GETDATE(),
                  Executor = @executor
              WHERE article = @article
              AND Prunit_Id = @prunitId
              AND WR_SHK = @locationId
              AND (@idScklad IS NULL AND id_scklad IS NULL OR id_scklad = @idScklad)
            `;

            updatePromises.push(
              this.pool.request()
                .input('article', currentItem.article)
                .input('prunitId', currentItem.prunit_id)
                .input('locationId', locationId)
                .input('executor', executor)
                .input('idScklad', idScklad || null)
                .query(updateQuery)
            );

            // Логируем операцию
            await this.logStorageOperation({
              operationType: 'инвентаризация',
              productId: currentItem.article,
              prunitId: currentItem.prunit_id,
              fromLocationId: locationId,
              toLocationId: null,
              quantity: -systemQuantity,
              conditionState: currentItem.condition_state || 'кондиция',
              executor
            });
          }
        }
      }

      // Выполняем все обновления
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }

      // Определяем общий статус инвентаризации
      let overallStatus = 'match';
      if (inventoryResults.some(r => r.status === 'surplus' || r.status === 'shortage' || r.status === 'missing')) {
        overallStatus = 'discrepancy';
      }

      return {
        locationId,
        idScklad,
        status: overallStatus,
        message: overallStatus === 'match' ? 'Инвентаризация завершена без расхождений' : 'Инвентаризация завершена с расхождениями',
        inventoryResults
      };
    } catch (error) {
      logger.error('Ошибка при выполнении инвентаризации:', error);
      throw error;
    }
  }

  /**
   * Получение истории инвентаризаций
   * @param {Object} params - Параметры запроса
   * @returns {Promise<Array>} - История инвентаризаций
   */
  async getInventoryHistory(params = {}) {
    try {
      const { locationId, article, startDate, endDate, executor, status, limit } = params;

      logger.info('Получение истории инвентаризаций с параметрами:', JSON.stringify(params));

      let query = `
        SELECT
          i.id,
          i.location_id,
          i.article,
          i.prunit_id,
          i.system_quantity,
          i.actual_quantity,
          i.difference,
          i.executor,
          i.inventory_date,
          i.status,
          i.notes,
          i.id_scklad,
          p.name as product_name,
          p.prunit_name
        FROM [SPOe_rc].[dbo].[x_Storage_Inventory] i
        LEFT JOIN [SPOe_rc].[dbo].[x_Storage_Full_Info] p
          ON i.article = p.article AND i.prunit_id = p.prunit_id
        WHERE 1=1
      `;

      const request = this.pool.request();

      // Добавляем фильтры
      if (locationId) {
        query += ` AND i.location_id = @locationId`;
        request.input('locationId', locationId);
      }

      if (article) {
        query += ` AND i.article = @article`;
        request.input('article', article);
      }

      if (startDate) {
        query += ` AND i.inventory_date >= @startDate`;
        request.input('startDate', new Date(startDate));
      }

      if (endDate) {
        query += ` AND i.inventory_date <= @endDate`;
        request.input('endDate', new Date(endDate));
      }

      if (executor) {
        query += ` AND i.executor = @executor`;
        request.input('executor', executor);
      }

      if (status) {
        query += ` AND i.status = @status`;
        request.input('status', status);
      }

      // Сортировка по дате (сначала новые)
      query += ` ORDER BY i.inventory_date DESC`;

      // Ограничение количества записей
      if (limit) {
        query += ` OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY`;
        request.input('limit', limit);
      }

      logger.info('SQL запрос для получения истории инвентаризаций:', query);
      const result = await request.query(query);
      logger.info(`Получено записей: ${result.recordset.length}`);

      return result.recordset;
    } catch (error) {
      logger.error('Ошибка при получении истории инвентаризаций:', error);
      throw error;
    }
  }

  /**
   * Перемещение товара между ячейками (улучшенная версия)
   * @param {Object} params - Параметры перемещения
   * @returns {Promise<Object>} - Результат перемещения
   */
  async moveItemBetweenLocationsV2(params) {
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
        isFullMove,
        id_sklad
      } = params;

      // Используем targetWrShk, если он указан, иначе используем targetLocationId
      const actualTargetWrShk = targetWrShk || targetLocationId;

      // Проверяем, что исходная и целевая ячейки не совпадают
      if (sourceLocationId === actualTargetWrShk) {
        return {
          error: 'same_location',
          msg: 'Исходная и целевая ячейки не могут совпадать'
        };
      }

      // Проверяем обязательные параметры
      if (!productId || !sourceLocationId || !actualTargetWrShk || !prunitId) {
        return {
          error: 'missing_params',
          msg: 'Не указаны обязательные параметры для перемещения'
        };
      }

      // Получаем информацию о товаре в исходной ячейке
      const sourceQuery = `
        SELECT * FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]
        WHERE Article = @productId
        AND Prunit_Id = @prunitId
        AND WR_SHK = @sourceLocationId
        AND ((@idScklad IS NULL AND id_scklad IS NULL) OR id_scklad = @idScklad)
      `;

      const sourceResult = await this.pool.request()
        .input('productId', productId)
        .input('prunitId', prunitId)
        .input('sourceLocationId', sourceLocationId)
        .input('idScklad', id_sklad)
        .query(sourceQuery);

      if (sourceResult.recordset.length === 0) {
        return {
          error: 'not_found',
          msg: 'Товар не найден в исходной ячейке'
        };
      }

      const sourceItem = sourceResult.recordset[0];
      const sourceQuantity = parseFloat(sourceItem.Place_QNT) || 0;
      const requestedQuantity = parseFloat(quantity) || 0;

      if (sourceQuantity < requestedQuantity) {
        return {
          error: 'insufficient_quantity',
          available: sourceQuantity,
          msg: `Недостаточное количество товара. Доступно: ${sourceQuantity}, запрошено: ${requestedQuantity}`
        };
      }

      // Проверяем, есть ли товар с такими же параметрами в целевой ячейке
      const targetQuery = `
        SELECT * FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]
        WHERE Article = @productId
        AND Prunit_Id = @prunitId
        AND WR_SHK = @targetLocationId
        AND ((@idScklad IS NULL AND id_scklad IS NULL) OR id_scklad = @idScklad)
      `;

      const targetResult = await this.pool.request()
        .input('productId', productId)
        .input('prunitId', prunitId)
        .input('targetLocationId', actualTargetWrShk)
        .input('idScklad', id_sklad || sourceItem.id_scklad)
        .query(targetQuery);

      // Начинаем транзакцию
      const transaction = new sql.Transaction(this.pool);
      await transaction.begin();

      try {
        // Обновляем количество в исходной ячейке
        const newSourceQuantity = sourceQuantity - requestedQuantity;
        const updateSourceQuery = `
          UPDATE [SPOe_rc].[dbo].[x_Storage_Full_Info]
          SET Place_QNT = @newQuantity,
              Update_Date = GETDATE(),
              Executor = @executor
          WHERE ID = @id
        `;

        await new sql.Request(transaction)
          .input('newQuantity', newSourceQuantity)
          .input('executor', executor)
          .input('id', sourceItem.ID)
          .query(updateSourceQuery);

        let targetItem;
        let isNewRecord = false;

        if (targetResult.recordset.length > 0) {
          // Товар с такими параметрами уже есть в целевой ячейке - обновляем количество
          targetItem = targetResult.recordset[0];
          const targetQuantity = parseFloat(targetItem.Place_QNT) || 0;
          const newTargetQuantity = targetQuantity + requestedQuantity;

          const updateTargetQuery = `
            UPDATE [SPOe_rc].[dbo].[x_Storage_Full_Info]
            SET Place_QNT = @newQuantity,
                Product_QNT = @productQnt,
                Update_Date = GETDATE(),
                Executor = @executor
            WHERE ID = @id
          `;

          await new sql.Request(transaction)
            .input('newQuantity', newTargetQuantity)
            .input('productQnt', parseFloat(targetItem.Product_QNT) + requestedQuantity)
            .input('executor', executor)
            .input('id', targetItem.ID)
            .query(updateTargetQuery);
        } else {
          // Товара с такими параметрами нет в целевой ячейке - создаем новую запись
          isNewRecord = true;

          // Получаем максимальный ID из таблицы
          const getMaxIdQuery = `
            SELECT MAX(CAST(ID as INT)) as maxId
            FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]
          `;

          const maxIdResult = await new sql.Request(transaction).query(getMaxIdQuery);
          const maxId = maxIdResult.recordset[0].maxId || 0;
          const newId = (maxId + 1).toString();

          const insertTargetQuery = `
            INSERT INTO [SPOe_rc].[dbo].[x_Storage_Full_Info]
            (ID, Name, Article, SHK, Product_QNT, Place_QNT, Prunit_Name, Prunit_Id,
             WR_SHK, id_scklad, Condition_State, Expiration_Date, Executor, Create_Date)
            VALUES
            (@newId, @name, @article, @shk, @quantity, @quantity, @prunitName, @prunitId,
             @wrShk, @idScklad, @conditionState, @expirationDate, @executor, GETDATE())
          `;

          await new sql.Request(transaction)
            .input('newId', newId)
            .input('name', sourceItem.Name)
            .input('article', productId)
            .input('shk', sourceItem.SHK)
            .input('quantity', requestedQuantity)
            .input('prunitName', sourceItem.Prunit_Name)
            .input('prunitId', prunitId)
            .input('wrShk', actualTargetWrShk)
            .input('idScklad', id_sklad || sourceItem.id_scklad)
            .input('conditionState', conditionState || sourceItem.Condition_State || 'кондиция')
            .input('expirationDate', expirationDate ? new Date(expirationDate) : sourceItem.Expiration_Date)
            .input('executor', executor)
            .query(insertTargetQuery);

          targetItem = {
            ID: newId,
            Name: sourceItem.Name,
            Article: productId,
            SHK: sourceItem.SHK,
            Product_QNT: requestedQuantity,
            Place_QNT: requestedQuantity,
            Prunit_Name: sourceItem.Prunit_Name,
            Prunit_Id: prunitId,
            WR_SHK: actualTargetWrShk,
            id_scklad: id_sklad || sourceItem.id_scklad,
            Condition_State: conditionState || sourceItem.Condition_State || 'кондиция',
            Expiration_Date: expirationDate ? new Date(expirationDate) : sourceItem.Expiration_Date
          };
        }

        // Завершаем транзакцию
        await transaction.commit();

        return {
          success: true,
          sourceItem: {
            id: sourceItem.ID,
            name: sourceItem.Name,
            article: sourceItem.Article,
            shk: sourceItem.SHK,
            previousQuantity: sourceQuantity,
            newQuantity: newSourceQuantity,
            prunitId: sourceItem.Prunit_Id,
            prunitName: sourceItem.Prunit_Name
          },
          targetItem: {
            id: targetItem.ID,
            name: targetItem.Name,
            article: targetItem.Article,
            shk: targetItem.SHK,
            previousQuantity: isNewRecord ? 0 : parseFloat(targetItem.Place_QNT) || 0,
            newQuantity: isNewRecord ? requestedQuantity : (parseFloat(targetItem.Place_QNT) || 0) + requestedQuantity,
            prunitId: targetItem.Prunit_Id,
            prunitName: targetItem.Prunit_Name,
            isNewRecord
          },
          conditionState: targetItem.Condition_State,
          expirationDate: targetItem.Expiration_Date
        };
      } catch (error) {
        // В случае ошибки откатываем транзакцию
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Логирование операции со складом в рамках транзакции
   */
  async logStorageOperationWithTransaction(transaction, data) {
    try {
      const {
        operationType,
        productId,
        prunitId,
        fromLocationId,
        toLocationId,
        quantity,
        conditionState,
        executor
      } = data;

      // Преобразуем штрих-коды ячеек в строки, чтобы избежать переполнения int
      const query = `
        INSERT INTO [SPOe_rc].[dbo].[x_Storage_Operations_Log]
        (operation_type, product_id, prunit_id, from_location_id, to_location_id, quantity, condition_state, executor, operation_date)
        VALUES
        (@operationType, @productId, @prunitId, @fromLocationId, @toLocationId, @quantity, @conditionState, @executor, GETDATE())
      `;

      logger.info('Логирование операции перемещения:', JSON.stringify({
        operationType,
        productId,
        prunitId,
        fromLocationId: fromLocationId ? fromLocationId.toString() : null,
        toLocationId: toLocationId ? toLocationId.toString() : null,
        quantity,
        conditionState,
        executor
      }));

      await new sql.Request(transaction)
        .input('operationType', operationType)
        .input('productId', productId)
        .input('prunitId', prunitId)
        .input('fromLocationId', sql.NVarChar, fromLocationId ? fromLocationId.toString() : null)
        .input('toLocationId', sql.NVarChar, toLocationId ? toLocationId.toString() : null)
        .input('quantity', quantity)
        .input('conditionState', conditionState)
        .input('executor', executor)
        .query(query);

      return true;
    } catch (error) {
      logger.error('Ошибка при логировании операции со складом:', error);
      throw error;
    }
  }

  /**
   * Получение информации о товаре по артикулу или ШК с фильтрацией по id_sklad
   * @param {Object} params - Параметры запроса
   * @param {string} params.article - Артикул товара (опционально)
   * @param {string} params.shk - Штрих-код товара (опционально)
   * @param {string} params.id_sklad - ID склада (опционально)
   * @returns {Promise<Array>} - Массив записей о товаре
   */
  async getArticleInfoBySklad(params) {
    try {
      const { article, shk, id_sklad } = params;

      // Проверяем, что указан хотя бы один параметр для поиска
      if (!article && !shk) {
        return {
          error: 'missing_params',
          msg: 'Необходимо указать артикул или штрих-код товара'
        };
      }

      let query = `
        SELECT *
        FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]
        WHERE 1=1
      `;

      const request = this.pool.request();

      // Добавляем условия поиска
      if (article) {
        query += ` AND Article = @article`;
        request.input('article', article);
      }

      if (shk) {
        query += ` AND SHK = @shk`;
        request.input('shk', shk);
      }

      // Добавляем фильтрацию по id_sklad, если указан
      if (id_sklad) {
        query += ` AND id_scklad = @id_sklad`;
        request.input('id_sklad', id_sklad);
      }

      // Сортировка по ячейке и дате
      query += ` ORDER BY WR_SHK, Create_Date DESC`;

      const result = await request.query(query);

      return result.recordset.map(item => ({
        id: item.ID,
        name: item.Name,
        article: item.Article,
        shk: item.SHK,
        productQnt: parseFloat(item.Product_QNT) || 0,
        placeQnt: parseFloat(item.Place_QNT) || 0,
        prunitId: item.Prunit_Id,
        prunitName: item.Prunit_Name,
        wrShk: item.WR_SHK,
        idScklad: item.id_scklad,
        conditionState: item.Condition_State,
        expirationDate: item.Expiration_Date,
        createDate: item.Create_Date,
        updateDate: item.Update_Date,
        executor: item.Executor
      }));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Получение списка пустых ячеек
   * @param {Object} params - Параметры запроса
   * @param {string} params.id_sklad - ID склада (WR_House) для фильтрации (опционально)
   * @returns {Promise<Array>} - Массив пустых ячеек
   */
  async getEmptyCells(params = {}) {
    try {
      const { id_sklad } = params;

      let query = `
        SELECT s.[ID], s.[Name], s.[SHK], s.[WR_House]
        FROM [SPOe_rc].[dbo].[x_Storage_Scklads] s
        WHERE NOT EXISTS (
          SELECT 1
          FROM [SPOe_rc].[dbo].[x_Storage_Full_Info] i
          WHERE i.WR_SHK = s.SHK
          AND i.Place_QNT > 0
        )
      `;

      // Добавляем фильтрацию по WR_House, если указан id_sklad
      if (id_sklad) {
        query += ` AND s.[WR_House] = @id_sklad`;
      }

      query += ` ORDER BY s.[WR_House], s.[Name]`;

      const request = this.pool.request();

      if (id_sklad) {
        request.input('id_sklad', id_sklad);
      }

      const result = await request.query(query);

      return result.recordset.map(item => ({
        id: item.ID,
        name: item.Name,
        shk: item.SHK,
        wrHouse: item.WR_House
      }));
    } catch (error) {
      throw error;
    }
  }
}

module.exports = StorageRepository;
