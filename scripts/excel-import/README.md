# Перенос остатков хранения из Excel в x_Storage_Full_Info

Разовый импорт файла `Хранение ЮВ 1-41.xlsx` (склад 1383) в
`[SPOe_rc].[dbo].[x_Storage_Full_Info]` с полной заменой текущих данных.

## Порядок запуска

```bash
# 1. Excel -> mapped.json (нужен Python + openpyxl)
python parse_excel.py "C:\Users\G15\Downloads\Хранение ЮВ 1-41.xlsx"

# 2. резолв WR_SHK + бэкап + заливка в промежуточную таблицу (нужен Node, mssql)
node load.js
#   создаёт  dbo.x_Storage_Full_Info_bak_<ГГГГММДД>   (резервная копия)
#   создаёт  dbo.stg_storage_full_info_load           (подготовленные строки)
#   пишет    report.txt, unmatched.csv, negative.csv, swap.sql

# 3. (опц.) проверка промежуточной таблицы
node verify.js

# 4. ФИНАЛЬНЫЙ перенос — запускается человеком в SSMS / sqlcmd
sqlcmd -S PRM-SRV-MSSQL-01.komus.net,59587 -d SPOe_rc -U sa -i swap.sql
```

`swap.sql` выполняет `DELETE` + `INSERT` в транзакции и показывает контрольные
счётчики перед `COMMIT`.

## Откат

```bash
sqlcmd -S PRM-SRV-MSSQL-01.komus.net,59587 -d SPOe_rc -U sa -i rollback.sql
```

## Маппинг колонок Excel -> x_Storage_Full_Info

| Колонка БД              | Источник                                            |
|------------------------|-----------------------------------------------------|
| ID                     | генерируется заново: ROW_NUMBER() с 1               |
| Name                   | «Товар / Название рабочее»                          |
| Article                | «Товар #»                                           |
| SHK                    | «Товар / GTIN» (пусто -> NULL)                      |
| Product_QNT            | `'1'` («ЕХ / Влож.» в файле всегда 1)               |
| Place_QNT              | «Остаток»                                           |
| Prunit_Id / Prunit_Name| «ЕХ / Тип #» / «ЕХ / Тип Кратко»                    |
| WR_SHK                 | `x_Storage_Scklads.SHK` по имени ячейки, WR_House=1383 |
| name_wr_shk            | «Ячейка» `1383-СС.ППП.У` -> `СС-ППП-У`              |
| id_scklad              | «Склад #» (1383)                                    |
| Condition_State        | «Партия / Кондиция»: Ок->кондиция, иначе некондиция |
| Expiration_Date        | «Партия / Годен до» (ДД.ММ.ГГ -> ГГГГ-ММ-ДД), иначе 2999-01-01 |
| Start/End_Expiration_Date | 2999-01-01                                       |
| Executor               | NULL                                                |
| Create_Date/Update_Date| GETDATE()                                           |
| reason                 | `''`                                                |

Резолв ячейки повторяет логику `StorageRepository.addToBuffer` /
`moveItemBetweenLocationsV2` (справочник `x_Storage_Scklads`, фильтр по
`WR_House`), только в обратную сторону: имя ячейки -> штрихкод.
