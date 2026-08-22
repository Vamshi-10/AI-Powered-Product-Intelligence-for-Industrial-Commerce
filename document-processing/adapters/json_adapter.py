"""
JSON Input Adapter for Industrial Commerce
Parses JSON product catalogs, API payloads, single objects, and nested arrays into CanonicalProductRecords.
"""

import os
import sys
import json
import re
from typing import List, Dict, Any, Optional, Union

_current_dir = os.path.dirname(os.path.abspath(__file__))
_pkg_dir = os.path.dirname(_current_dir)
if _pkg_dir not in sys.path:
    sys.path.insert(0, _pkg_dir)

from canonical_schema import CanonicalProductRecord, SourceMetadata, CanonicalProduct
from parsers.catalog_parser import PLACEHOLDER_VALUES


class JSONAdapter:
    """
    Ingests JSON data from files, text strings, or python objects and standardizes them.
    """

    def parse(
        self,
        input_data: Union[str, bytes, Dict[str, Any], List[Any]],
        filename: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[CanonicalProductRecord]:
        """
        Parses JSON input into a list of CanonicalProductRecords.
        """
        source_name = filename or "uploaded_catalog.json"
        raw_obj = self._load_json(input_data)
        
        if raw_obj is None:
            return []

        # Find product items list or wrap single dict
        items_list = self._extract_items_list(raw_obj)
        records: List[CanonicalProductRecord] = []

        for idx, item in enumerate(items_list):
            if not isinstance(item, dict):
                continue

            record = self._convert_dict_to_record(item, source_name, idx + 1)
            records.append(record)

        return records

    def _load_json(self, input_data: Union[str, bytes, Dict[str, Any], List[Any]]) -> Optional[Union[Dict, List]]:
        if isinstance(input_data, (dict, list)):
            return input_data

        if isinstance(input_data, str):
            if os.path.isfile(input_data):
                try:
                    with open(input_data, "r", encoding="utf-8") as f:
                        return json.load(f)
                except Exception:
                    with open(input_data, "r", encoding="latin1") as f:
                        return json.load(f)
            else:
                try:
                    return json.loads(input_data)
                except Exception:
                    return None

        if isinstance(input_data, bytes):
            try:
                return json.loads(input_data.decode("utf-8"))
            except Exception:
                return json.loads(input_data.decode("latin1"))

        return None

    def _extract_items_list(self, obj: Union[Dict, List]) -> List[Dict[str, Any]]:
        if isinstance(obj, list):
            return obj

        if isinstance(obj, dict):
            # Check common container keys
            for container_key in ["products", "items", "data", "records", "catalog", "results"]:
                if container_key in obj and isinstance(obj[container_key], list):
                    return obj[container_key]
            # Otherwise, single product dictionary
            return [obj]

        return []

    def _convert_dict_to_record(self, item_dict: Dict[str, Any], source_name: str, index: int) -> CanonicalProductRecord:
        # Extract fields using dynamic keys
        mpn = str(self._find_value_by_keys(item_dict, ["mpn", "mfg_part_num", "part_number", "part_num", "model", "model_number", "partNumber", "itemNumber", "sku"]) or "").strip()
        desc = str(self._find_value_by_keys(item_dict, ["description", "part_desc", "product_description", "product_name", "title", "name", "desc", "itemDescription", "productName"]) or "").strip()
        brand = str(self._find_value_by_keys(item_dict, ["brand", "unilog_brand", "brand_name", "brandName", "trademark"]) or "").strip()
        manuf = str(self._find_value_by_keys(item_dict, ["manufacturer", "part_manuf", "manufacturer_name", "mfr", "mfg", "supplier", "vendor", "manufacturerName"]) or "").strip()
        category = str(self._find_value_by_keys(item_dict, ["category", "classpath", "product_type", "taxonomy", "dept", "itemType"]) or "").strip()
        sku = str(self._find_value_by_keys(item_dict, ["sku", "item_id", "part_number", "my_part_number"]) or "").strip()

        # Clean placeholders
        if brand.upper() in PLACEHOLDER_VALUES or brand.lower() in ["nan", "none", "null"]:
            brand = ""
        if manuf.upper() in PLACEHOLDER_VALUES or manuf.lower() in ["nan", "none", "null"]:
            manuf = ""
        if desc.lower() in ["nan", "none", "null"]:
            desc = ""
        if mpn.lower() in ["nan", "none", "null"]:
            mpn = ""

        # Extract attributes & specifications
        specs = item_dict.get("specifications", {}) or item_dict.get("specs", {}) or {}
        attrs = item_dict.get("attributes", {}) or {}
        if not isinstance(specs, dict):
            specs = {}
        if not isinstance(attrs, dict):
            attrs = {}

        combined_attributes = {**attrs, **specs}

        # Any extra top-level primitive keys
        for k, v in item_dict.items():
            if k.lower() not in ["mpn", "part_desc", "description", "brand", "manufacturer", "specifications", "attributes", "validation", "raw_data"] and isinstance(v, (str, int, float, bool)):
                combined_attributes[k] = str(v)

        return CanonicalProductRecord(
            source=SourceMetadata(
                source_type="json",
                source_name=source_name,
                source_location=f"Item #{index}",
                source_id=f"{source_name}_i{index}",
                content_type="application/json"
            ),
            raw_data={str(k): v for k, v in item_dict.items()},
            product=CanonicalProduct(
                product_name=desc or mpn,
                brand=brand,
                manufacturer=manuf,
                mpn=mpn,
                description=desc,
                category=category,
                sku=sku,
                specifications=specs,
                attributes=combined_attributes
            )
        )

    def _find_value_by_keys(self, d: Dict[str, Any], keys: List[str]) -> Any:
        # Check direct keys
        for k in keys:
            if k in d and d[k] is not None:
                return d[k]
        # Check case-insensitive
        lower_map = {k.lower(): v for k, v in d.items()}
        for k in keys:
            if k.lower() in lower_map and lower_map[k.lower()] is not None:
                return lower_map[k.lower()]
        return None
