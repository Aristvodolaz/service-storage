-- Индексы для истории операций склада (/api/storage/operations) и выработки
-- НЕ ВЫПОЛНЕНА. Запускать вручную на рабочей БД в окно низкой нагрузки.
-- Откат: DROP INDEX <имя> ON <таблица>;

-- 1. Сортировка и фильтр по дате: ORDER BY executedAt DESC + диапазон дат
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_x_Storage_Operations_executedAt'
               AND object_id = OBJECT_ID('[SPOe_rc].[dbo].[x_Storage_Operations]'))
    CREATE INDEX IX_x_Storage_Operations_executedAt
        ON [SPOe_rc].[dbo].[x_Storage_Operations] (executedAt DESC)
        INCLUDE (operationType, productId, fromLocationId, toLocationId, executor);
GO

-- 2. Поиск ячеек склада по ШК: подзапрос IN (SELECT shk ... WHERE WR_House = @idSklad)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_x_Storage_Scklads_WR_House_shk'
               AND object_id = OBJECT_ID('[SPOe_rc].[dbo].[x_Storage_Scklads]'))
    CREATE INDEX IX_x_Storage_Scklads_WR_House_shk
        ON [SPOe_rc].[dbo].[x_Storage_Scklads] (WR_House, shk);
GO

-- 3. Поиск по ячейкам операции (фильтр склада по fromLocationId / toLocationId)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_x_Storage_Operations_fromLocationId'
               AND object_id = OBJECT_ID('[SPOe_rc].[dbo].[x_Storage_Operations]'))
    CREATE INDEX IX_x_Storage_Operations_fromLocationId
        ON [SPOe_rc].[dbo].[x_Storage_Operations] (fromLocationId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_x_Storage_Operations_toLocationId'
               AND object_id = OBJECT_ID('[SPOe_rc].[dbo].[x_Storage_Operations]'))
    CREATE INDEX IX_x_Storage_Operations_toLocationId
        ON [SPOe_rc].[dbo].[x_Storage_Operations] (toLocationId);
GO
