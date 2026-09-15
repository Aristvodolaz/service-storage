# -*- coding: utf-8 -*-
"""
Шаг 1. Парсит Excel-файл остатков хранения и раскладывает его по колонкам
таблицы [SPOe_rc].[dbo].[x_Storage_Full_Info].

Результат -> mapped.json (массив записей). Штрихкод ячейки (WR_SHK) здесь НЕ
проставляется - он резолвится на шаге 2 (load.js) через справочник
x_Storage_Scklads по имени ячейки.

Запуск:
    python parse_excel.py "C:\\path\\файл.xlsx" [out.json]
"""
import sys, os, json, re, datetime

DEFAULT_XLSX = r"C:\Users\G15\Downloads\Хранение ЮВ 1-41.xlsx"

# индексы колонок в листе Excel (0-based)
COL = {
    "calc_date": 0,      # Дата расчета
    "cell": 1,           # Хранение / Ячейка      -> name_wr_shk / WR_SHK (через справочник)
    "section": 2,        # Хранение / Секция
    "sklad": 3,          # Хранение / Склад #     -> id_scklad
    "sklad_short": 4,    # Хранение / Склад Кратко
    "batch": 5,          # Партия #
    "batch_exp": 6,      # Партия / Годен до      -> Expiration_Date
    "batch_cond": 7,     # Партия / Кондиция      -> Condition_State
    "eh": 8,             # ЕХ #
    "prunit_id": 9,      # ЕХ / Тип #             -> Prunit_Id
    "prunit_name": 10,   # ЕХ / Тип Кратко        -> Prunit_Name
    "pack_id": 11,       # ЕХ / Упак #
    "pack_name": 12,     # ЕХ / Упак Кратко
    "volume": 13,        # ЕХ / Объем (м3)
    "weight": 14,        # ЕХ / Вес (кг)
    "ostatok": 15,       # Остаток                -> Place_QNT
    "eh_nest": 16,       # ЕХ / Влож.
    "prod_stock": 17,    # Товар / Запас
    "article": 18,       # Товар #                -> Article
    "prod_exp_days": 19, # Товар / Годен (срок в днях, не дата)
    "name": 20,          # Товар / Название рабочее -> Name
    "gtin": 21,          # Товар / GTIN           -> SHK
    "tara_id": 22,       # Тара #
    "tara_name": 23,     # Тара / Наименование
    "sox": 24,           # СОХ
}

FAR_DATE = "2999-01-01"


def parse_exp(v):
    """'01.09.29' (ДД.ММ.ГГ) -> '2029-09-01'. Иначе далёкая дата."""
    if v is None:
        return FAR_DATE
    if isinstance(v, (datetime.datetime, datetime.date)):
        return v.strftime("%Y-%m-%d")
    s = str(v).strip()
    m = re.match(r"^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$", s)
    if m:
        d, mth, y = (int(x) for x in m.groups())
        if y < 100:
            y += 2000
        try:
            return datetime.date(y, mth, d).strftime("%Y-%m-%d")
        except ValueError:
            return FAR_DATE
    return FAR_DATE


def cell_name(raw):
    """'1383-01.106.5' -> ('01-106-5', section='01', pos='106', level='5').

    Формат имени совпадает с [x_Storage_Scklads].[Name] для WR_House=1383
    (напр. '04-28-6'). Возвращает None, если строка не распознана.
    """
    if raw is None:
        return None
    m = re.match(r"^\s*(\d+)-(\d+)\.(\d+)\.(\d+)\s*$", str(raw))
    if not m:
        return None
    _sklad, section, pos, level = m.groups()
    return "%s-%s-%s" % (section.zfill(2), pos, level)


def main():
    xlsx = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_XLSX
    if not os.path.exists(xlsx):
        sys.exit("Файл не найден: " + xlsx)

    import openpyxl
    wb = openpyxl.load_workbook(xlsx, read_only=True, data_only=True)
    ws = wb[wb.sheetnames[0]]

    out = []
    stats = {"total": 0, "cell_unparsed": 0, "negative_ostatok": 0,
             "nekondiciya": 0, "with_exp": 0, "no_gtin": 0}

    rows = ws.iter_rows(values_only=True)
    next(rows, None)  # заголовок
    for r in rows:
        if r is None or not any(c is not None for c in r):
            continue
        stats["total"] += 1

        def g(k):
            i = COL[k]
            return r[i] if i < len(r) else None

        raw_cell = g("cell")
        cname = cell_name(raw_cell)
        if cname is None:
            stats["cell_unparsed"] += 1

        ostatok = g("ostatok")
        try:
            place_qnt = int(round(float(ostatok)))
        except (TypeError, ValueError):
            place_qnt = 0
        if place_qnt < 0:
            stats["negative_ostatok"] += 1

        cond_src = (str(g("batch_cond")).strip() if g("batch_cond") is not None else "")
        condition = "кондиция" if cond_src.lower() in ("ок", "ok", "") else "некондиция"
        if condition == "некондиция":
            stats["nekondiciya"] += 1

        exp = parse_exp(g("batch_exp"))
        if exp != FAR_DATE:
            stats["with_exp"] += 1

        gtin = g("gtin")
        shk = str(gtin).strip() if gtin not in (None, "") else None
        if shk is None:
            stats["no_gtin"] += 1

        pid = g("prunit_id")
        try:
            pid = int(pid)
        except (TypeError, ValueError):
            pid = None

        name = g("name")
        art = g("article")

        out.append({
            "row": stats["total"],
            "name": (str(name).strip() if name is not None else None),
            "article": (str(art).strip() if art is not None else None),
            "shk": shk,
            "product_qnt": "1",                       # ЕХ / Влож. в файле всегда 1
            "place_qnt": place_qnt,                   # Остаток
            "prunit_id": pid,
            "prunit_name": (str(g("prunit_name")).strip() if g("prunit_name") is not None else None),
            "id_scklad": int(g("sklad")) if g("sklad") is not None else None,
            "cell_raw": (str(raw_cell) if raw_cell is not None else None),
            "cell_name": cname,                       # ключ для справочника x_Storage_Scklads
            "condition_state": condition,
            "expiration_date": exp,
        })

    here = os.path.dirname(os.path.abspath(__file__))
    out_name = sys.argv[2] if len(sys.argv) > 2 else "mapped.json"
    out_path = out_name if os.path.isabs(out_name) else os.path.join(here, out_name)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)

    print("Файл:            ", xlsx)
    print("Строк обработано: ", stats["total"])
    print("Ячейка не распознана:", stats["cell_unparsed"])
    print("Отрицательный остаток:", stats["negative_ostatok"])
    print("Некондиция:       ", stats["nekondiciya"])
    print("С реальным сроком годности:", stats["with_exp"])
    print("Без GTIN (SHK=NULL):", stats["no_gtin"])
    print("->", out_path)


if __name__ == "__main__":
    main()
