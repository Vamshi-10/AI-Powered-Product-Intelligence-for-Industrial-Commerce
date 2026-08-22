"""
Excel (XLSX / XLS) Input Adapter for Industrial Commerce
Parses multi-sheet Excel workbooks, normalizes columns, and converts rows into CanonicalProductRecords.
"""

import os
import sys
import io
import re
import pandas as pd
from typing import List, Dict, Any, Optional, Union

_current_dir = os.path.dirname(os.path.abspath(__file__))
_pkg_dir = os.path.dirname(_current_dir)
if _pkg_dir not in sys.path:
    sys.path.insert(0, _pkg_dir)

from canonical_schema import CanonicalProductRecord, SourceMetadata, CanonicalProduct
from adapters.csv_adapter import HEADER_ALIASES
from parsers.catalog_parser import PLACEHOLDER_VALUES


class XLSXAdapter:
    """
    Ingests Excel spreadsheets and converts all sheets into CanonicalProductRecords.
    """

    def parse(
        self,
        input_data: Union[str, bytes, io.IOBase],
        filename: Optional[str] = None,
        sheet_name: Optional[Union[str, int]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[CanonicalProductRecord]:
        """
        Parses XLSX/XLS workbook across all sheets or a specified sheet.
        """
        source_name = filename or "uploaded_catalog.xlsx"
        records: List[CanonicalProductRecord] = []

        try:
            excel_file = pd.ExcelFile(input_data)
            sheet_names = [sheet_name] if sheet_name and sheet_name in excel_file.sheet_names else excel_file.sheet_names

            for s_name in sheet_names:
                df = excel_file.parse(sheet_name=s_name, dtype=str)
                if df.empty:
                    continue

                # Strip trailing/leading whitespace in headers
                df.columns = [str(c).strip() for c in df.columns]
                col_mapping = self._detect_column_mapping(df.columns)
                mapped_cols = set(col_mapping.values())

                for idx, row in df.iterrows():
                    raw_dict = row.to_dict()
                    
                    # Check if entire row is empty
                    if all(pd.isna(v) or str(v).strip() == "" for v in raw_dict.values()):
                        continue

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

                    extra_attributes = {}
                    for col, val in raw_dict.items():
                        if col not in mapped_cols and pd.notna(val):
                            val_str = str(val).strip()
                            if val_str and val_str.upper() not in PLACEHOLDER_VALUES:
                                extra_attributes[str(col).strip()] = val_str

                    record = CanonicalProductRecord(
                        source=SourceMetadata(
                            source_type="xlsx",
                            source_name=source_name,
                            source_location=f"Sheet '{s_name}' Row {idx + 2}",
                            source_id=f"{source_name}_{s_name}_r{idx + 2}",
                            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
                    records.append(record)

            excel_file.close()

        except Exception as e:
            # If Excel parsing fails, return empty list or propagate error
            pass

        return records

    def _detect_column_mapping(self, columns: List[str]) -> Dict[str, str]:
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
