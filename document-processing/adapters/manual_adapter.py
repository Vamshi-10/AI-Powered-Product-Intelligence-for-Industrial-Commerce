"""
Manual Product Form Entry Adapter for Industrial Commerce
Standardizes user manual input fields into CanonicalProductRecords.
"""

import os
import sys
from typing import List, Dict, Any, Optional

_current_dir = os.path.dirname(os.path.abspath(__file__))
_pkg_dir = os.path.dirname(_current_dir)
if _pkg_dir not in sys.path:
    sys.path.insert(0, _pkg_dir)

from canonical_schema import CanonicalProductRecord, SourceMetadata, CanonicalProduct
from parsers.catalog_parser import PLACEHOLDER_VALUES


class ManualAdapter:
    """
    Ingests manual product input forms/dictionaries into CanonicalProductRecords.
    """

    def parse(
        self,
        input_data: Dict[str, Any],
        filename: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[CanonicalProductRecord]:
        """
        Parses dictionary of form values into a CanonicalProductRecord.
        """
        if not isinstance(input_data, dict):
            return []

        # Extract fields
        mpn = str(input_data.get("mpn") or input_data.get("mfg_part_num") or input_data.get("part_number") or "").strip()
        brand = str(input_data.get("brand") or input_data.get("unilog_brand") or "").strip()
        manuf = str(input_data.get("manufacturer") or input_data.get("part_manuf") or "").strip()
        desc = str(input_data.get("description") or input_data.get("part_desc") or input_data.get("product_name") or "").strip()
        category = str(input_data.get("category") or input_data.get("classpath") or "").strip()
        sku = str(input_data.get("sku") or "").strip()

        # Clean placeholders
        if brand.upper() in PLACEHOLDER_VALUES:
            brand = ""
        if manuf.upper() in PLACEHOLDER_VALUES:
            manuf = ""

        # Remaining fields treated as attributes
        attrs = {}
        for k, v in input_data.items():
            if k.lower() not in ["mpn", "mfg_part_num", "part_number", "brand", "unilog_brand", "manufacturer", "part_manuf", "description", "part_desc", "product_name", "category", "classpath", "sku"]:
                if v is not None and str(v).strip():
                    attrs[str(k).strip()] = str(v).strip()

        record = CanonicalProductRecord(
            source=SourceMetadata(
                source_type="manual",
                source_name="Manual Entry Form",
                source_location="Direct User Input",
                source_id=f"manual_{mpn or 'item'}",
                content_type="application/json"
            ),
            raw_data=input_data,
            product=CanonicalProduct(
                product_name=desc or mpn or "Manual Product",
                brand=brand,
                manufacturer=manuf,
                mpn=mpn,
                description=desc,
                category=category,
                sku=sku,
                attributes=attrs
            )
        )

        return [record]
