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
          ID as productId,
          Prunit_Id as prunitId,
          id_scklad as locationId,
          Product_QNT as quantity,
          Condition_State as conditionState,
          Expiration_Date as expirationDate,
          WR_SHK as wrShk
        FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]
        WHERE ID = @productId
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
        AND prunit_id = @prunitId`;

      // Если указан sklad_id, используем его, иначе используем locationId
      if (sklad_id) {
        query += ` AND id_scklad = @sklad_id`;
      } else {
        query += ` AND wr_shk = @locationId`;
      }

      logger.info('SQL запрос для проверки наличия товара:', query);

      const request = this.pool.request()
        .input('productId', productId)
        .input('prunitId', prunitId)
        .input('locationId', locationId);

      if (sklad_id) {
        request.input('sklad_id', sklad_id);
      }

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
          WHERE ID = @productId
          AND Prunit_Id = @prunitId
        `;

        // Если указан sklad_id, используем его, иначе используем locationId
        if (sklad_id) {
          updateQuery += ` AND id_scklad = @sklad_id`;
        } else {
          updateQuery += ` AND wr_shk = @locationId`;
        }

        logger.info('SQL запрос для обнуления количества:', updateQuery);

        const updateRequest = this.pool.request()
          .input('productId', productId)
          .input('prunitId', prunitId)
          .input('locationId', locationId)
          .input('executor', executor);

        if (sklad_id) {
          updateRequest.input('sklad_id', sklad_id);
        }

        await updateRequest.query(updateQuery);
      } else {
        // Обновляем количество товара в ячейке
        // Вычитаем только из place_qnt, product_qnt остается прежним
        let updateQuery = `
          UPDATE [SPOe_rc].[dbo].[x_Storage_Full_Info]
          SET Place_QNT = @newQuantity,
              Update_Date = GETDATE(),
              Executor = @executor
          WHERE ID = @productId
          AND Prunit_Id = @prunitId
        `;

        // Если указан sklad_id, используем его, иначе используем locationId
        if (sklad_id) {
          updateQuery += ` AND id_scklad = @sklad_id`;
        } else {
          updateQuery += ` AND wr_shk = @locationId`;
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
        conditionState: item.condition_state || 'кондиция',
        executor
      });

      return {
        id: productId,
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
        WHERE ID = @productId
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
          WHERE ID = @productId
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
          WHERE ID = @productId
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
        id: productId,
        locationId: locationId,
        prunitId: prunitId,
        name: item.Name,
        article: item.Article,
        shk: item.SHK,
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
        WHERE id = @article
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
        .input('fromLocationId', data.fromLocationId)
        .input('toLocationId', data.toLocationId)
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
}

module.exports = StorageRepository;
