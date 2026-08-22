# DATA PROCESSING — Complete Implementation Plan (0% → 100%)

> **READ THIS FIRST**: This file contains EVERYTHING needed to build the Data Processing module. It parses reference files, builds lookup tables, ingests CSVs, and evaluates pipeline accuracy.

---

## 1. PROJECT CONTEXT

This module is the DATA FOUNDATION. It parses all client-provided reference files into structured lookup tables that the AI Engine consumes. It also handles CSV ingestion and evaluation.

### What this module does:
- Parse 27,000-row manufacturer/brand master list (XLSX)
- Parse 161,000-row LOV (List of Values) with classpath-specific attributes (XLSX)
- Parse 500-entry UOM standards (XLSX)
- Parse 63-entry decimal/fraction conversion table (XLSX)
- Parse content guidelines (field formulas, char limits) (DOCX)
- Ingest raw product CSVs with placeholder cleaning
- Evaluate pipeline output against ground truth

### YOUR WORK ON DAY 1 UNBLOCKS EVERYONE ELSE.

---

## 2. TECHNOLOGY STACK

```
openpyxl>=3.1.0
pandas>=2.0
pydantic>=2.0
```

Install: `pip install openpyxl pandas pydantic`

---

## 3. FOLDER STRUCTURE

```
document_processing/
├── __init__.py
├── reference_data.py        # ReferenceDataService — THE master singleton
├── csv_ingester.py          # CSV parsing + placeholder cleaning
├── parsers/
│   ├── __init__.py
│   ├── manufacturer_parser.py  # 27K-row manufacturer/brand list
│   ├── lov_parser.py           # 161K-row List of Values
│   ├── uom_parser.py           # UOM standards
│   ├── fraction_parser.py      # Decimal→fraction table
│   └── content_rules_parser.py # Content guidelines
└── evaluation/
    ├── __init__.py
    ├── evaluate.py            # Pipeline accuracy evaluator
    └── metrics.py             # Metric calculation helpers

data/
├── raw/
│   └── sample_1000_items.csv
└── reference/
    ├── UniCat_Manufacturer_and_Brand_List.xlsx
    ├── Unicat_Lov_v1_0_Updated_With_Remarks.xlsx
    ├── Unilog_Master_UOM_Standards.xlsx
    ├── Decimal_Fraction.xlsx
    ├── FAUCETS_LOV.xlsx
    ├── Fittings_LOV.xlsx
    └── UNILOG_INTERNAL_CONTENT_GUIDELINES.docx
```

---

## 4. FILE-BY-FILE IMPLEMENTATION

### File: `document_processing/__init__.py`
```python
from .reference_data import ReferenceDataService
```

### File: `document_processing/reference_data.py`

This is the MASTER SERVICE that loads all reference data and provides it to the AI Engine.

```python
class ReferenceDataService:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
            cls._instance._load_all()
        return cls._instance

    def _load_all(self):
        from .parsers.manufacturer_parser import parse_manufacturer_brand_list
        from .parsers.lov_parser import parse_lov
        from .parsers.uom_parser import parse_uom_standards
        from .parsers.fraction_parser import parse_fraction_table
        from .parsers.content_rules_parser import parse_content_rules

        self.manufacturer_brand_index = parse_manufacturer_brand_list()
        self.lov_by_classpath = parse_lov()
        self.classpath_list = list(self.lov_by_classpath.keys())
        self.uom_lookup, self.uom_set = parse_uom_standards()
        self.fraction_lookup = parse_fraction_table()
        self.content_rules = parse_content_rules()
        self.lov_values = self._build_lov_value_map()

    def _build_lov_value_map(self) -> dict:
        result = {}
        for classpath, spec in self.lov_by_classpath.items():
            for attr_name, values in spec.get("values", {}).items():
                if attr_name not in result:
                    result[attr_name] = {}
                if isinstance(values, dict):
                    result[attr_name].update(values)
                elif isinstance(values, list):
                    for v in values:
                        result[attr_name][v] = v
        return result
```

The AI Engine constructor receives this service and accesses:
- `.manufacturer_brand_index`
- `.classpath_list`
- `.lov_by_classpath`
- `.uom_lookup`
- `.uom_set`
- `.fraction_lookup`
- `.lov_values`
- `.content_rules`

### File: `document_processing/parsers/manufacturer_parser.py`

