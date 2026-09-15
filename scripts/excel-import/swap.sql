/* ================================================================
   ПЕРЕНОС остатков хранения из Excel в x_Storage_Full_Info.
   Сгенерировано 2026-08-29T14:19:59.130Z
   ПЕРЕД запуском убедитесь, что есть резервная копия dbo.x_Storage_Full_Info_bak_20260829.
   ID нумеруется заново с 1 (таблица очищается полностью).
   ================================================================ */
SET XACT_ABORT ON;
BEGIN TRAN;

    DELETE FROM [SPOe_rc].[dbo].[x_Storage_Full_Info];

    INSERT INTO [SPOe_rc].[dbo].[x_Storage_Full_Info]
        (ID, Name, Article, SHK, Product_QNT, Prunit_Name, Prunit_Id, WR_SHK, id_scklad,
         Expiration_Date, Start_Expiration_Date, End_Expiration_Date, Executor, Place_QNT,
         Condition_State, Create_Date, Update_Date, name_wr_shk, reason)
    SELECT
        ROW_NUMBER() OVER (ORDER BY s.name_wr_shk, s.Article, s.Prunit_Id) AS ID,
        s.Name, s.Article, s.SHK, s.Product_QNT, s.Prunit_Name, s.Prunit_Id, s.WR_SHK, s.id_scklad,
        s.Expiration_Date,
        CAST('2999-01-01' AS DATE), CAST('2999-01-01' AS DATE),
        s.Executor, s.Place_QNT,
        s.Condition_State, GETDATE(), GETDATE(), s.name_wr_shk, s.reason
    FROM [SPOe_rc].[dbo].[stg_storage_full_info_load] s;

    /* контроль */
    SELECT
        (SELECT COUNT(*) FROM [SPOe_rc].[dbo].[stg_storage_full_info_load])            AS staging_rows,
        (SELECT COUNT(*) FROM [SPOe_rc].[dbo].[x_Storage_Full_Info])   AS inserted_rows;

-- Проверьте числа выше. Если всё верно:
COMMIT;
-- Иначе:
-- ROLLBACK;
