-- Хранилище ключей идемпотентности для повторно отправляемых складских операций.
-- Таблица создаётся и автоматически при первом обращении сервиса (IF OBJECT_ID ... IS NULL),
-- этот скрипт нужен, если выполнять миграцию вручную.
IF OBJECT_ID(N'dbo.api_idempotency_keys', N'U') IS NULL
CREATE TABLE dbo.api_idempotency_keys (
  idempotency_key NVARCHAR(100) NOT NULL CONSTRAINT PK_api_idempotency_keys PRIMARY KEY,
  request_hash    CHAR(64) NOT NULL,
  status_code     INT NULL,
  response_body   NVARCHAR(MAX) NULL,
  created_at      DATETIME2 NOT NULL CONSTRAINT DF_api_idempotency_created DEFAULT SYSUTCDATETIME()
);