```python
import openpyxl
from shared.config.settings import REFERENCE_DIR

def parse_manufacturer_brand_list() -> dict:
    """
    Parse UniCat_Manufacturer_and_Brand_List.xlsx
    Expected columns: MANUFACTURER_NAME, MANUFACTURER_CODE, BRAND_NAME, BRAND_CODE
    
    IMPORTANT: Open the file first and inspect:
    - Which row has headers (may not be row 1)
    - Are there merged cells?
    - Are there multiple sheets?
    
    Returns: {
        "brand_names": {"FRIGIDAIRE": {"manufacturer_name": "Rheem Manufacturing", "brand_name": "FRIGIDAIRE®", ...}},
        "manufacturer_names": {"Rheem Manufacturing": ["FRIGIDAIRE®", ...]},
        "all_brand_names": ["FRIGIDAIRE", "MILWAUKEE", ...],
        "all_manufacturer_names": ["Rheem Manufacturing", ...]
    }
    """
    filepath = REFERENCE_DIR / "UniCat_Manufacturer_and_Brand_List.xlsx"
    wb = openpyxl.load_workbook(filepath, read_only=True)
    ws = wb.active

    index = {
        "brand_names": {},
        "manufacturer_names": {},
        "all_brand_names": [],
        "all_manufacturer_names": set()
    }

    # Find header row first
    header_row = 1
    for row in ws.iter_rows(min_row=1, max_row=5, values_only=True):
        if row and any("manufacturer" in str(cell).lower() for cell in row if cell):
            break
        header_row += 1

    for row in ws.iter_rows(min_row=header_row + 1, values_only=True):
        if not row or not row[0]:
            continue
        
        mfg_name = str(row[0]).strip() if row[0] else ""
        mfg_code = str(row[1]).strip() if len(row) > 1 and row[1] else ""
        brand_name = str(row[2]).strip() if len(row) > 2 and row[2] else ""
        brand_code = str(row[3]).strip() if len(row) > 3 and row[3] else ""

        if not mfg_name or not brand_name:
            continue

        # Clean brand for matching (remove ®, ™)
        clean_brand = brand_name.replace("®", "").replace("™", "").strip().upper()

        index["brand_names"][clean_brand] = {
            "manufacturer_name": mfg_name,
            "manufacturer_code": mfg_code,
            "brand_name": brand_name,
            "brand_code": brand_code,
        }

        index["manufacturer_names"].setdefault(mfg_name, []).append(brand_name)
        index["all_brand_names"].append(clean_brand)
        index["all_manufacturer_names"].add(mfg_name)

    index["all_manufacturer_names"] = list(index["all_manufacturer_names"])
    wb.close()
    return index
```

### File: `document_processing/parsers/lov_parser.py`

```python
import openpyxl
from shared.config.settings import REFERENCE_DIR

def parse_lov() -> dict:
    """
    Parse Unicat_Lov_v1_0_Updated_With_Remarks.xlsx
    ~161,000 rows
    Expected columns: Classpath, Leaf Node, Filtering, Attribute Label,
                      Attribute Values, Normalized Label, Normalized Values, Guidelines
    
    Returns: {
        "Appliances...>Dishwashers": {
            "required": ["Voltage Rating", "Mounting Type"],
            "optional": ["Sound Level", "Color"],
            "values": {
                "Mounting Type": {"Built-in": "Built-in", "Leg": "Leg"},
                "Material": {"SS": "Stainless Steel", "Stainless Steel": "Stainless Steel"}
            }
        }
    }
    """
    filepath = REFERENCE_DIR / "Unicat_Lov_v1_0_Updated_With_Remarks.xlsx"
    wb = openpyxl.load_workbook(filepath, read_only=True)
    ws = wb.active
    
    lov = {}
    
    # Find header row
    header_row = 1
    for row in ws.iter_rows(min_row=1, max_row=5, values_only=True):
        if row and any("classpath" in str(cell).lower() for cell in row if cell):
            break
        header_row += 1
    
    for row in ws.iter_rows(min_row=header_row + 1, values_only=True):
        if not row or not row[0]:
            continue
        
        classpath = str(row[0]).strip()
        filtering = str(row[2]).strip().lower() if len(row) > 2 and row[2] else ""
        attr_label = str(row[3]).strip() if len(row) > 3 and row[3] else ""
        attr_values = str(row[4]).strip() if len(row) > 4 and row[4] else ""
        norm_label = str(row[5]).strip() if len(row) > 5 and row[5] else attr_label
        norm_values = str(row[6]).strip() if len(row) > 6 and row[6] else attr_values
        
        if not classpath or not attr_label:
            continue
        
        if classpath not in lov:
            lov[classpath] = {"required": [], "optional": [], "values": {}}
        
        # Determine required vs optional
        if "required" in filtering or "mandatory" in filtering:
            if attr_label not in lov[classpath]["required"]:
                lov[classpath]["required"].append(attr_label)
        else:
            if attr_label not in lov[classpath]["optional"]:
                lov[classpath]["optional"].append(attr_label)
        
        # Build value map
        if attr_label not in lov[classpath]["values"]:
            lov[classpath]["values"][attr_label] = {}
        
        # Parse pipe-delimited values
        if attr_values:
            raw_vals = [v.strip() for v in attr_values.split("|") if v.strip()]
            norm_vals = [v.strip() for v in norm_values.split("|") if v.strip()] if norm_values else raw_vals
            
            for i, rv in enumerate(raw_vals):
                nv = norm_vals[i] if i < len(norm_vals) else rv
                lov[classpath]["values"][attr_label][rv] = nv
                lov[classpath]["values"][attr_label][rv.upper()] = nv
    
    wb.close()
    return lov
```

