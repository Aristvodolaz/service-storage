-- Добавление столбцов Update_Date и Create_Date в таблицу x_Storage_Full_Info
ALTER TABLE [SPOe_rc].[dbo].[x_Storage_Full_Info] ADD Create_Date DATETIME NULL;
ALTER TABLE [SPOe_rc].[dbo].[x_Storage_Full_Info] ADD Update_Date DATETIME NULL;

-- Обновление существующих записей, установка текущей даты
UPDATE [SPOe_rc].[dbo].[x_Storage_Full_Info] SET Create_Date = GETDATE() WHERE Create_Date IS NULL;
UPDATE [SPOe_rc].[dbo].[x_Storage_Full_Info] SET Update_Date = GETDATE() WHERE Update_Date IS NULL;
