-- Создание таблицы для логирования операций API
-- Таблица: x_API_Operation_Logs
-- Назначение: Хранение всех операций, выполняемых через API

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'x_API_Operation_Logs')
BEGIN
    CREATE TABLE x_API_Operation_Logs (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        endpoint NVARCHAR(500) NOT NULL,
        http_method NVARCHAR(10) NOT NULL,
        query_params NVARCHAR(MAX),
        body_params NVARCHAR(MAX),
        route_params NVARCHAR(MAX),
        ip_address NVARCHAR(45),
        user_agent NVARCHAR(500),
        status_code INT,
        execution_time_ms INT,
        executor NVARCHAR(100),
        operation_result NVARCHAR(20),
        error_message NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETDATE(),
        INDEX idx_created_at (created_at DESC),
        INDEX idx_endpoint (endpoint),
        INDEX idx_executor (executor),
        INDEX idx_status_code (status_code)
    );
    
    PRINT 'Таблица x_API_Operation_Logs успешно создана';
END
ELSE
BEGIN
    PRINT 'Таблица x_API_Operation_Logs уже существует';
END
GO