### File: `document_processing/parsers/uom_parser.py`

```python
import openpyxl
from shared.config.settings import REFERENCE_DIR

def parse_uom_standards() -> tuple:
    """
    Parse Unilog_Master_UOM_Standards.xlsx
    Expected columns: UOM variations, Approved abbreviation
    
    Returns:
        uom_lookup: {"inches": "in", "IN.": "in", "volts": "V", ...}
        uom_set: {"in", "ft", "V", "A", "W", "dBA", ...}
    """
    filepath = REFERENCE_DIR / "Unilog_Master_UOM_Standards.xlsx"
    wb = openpyxl.load_workbook(filepath, read_only=True)
    ws = wb.active
    
    uom_lookup = {}
    uom_set = set()
    
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row:
            continue
        # Find the approved abbreviation and all variations
        # The exact column layout varies — inspect the file!
        # Common layout: Column A = Full Name, Column B = Variations, Column C = Approved
        
        approved = None
        variations = []
        
        for cell in row:
            if cell:
                cell_str = str(cell).strip()
                if not approved:
                    # Try to identify the approved abbreviation (usually shortest)
                    variations.append(cell_str)
                    approved = cell_str  # Will be refined
        
        if approved:
            uom_set.add(approved)
            for var in variations:
                uom_lookup[var.lower()] = approved
                uom_lookup[var] = approved
    
    # Add common hardcoded mappings as fallback
    hardcoded = {
        "inches": "in", "inch": "in", "in.": "in", "in": "in", "\"": "in",
        "feet": "ft", "foot": "ft", "ft.": "ft", "ft": "ft", "'": "ft",
        "volts": "V", "volt": "V", "v": "V",
        "amps": "A", "amp": "A", "ampere": "A", "a": "A",
        "watts": "W", "watt": "W", "w": "W",
        "pounds": "lb", "pound": "lb", "lbs": "lb",
        "ounces": "oz", "ounce": "oz",
        "gallons": "gal", "gallon": "gal",
        "decibels": "dBA", "db": "dBA",
        "millimeters": "mm", "millimeter": "mm",
        "each": "EA", "piece": "EA", "pcs": "EA",
        "kelvin": "K",
        "psi": "PSI",
    }
    for k, v in hardcoded.items():
        uom_lookup.setdefault(k, v)
        uom_set.add(v)
    
    wb.close()
    return uom_lookup, uom_set
```

### File: `document_processing/parsers/fraction_parser.py`

