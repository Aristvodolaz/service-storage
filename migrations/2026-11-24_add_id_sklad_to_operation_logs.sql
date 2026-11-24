-- Миграция: склад операции в логах API (x_API_Operation_Logs)
-- ВЫПОЛНЕНА на рабочей БД 2026-11-24 (SSMS: обновлено 434460 строк).
-- Для отката: DROP INDEX IX_x_API_Operation_Logs_id_sklad_created ON x_API_Operation_Logs; ALTER TABLE x_API_Operation_Logs DROP COLUMN id_sklad;

-- 1. Колонка склада (NULL: логи без склада остаются как есть)
IF COL_LENGTH('x_API_Operation_Logs', 'id_sklad') IS NULL
    ALTER TABLE x_API_Operation_Logs ADD id_sklad INT NULL;
GO

-- 2. Индекс под отчет: фильтр по складу и диапазону дат
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_x_API_Operation_Logs_id_sklad_created'
               AND object_id = OBJECT_ID('x_API_Operation_Logs'))
    CREATE INDEX IX_x_API_Operation_Logs_id_sklad_created
        ON x_API_Operation_Logs (id_sklad, created_at);
GO

-- 3. Заполнение склада в уже записанных логах из body_params / query_params (JSON)
-- Строки с невалидным JSON пропускаются через ISJSON.
UPDATE x_API_Operation_Logs
SET id_sklad = COALESCE(
        CASE WHEN ISJSON(body_params) = 1 THEN TRY_CAST(JSON_VALUE(body_params, '$.id_sklad') AS INT) END,
        CASE WHEN ISJSON(body_params) = 1 THEN TRY_CAST(JSON_VALUE(body_params, '$.idScklad') AS INT) END,
        CASE WHEN ISJSON(query_params) = 1 THEN TRY_CAST(JSON_VALUE(query_params, '$.id_sklad') AS INT) END)
WHERE id_sklad IS NULL;
GO
