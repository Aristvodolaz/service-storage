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
      const query = `
        UPDATE [SPOe_rc].[dbo].[x_Storage_Full_Info]
        SET Product_QNT = @productQnt,
            Place_QNT = @placeQnt,
            Condition_State = @conditionState,
            Executor = @executor,
            id_scklad = @idScklad
        WHERE ID = @id AND Prunit_Id = @prunitId
      `;

      const result = await this.pool.request()
        .input('id', id)
        .input('prunitId', data.prunitId)
        .input('productQnt', data.productQnt)
        .input('placeQnt', data.placeQnt)
        .input('conditionState', data.conditionState)
        .input('executor', data.executor)
        .input('idScklad', data.idScklad)
        .query(query);

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
        SELECT DISTINCT id_scklad, WR_SHK
        FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]
        WHERE ID = @productId
        AND Condition_State = 'кондиция'
      `;

      const result = await this.pool.request()
        .input('productId', productId)
        .query(query);

      return result.recordset;
    } catch (error) {
      logger.error('Ошибка при получении адресов комплектации:', error);
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
}

module.exports = StorageRepository;