```python
import openpyxl
from shared.config.settings import REFERENCE_DIR

def parse_fraction_table() -> dict:
    """
    Parse Decimal_Fraction.xlsx
    NOTE: This file has 4 side-by-side column pairs, not a single pair!
    Layout: Decimal | Fraction | Decimal | Fraction | Decimal | Fraction | Decimal | Fraction
    
    Returns: {0.015625: "1/64", 0.03125: "1/32", ..., 0.5: "1/2", ...}
    63 entries total.
    """
    filepath = REFERENCE_DIR / "Decimal_Fraction.xlsx"
    wb = openpyxl.load_workbook(filepath, read_only=True)
    ws = wb.active
    
    lookup = {}
    
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row:
            continue
        # Process pairs: (col0,col1), (col2,col3), (col4,col5), (col6,col7)
        for i in range(0, len(row) - 1, 2):
            decimal_val = row[i]
            fraction_val = row[i + 1] if i + 1 < len(row) else None
            
            if decimal_val is not None and fraction_val is not None:
                try:
                    dec = float(decimal_val)
                    frac = str(fraction_val).strip()
                    if frac and dec > 0:
                        lookup[round(dec, 6)] = frac
                except (ValueError, TypeError):
                    continue
    
    # Add common fractions as fallback
    fallback = {
        0.0625: "1/16", 0.125: "1/8", 0.1875: "3/16", 0.25: "1/4",
        0.3125: "5/16", 0.375: "3/8", 0.4375: "7/16", 0.5: "1/2",
        0.5625: "9/16", 0.625: "5/8", 0.6875: "11/16", 0.75: "3/4",
        0.8125: "13/16", 0.875: "7/8", 0.9375: "15/16",
    }
    for k, v in fallback.items():
        lookup.setdefault(round(k, 6), v)
    
    wb.close()
    return lookup
```

### File: `document_processing/parsers/content_rules_parser.py`

```python
def parse_content_rules() -> dict:
    """
    Parse content guidelines.
    For MVP: hardcode the known rules from the solution guide.
    Future: parse from UNILOG_INTERNAL_CONTENT_GUIDELINES.docx
    
    Returns: {
        "invoice_desc": {"max_chars": 40, "casing": "upper", "formula": "TYPE MOUNTING SPECS MATERIAL"},
        "mobile_desc": {"min_chars": 60, "max_chars": 80},
        "short_desc": {"max_chars": 150},
        "long_desc": {"max_chars": 750},
        "retail_desc": {"max_chars": 100},
    }
    """
    return {
        "invoice_desc": {
            "max_chars": 40,
            "casing": "upper",
            "formula": "PRODUCT_TYPE MOUNTING KEY_SPECS MATERIAL VOLTAGE SIZE"
        },
        "mobile_desc": {
            "min_chars": 60,
            "max_chars": 80,
            "formula": "Manufacturer Brand, Product Type, Series, MPN"
        },
        "short_desc": {
            "max_chars": 150,
            "formula": "Brand® Series MPN Product Type With [feature], Key Attributes, Material"
        },
        "long_desc": {
            "max_chars": 750,
            "formula": "Brand® Product Type, detailed description with ALL attributes"
        },
        "retail_desc": {
            "max_chars": 100,
            "formula": "Consumer-friendly description without codes"
        },
        "features": {
            "max_count": 20,
            "format": "bullet_points"
        }
    }
```

### File: `document_processing/csv_ingester.py`

```python
import csv
import io
from shared.schemas.product import RawProduct
from shared.config.settings import PLACEHOLDER_VALUES

def parse_csv(content: bytes, filename: str) -> list:
    text = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(text))
    products = []
    for row in reader:
        cleaned = {}
        for key, value in row.items():
            val = value.strip() if value else None
            if val in PLACEHOLDER_VALUES:
                val = None
            cleaned[key] = val
        products.append(RawProduct(
            mfg_part_num=cleaned.get("Mfg_Part_Num", ""),
            part_desc=cleaned.get("Part_Desc", ""),
            e1_brand=cleaned.get("E1_Brand"),
            unilog_brand=cleaned.get("Unilog_Brand"),
            dib_brand=cleaned.get("DIB_Brand"),
            part_manuf=cleaned.get("Part_Manuf"),
        ))
    return products
```

### File: `document_processing/evaluation/evaluate.py`

