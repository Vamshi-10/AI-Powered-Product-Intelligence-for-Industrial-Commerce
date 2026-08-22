"""
CSV Input Adapter for Industrial Commerce
Parses CSV data from file paths, raw bytes, or text streams, normalizes dynamic headers,
and converts each row into a CanonicalProductRecord.
"""

import os
import sys
import io
import re
import csv
import pandas as pd
from typing import List, Dict, Any, Optional, Union

_current_dir = os.path.dirname(os.path.abspath(__file__))
_pkg_dir = os.path.dirname(_current_dir)
if _pkg_dir not in sys.path:
    sys.path.insert(0, _pkg_dir)

from canonical_schema import CanonicalProductRecord, SourceMetadata, CanonicalProduct
from parsers.catalog_parser import PLACEHOLDER_VALUES


# Common header alias mappings for distributor spreadsheets
HEADER_ALIASES = {
    "mpn": [
        "mfg_part_num", "part_number", "part_num", "mpn", "model_number",
        "model", "item_number", "item_num", "sku - my_part_number", "sku",
        "manufacturers_part_number", "manufacturer_part_number"
    ],
    "description": [
        "part_desc", "description", "product_description", "item_description",
        "title", "product_name", "item_name", "desc", "short_desc", "name"
    ],
    "brand": [
        "unilog_brand", "brand", "brand_name", "e1_brand", "dib_brand",
        "trademark", "trade_name"
    ],
    "manufacturer": [
        "part_manuf", "manufacturer", "manufacturer_name", "mfr", "mfg",
        "supplier", "vendor", "mfr_name"
    ],
    "category": [
        "classpath", "category", "dept", "class", "fine", "product_type",
        "taxonomy", "hierarchy"
    ],
    "sku": [
        "sku - my_part_number", "sku", "part_number", "item_id", "my_part_number"
    ]
}


class CSVAdapter:
    """
    Ingests CSV catalogs and converts records into standardized CanonicalProductRecords.
    """

    def __init__(self):
        self.supported_encodings = ["utf-8", "utf-8-sig", "latin1", "cp1252", "iso-8859-1"]

    def parse(
        self,
        input_data: Union[str, bytes, io.IOBase],
        filename: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[CanonicalProductRecord]:
        """
        Parses CSV input from file path, raw bytes, or stream.
        """
        source_name = filename or "uploaded_catalog.csv"
        df = self._read_csv_to_dataframe(input_data, source_name)
        
        if df.empty:
            return []

        # Detect column mapping
        col_mapping = self._detect_column_mapping(df.columns)
        records = []

        for idx, row in df.iterrows():
            raw_dict = row.to_dict()
            
            # Extract mapped values
            mpn = str(self._get_mapped_value(raw_dict, col_mapping.get("mpn", "")) or "").strip()
            desc = str(self._get_mapped_value(raw_dict, col_mapping.get("description", "")) or "").strip()
            brand = str(self._get_mapped_value(raw_dict, col_mapping.get("brand", "")) or "").strip()
            manuf = str(self._get_mapped_value(raw_dict, col_mapping.get("manufacturer", "")) or "").strip()
            cat = str(self._get_mapped_value(raw_dict, col_mapping.get("category", "")) or "").strip()
            sku = str(self._get_mapped_value(raw_dict, col_mapping.get("sku", "")) or "").strip()

            # Clean placeholders
            if brand.upper() in PLACEHOLDER_VALUES or brand.lower() in ["nan", "none", "null"]:
                brand = ""
            if manuf.upper() in PLACEHOLDER_VALUES or manuf.lower() in ["nan", "none", "null"]:
                manuf = ""
            if desc.lower() in ["nan", "none", "null"]:
                desc = ""
            if mpn.lower() in ["nan", "none", "null"]:
                mpn = ""

            # Extra attributes from remaining columns
            mapped_cols = set(col_mapping.values())
            extra_attributes = {}
            for col, val in raw_dict.items():
                if col not in mapped_cols and pd.notna(val):
                    val_str = str(val).strip()
                    if val_str and val_str.upper() not in PLACEHOLDER_VALUES:
                        extra_attributes[str(col).strip()] = val_str

            row_record = CanonicalProductRecord(
                source=SourceMetadata(
                    source_type="csv",
                    source_name=source_name,
                    source_location=f"Row {idx + 2}",
                    source_id=f"{source_name}_r{idx + 2}",
                    content_type="text/csv"
                ),
                raw_data={str(k): ("" if pd.isna(v) else str(v).strip()) for k, v in raw_dict.items()},
                product=CanonicalProduct(
                    product_name=desc or mpn,
                    brand=brand,
                    manufacturer=manuf,
                    mpn=mpn,
                    description=desc,
                    category=cat,
                    sku=sku,
                    attributes=extra_attributes
                )
            )
            records.append(row_record)

        return records

    def _read_csv_to_dataframe(self, input_data: Union[str, bytes, io.IOBase], source_name: str) -> pd.DataFrame:
        """Reads CSV data safely across encodings."""
        if isinstance(input_data, str) and os.path.isfile(input_data):
            for enc in self.supported_encodings:
                try:
                    return pd.read_csv(input_data, encoding=enc, dtype=str)
                except UnicodeDecodeError:
                    continue
                except Exception:
                    break
            # Fallback with error replacement
            return pd.read_csv(input_data, encoding="utf-8", errors="replace", dtype=str)

        elif isinstance(input_data, bytes):
            for enc in self.supported_encodings:
                try:
                    return pd.read_csv(io.BytesIO(input_data), encoding=enc, dtype=str)
                except UnicodeDecodeError:
                    continue
            return pd.read_csv(io.BytesIO(input_data), encoding="utf-8", errors="replace", dtype=str)

        elif hasattr(input_data, "read"):
            return pd.read_csv(input_data, dtype=str)

        elif isinstance(input_data, str):
            return pd.read_csv(io.StringIO(input_data), dtype=str)

        return pd.DataFrame()

    def _detect_column_mapping(self, columns: List[str]) -> Dict[str, str]:
        """Maps spreadsheet headers to canonical fields using alias dictionary."""
        mapping = {}
        cleaned_cols = {col: re.sub(r"[^a-z0-9]", "", str(col).lower().strip()) for col in columns}

        for field_name, aliases in HEADER_ALIASES.items():
            for alias in aliases:
                clean_alias = re.sub(r"[^a-z0-9]", "", alias)
                for orig_col, clean_col in cleaned_cols.items():
                    if clean_col == clean_alias and field_name not in mapping:
                        mapping[field_name] = orig_col
                        break
                if field_name in mapping:
                    break

        return mapping

    def _get_mapped_value(self, row_dict: Dict[str, Any], mapped_col: str) -> Any:
        if mapped_col and mapped_col in row_dict:
            val = row_dict[mapped_col]
            return "" if pd.isna(val) else val
        return ""
