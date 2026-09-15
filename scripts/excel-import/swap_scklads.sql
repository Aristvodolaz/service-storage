/* ================================================================
   Обновление справочника ячеек x_Storage_Scklads по складу 1383.
   Сгенерировано 2026-09-07T11:27:25.567Z
   Резервная копия: dbo.x_Storage_Scklads_bak_20260907
   ================================================================ */
SET XACT_ABORT ON;
BEGIN TRAN;

    DELETE FROM [SPOe_rc].[dbo].[x_Storage_Scklads] WHERE WR_House = '1383';

    -- 4 ячейки без BarCode (65-1-6, 65-2-6, 65-3-6, 65-4-6) пропускаем:
    -- колонка SHK NOT NULL, и для поиска они бесполезны.
    INSERT INTO [SPOe_rc].[dbo].[x_Storage_Scklads] (Name, SHK, WR_House)
    SELECT Name, SHK, WR_House
    FROM [SPOe_rc].[dbo].[stg_scklads_1383]
    WHERE SHK IS NOT NULL;

    SELECT
        (SELECT COUNT(*) FROM [SPOe_rc].[dbo].[stg_scklads_1383] WHERE SHK IS NOT NULL)        AS staging_rows,
        (SELECT COUNT(*) FROM [SPOe_rc].[dbo].[x_Storage_Scklads] WHERE WR_House='1383')       AS house_rows;

-- оба числа должны быть 39845 -> COMMIT; иначе ROLLBACK;
COMMIT;