```python
class PipelineEvaluator:
    def __init__(self, ground_truth_path: str):
        import pandas as pd
        self.gt = pd.read_csv(ground_truth_path) if ground_truth_path.endswith('.csv') else pd.read_excel(ground_truth_path)

    def evaluate(self, predictions: list) -> dict:
        results = {
            "total_products": len(predictions),
            "manufacturer_accuracy": 0.0,
            "brand_accuracy": 0.0,
            "classification_accuracy": 0.0,
            "invoice_desc_char_compliance": 0.0,
            "invoice_desc_casing_compliance": 0.0,
            "mobile_desc_char_compliance": 0.0,
            "avg_confidence": 0.0,
            "human_review_rate": 0.0,
        }
        if not predictions:
            return results

        mfg_correct = 0
        brand_correct = 0
        class_correct = 0
        inv_char_ok = 0
        inv_case_ok = 0
        mob_char_ok = 0
        total_conf = 0
        review_count = 0

        for pred in predictions:
            p = pred if isinstance(pred, dict) else pred.model_dump()
            identity = p.get("identity", {})
            content = p.get("content", {})

            # Find matching ground truth row by MPN
            mpn = identity.get("mpn", "")
            gt_row = self.gt[self.gt["Mfg_Part_Num"] == mpn]
            if len(gt_row) > 0:
                gt = gt_row.iloc[0]
                if identity.get("manufacturer_resolved", "") == gt.get("MANUFACTURER_NAME", ""):
                    mfg_correct += 1
                if identity.get("brand_resolved", "") == gt.get("BRAND_NAME", ""):
                    brand_correct += 1
                if p.get("classification", {}).get("classpath", "") == gt.get("Classpath", ""):
                    class_correct += 1

            inv = content.get("invoice_description", "")
            if inv and len(inv) <= 40: inv_char_ok += 1
            if inv and inv == inv.upper(): inv_case_ok += 1

            mob = content.get("mobile_description", "")
            if mob and 60 <= len(mob) <= 80: mob_char_ok += 1

            total_conf += p.get("overall_confidence", 0)
            if p.get("needs_human_review"): review_count += 1

        n = len(predictions)
        results["manufacturer_accuracy"] = round(mfg_correct / n, 3)
        results["brand_accuracy"] = round(brand_correct / n, 3)
        results["classification_accuracy"] = round(class_correct / n, 3)
        results["invoice_desc_char_compliance"] = round(inv_char_ok / n, 3)
        results["invoice_desc_casing_compliance"] = round(inv_case_ok / n, 3)
        results["mobile_desc_char_compliance"] = round(mob_char_ok / n, 3)
        results["avg_confidence"] = round(total_conf / n, 3)
        results["human_review_rate"] = round(review_count / n, 3)
        return results

    def print_report(self, results: dict):
        print("\n" + "="*50)
        print("PIPELINE EVALUATION REPORT")
        print("="*50)
        for k, v in results.items():
            if isinstance(v, float):
                print(f"  {k}: {v*100:.1f}%")
            else:
                print(f"  {k}: {v}")
        print("="*50)
```

---

## 5. INTEGRATION CONTRACTS

### What this module PROVIDES to AI Engine (Member 1)

The `ReferenceDataService` instance provides:

| Property | Type | Size | Source |
|----------|------|------|--------|
| `manufacturer_brand_index` | dict | ~27K entries | UniCat_Manufacturer_and_Brand_List.xlsx |
| `classpath_list` | list[str] | ~2K entries | Derived from LOV |
| `lov_by_classpath` | dict | ~161K entries | Unicat_Lov_v1_0.xlsx |
| `uom_lookup` | dict | ~500 entries | UOM_Standards.xlsx |
| `uom_set` | set | ~89 entries | Derived from UOM |
| `fraction_lookup` | dict | 63 entries | Decimal_Fraction.xlsx |
| `lov_values` | dict | derived | Flat value map for normalizer |
| `content_rules` | dict | ~20 rules | Content guidelines |

### What this module PROVIDES to Backend (Member 2)

```python
from document_processing.csv_ingester import parse_csv
raw_products = parse_csv(file_bytes, filename)
```

---

## 6. CRITICAL WARNINGS

> **ALWAYS inspect XLSX files manually before writing parsers!**
> - Headers may not be on row 1
> - There may be merged cells
> - There may be multiple sheets
> - Column order may differ from what you expect
> - The Decimal_Fraction file has 4 side-by-side column pairs
> - The LOV file is 161K rows — use read_only=True in openpyxl

---

## 7. BUILD ORDER

| Step | Files | Test | Priority |
|------|-------|------|----------|
| 1 | `manufacturer_parser.py` | Load 27K rows, verify Frigidaire→Rheem | **DAY 1** (unblocks M1) |
| 2 | `uom_parser.py`, `fraction_parser.py` | Test "inches"→"in", 0.5→"1/2" | **DAY 1** (unblocks M1) |
| 3 | `lov_parser.py` | Load 161K rows, verify classpath count | **DAY 2** (unblocks M1) |
| 4 | `content_rules_parser.py` | Verify rules dict | DAY 2 |
| 5 | `reference_data.py` | `.get_instance()` loads all data | DAY 2 |
| 6 | `csv_ingester.py` | Parse sample CSV, verify cleaning | DAY 2 |
| 7 | `evaluation/evaluate.py` | Run on ground truth | DAY 4 |

**END OF DATA PROCESSING PLAN**
