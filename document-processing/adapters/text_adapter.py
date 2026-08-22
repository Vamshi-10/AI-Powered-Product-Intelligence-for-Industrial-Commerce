"""
Raw Text / Unstructured Specification Adapter for Industrial Commerce
Parses pasted text blocks, cut-sheet bullet points, and key-value specs into CanonicalProductRecords.
"""

import os
import sys
import re
from typing import List, Dict, Any, Optional, Union

_current_dir = os.path.dirname(os.path.abspath(__file__))
_pkg_dir = os.path.dirname(_current_dir)
if _pkg_dir not in sys.path:
    sys.path.insert(0, _pkg_dir)

from canonical_schema import CanonicalProductRecord, SourceMetadata, CanonicalProduct
from extractors.mpn_extractor import MPNExtractor
from extractors.brand_resolver import BrandResolver
from extractors.attribute_extractor import AttributeExtractor


class TextAdapter:
    """
    Ingests free-form technical text, specs lists, and bullet points into CanonicalProductRecords.
    """

    def __init__(self):
        self.mpn_extractor = MPNExtractor()
        self.brand_resolver = BrandResolver()
        self.attr_extractor = AttributeExtractor()

    def parse(
        self,
        input_data: str,
        filename: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[CanonicalProductRecord]:
        """
        Parses raw text blocks into CanonicalProductRecord items.
        """
        text = str(input_data or "").strip()
        if not text:
            return []

        source_name = filename or "pasted_text_input"
        lines = [l.strip() for l in text.splitlines() if l.strip()]

        # 1. Parse Key-Value pairs
        specs: Dict[str, Any] = {}
        for line in lines:
            if ":" in line:
                k, v = line.split(":", 1)
                k_clean = k.strip()
                v_clean = v.strip()
                if 2 <= len(k_clean) <= 40 and v_clean:
                    specs[k_clean.lower().replace(" ", "_")] = v_clean

        # 2. Extract MPN
        mpn_cand = specs.get("mpn") or specs.get("part_number") or specs.get("model") or specs.get("part_num") or ""
        if not mpn_cand:
            extracted_mpn, _ = self.mpn_extractor.extract_mpn("", text)
            if extracted_mpn and extracted_mpn != "UNKNOWN_MPN":
                mpn_cand = extracted_mpn

        # 3. Extract Brand candidate
        brand_cand = specs.get("brand") or specs.get("brand_name") or specs.get("manufacturer") or ""
        if not brand_cand:
            resolved = self.brand_resolver.resolve(raw_brand="", raw_manuf="", part_desc=text)
            if resolved.get("resolution_status") != "NOT_FOUND":
                brand_cand = resolved.get("canonical_brand", "")

        # 4. Extract structured attributes
        extracted_attrs = self.attr_extractor.extract_attributes(part_desc=text, mpn=mpn_cand)
        combined_attrs = {**specs, **extracted_attrs}

        # Build clean description
        desc = lines[0] if lines else text[:150]
        if len(lines) > 1 and len(desc) < 25:
            desc = f"{lines[0]} {lines[1]}"

        record = CanonicalProductRecord(
            source=SourceMetadata(
                source_type="text",
                source_name=source_name,
                source_location="Pasted Text / Specs Block",
                source_id=f"txt_{hash(text)}",
                content_type="text/plain"
            ),
            raw_data={
                "raw_text": text,
                "parsed_lines_count": len(lines),
                "parsed_specs": specs
            },
            product=CanonicalProduct(
                product_name=desc[:150],
                brand=brand_cand,
                manufacturer=specs.get("manufacturer", ""),
                mpn=mpn_cand,
                description=desc[:300],
                category=specs.get("category", specs.get("item_type", "")),
                specifications=specs,
                attributes=combined_attrs
            )
        )

        return [record]
