"""
Catalog Parser for Industrial Commerce
Parses CSV and Excel (.xlsx) product catalog files, cleans headers, handles merged cells/stray notes,
and eliminates placeholder values (-- Unbranded --, -- No Unilog Brand --, etc.).
"""

import os
import re
import pandas as pd
from typing import List, Dict, Any, Optional, Union


# Canonical placeholder values that represent missing data
PLACEHOLDER_VALUES = {
    "-- unbranded --",
    "-- no unilog brand --",
    "-- no dib brand --",
    "commodity - unbranded",
    "unbranded",
    "-",
    "--",
    "n/a",
    "na",
    "none",
    "null",
    "unknown",
    "-- not available --"
}


class CatalogParser:
    """
    Robust catalog parser for industrial distributor spreadsheets.
    Supports CSV and Excel (.xlsx/.xls) formats with automatic column normalization.
    """

    COLUMN_MAPPINGS = {
        "mfg_part_num": ["mfg_part_num", "mpn", "part_number", "part_num", "manufacturer_part_number", "item_number", "item_num", "sku"],
        "part_desc": ["part_desc", "description", "item_desc", "product_description", "desc", "title", "short_desc"],
        "e1_brand": ["e1_brand", "brand_e1", "supplier_brand"],
        "unilog_brand": ["unilog_brand", "canonical_brand", "brand"],
        "dib_brand": ["dib_brand", "distributor_brand"],
        "part_manuf": ["part_manuf", "manufacturer", "mfg", "mfg_name", "vendor", "vendor_name", "supplier"],
        "classpath": ["classpath", "category", "taxonomy", "class_path", "product_type"],
        "sku": ["sku", "distributor_sku", "item_code", "item_id"]
    }

    def __init__(self, placeholder_values: Optional[set] = None):
        self.placeholders = placeholder_values or PLACEHOLDER_VALUES

    def clean_cell_value(self, value: Any) -> Optional[str]:
        """Cleans cell text, strips whitespaces, and returns None if value is a placeholder."""
        if value is None or pd.isna(value):
            return None
        
        text = str(value).strip()
        if not text:
            return None
        
        # Check against placeholder list (case-insensitive)
        if text.lower() in self.placeholders:
            return None
        
        return text

    def normalize_column_name(self, col: str) -> str:
        """Normalizes a raw column header to standard snake_case."""
        cleaned = re.sub(r'[^a-zA-Z0-9_]', '_', str(col).strip().lower())
        cleaned = re.sub(r'_+', '_', cleaned).strip('_')
        
        for canonical_name, aliases in self.COLUMN_MAPPINGS.items():
            if cleaned in aliases:
                return canonical_name
        return cleaned

    def parse_file(self, file_path: str, sheet_name: Optional[Union[str, int]] = 0) -> List[Dict[str, Any]]:
        """
        Parses a CSV or Excel file and returns a list of cleaned product record dictionaries.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        ext = os.path.splitext(file_path)[1].lower()
        if ext in ['.xlsx', '.xls', '.xlsm']:
            df = pd.read_excel(file_path, sheet_name=sheet_name)
        elif ext in ['.csv', '.tsv', '.txt']:
            # Try parsing with comma first, fallback to tab or semicolon
            try:
                df = pd.read_csv(file_path, delimiter=',')
            except Exception:
                df = pd.read_csv(file_path, delimiter=None, engine='python')
        else:
            raise ValueError(f"Unsupported file format: {ext}")

        return self.parse_dataframe(df)

    def parse_dataframe(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Processes a pandas DataFrame, cleans column names, strips placeholders,
        and returns structured raw item records.
        """
        if df.empty:
            return []

        # Clean header row (detect if header starts below row 0 due to stray comments)
        if all("unnamed" in str(col).lower() for col in df.columns[:3]):
            # Find the first row that looks like headers
            for idx, row in df.iterrows():
                row_str = " ".join([str(v).lower() for v in row.values])
                if any(kw in row_str for kw in ["part", "mfg", "desc", "brand", "item"]):
                    df.columns = df.iloc[idx]
                    df = df.iloc[idx + 1:].reset_index(drop=True)
                    break

        # Map and normalize column names
        normalized_cols = [self.normalize_column_name(col) for col in df.columns]
        df.columns = normalized_cols

        records = []
        for index, row in df.iterrows():
            record: Dict[str, Any] = {
                "raw_index": index,
                "mfg_part_num": self.clean_cell_value(row.get("mfg_part_num")),
                "part_desc": self.clean_cell_value(row.get("part_desc")),
                "e1_brand": self.clean_cell_value(row.get("e1_brand")),
                "unilog_brand": self.clean_cell_value(row.get("unilog_brand")),
                "dib_brand": self.clean_cell_value(row.get("dib_brand")),
                "part_manuf": self.clean_cell_value(row.get("part_manuf")),
                "classpath": self.clean_cell_value(row.get("classpath")),
                "sku": self.clean_cell_value(row.get("sku")),
                "extra_fields": {}
            }

            # Capture any additional unmapped columns in extra_fields
            standard_keys = set(self.COLUMN_MAPPINGS.keys())
            for col in df.columns:
                if col not in standard_keys:
                    val = self.clean_cell_value(row.get(col))
                    if val is not None:
                        record["extra_fields"][col] = val

            # Filter out completely empty rows
            if any([record["mfg_part_num"], record["part_desc"], record["part_manuf"]]):
                records.append(record)

        return records
