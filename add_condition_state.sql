-- Добавление столбца Condition_State в таблицу x_Storage_Full_Info
ALTER TABLE [SPOe_rc].[dbo].[x_Storage_Full_Info] ADD Condition_State NVARCHAR(50) NULL;

-- Обновление существующих записей, установка значения по умолчанию 'кондиция'
UPDATE [SPOe_rc].[dbo].[x_Storage_Full_Info] SET Condition_State = 'кондиция' WHERE Condition_State IS NULL;
