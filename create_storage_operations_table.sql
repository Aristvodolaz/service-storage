-- Таблица истории складских операций (размещение / перемещение / снятие)
-- Таблица: x_Storage_Operations

IF OBJECT_ID('dbo.x_Storage_Operations', 'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[x_Storage_Operations];
    PRINT 'Старая таблица x_Storage_Operations удалена';
END
GO

CREATE TABLE [dbo].[x_Storage_Operations] (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    operationType NVARCHAR(20) NOT NULL,
    productId NVARCHAR(100) NULL,
    productName NVARCHAR(500) NULL,
    prunitId INT NULL,
    fromLocationId NVARCHAR(100) NULL,
    toLocationId NVARCHAR(100) NULL,
    quantity FLOAT NULL,
    expirationDate DATETIME NULL,
    conditionState NVARCHAR(100) NULL,
    executor NVARCHAR(100) NULL,
    executedAt DATETIME2 NOT NULL DEFAULT GETDATE()
);

CREATE INDEX idx_storage_ops_executedAt ON [dbo].[x_Storage_Operations] (executedAt DESC);
CREATE INDEX idx_storage_ops_productId ON [dbo].[x_Storage_Operations] (productId);
CREATE INDEX idx_storage_ops_type ON [dbo].[x_Storage_Operations] (operationType);
CREATE INDEX idx_storage_ops_executor ON [dbo].[x_Storage_Operations] (executor);

PRINT 'Таблица x_Storage_Operations успешно создана';
GO
