"""
Multi-Tier Content & Description Builder for Industrial Commerce
Generates 5 distinct content formats strictly conforming to Unilog internal content guidelines:
1. Invoice Description (<=40 chars, ALL CAPS)
2. Mobile Description (60-80 chars)
3. Product Title / Short Description (Brand + Series + MPN + Item Type + Key specs)
4. Long Description (Complete comma-separated specification copy)
5. Structured Key-Value Taxonomy Attributes
"""

import os
import sys
import re
from typing import Dict, Any, Optional, List

_current_dir = os.path.dirname(os.path.abspath(__file__))
if _current_dir not in sys.path:
    sys.path.insert(0, _current_dir)

from extractors.uom_normalizer import UOMNormalizer
from extractors.abbreviation_expander import AbbreviationExpander


class DescriptionBuilder:
    """
    Constructs multi-length descriptions and standardized product titles for commerce channels.
    """

    def __init__(self):
        self.uom = UOMNormalizer()
        self.expander = AbbreviationExpander()

    def build_all(
        self,
        mpn: str,
        brand_info: Dict[str, Any],
        attributes: Dict[str, Any],
        raw_desc: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Builds all 5 content tiers from resolved entity and attribute data.
        """
        brand = brand_info.get("canonical_brand", "")
        clean_brand_plain = re.sub(r"[®™]", "", brand).strip()
        series = attributes.get("Series", "")
        item_type = attributes.get("Item_Type", "")
        
        # 1. Product Title
        product_title = self._build_product_title(brand, series, mpn, item_type, attributes, raw_desc)

        # 2. Invoice Description (<= 40 chars, ALL CAPS)
        invoice_desc = self._build_invoice_desc(clean_brand_plain, mpn, item_type, attributes, raw_desc)

        # 3. Mobile Description (60-80 chars)
        canon_manuf = brand_info.get("canonical_manufacturer", "")
        mobile_desc = self._build_mobile_desc(canon_manuf, clean_brand_plain, series, item_type, mpn, attributes)

        # 4. Long Description
        long_desc = self._build_long_desc(brand, series, mpn, item_type, attributes, raw_desc)

        return {
            "invoice_description": invoice_desc,
            "mobile_description": mobile_desc,
            "product_title": product_title,
            "long_description": long_desc,
            "structured_attributes": attributes
        }

    def _build_product_title(
        self,
        brand: str,
        series: str,
        mpn: str,
        item_type: str,
        attributes: Dict[str, Any],
        raw_desc: Optional[str]
    ) -> str:
        """
        Formula: Brand® + [Series] + MPN + [Item Type] + [Key Specs (Dims, Elec, Finish)]
        """
        parts = [brand]
        if series and series.lower() not in brand.lower():
            parts.append(series)
        
        if mpn and mpn != "UNKNOWN_MPN":
            parts.append(mpn)
        
        if item_type:
            parts.append(item_type)
        elif raw_desc:
            cleaned_raw = self.expander.expand(raw_desc)
            # Take key tokens if item type is missing
            tokens = [t for t in cleaned_raw.split() if t.lower() not in brand.lower() and t != mpn]
            if tokens:
                parts.append(" ".join(tokens[:4]))

        # Add key differentiating specs
        specs_added = []
        for key in ["Blade_Diameter", "Dimensions", "Voltage", "Wattage", "Grit", "Tooth_Count", "Finish_Color", "Package_Quantity"]:
            if key in attributes and attributes[key] not in " ".join(parts):
                specs_added.append(str(attributes[key]))

        if specs_added:
            parts.append(", ".join(specs_added[:3]))

        title = " ".join([p for p in parts if p]).strip()
        # Clean double commas and redundant spaces
        title = re.sub(r"\s+", " ", title)
        title = re.sub(r"\s*,\s*", ", ", title)
        return title

    def _build_invoice_desc(
        self,
        brand: str,
        mpn: str,
        item_type: str,
        attributes: Dict[str, Any],
        raw_desc: Optional[str]
    ) -> str:
        """
        Formula: High information density, <= 40 chars, UPPERCASE
        """
        tokens = []
        
        # Abbreviated Item type / descriptor
        if item_type:
            tokens.append(item_type.upper())
        elif raw_desc:
            # Shortened tokens
            raw_upper = raw_desc.upper()
            raw_upper = re.sub(r"[^A-Z0-9\s/.-]", "", raw_upper)
            tokens.extend(raw_upper.split()[:3])

        # Key specs in compressed uppercase notation
        for key in ["Blade_Diameter", "Dimensions", "Voltage", "Wattage", "Grit", "Tooth_Count", "Package_Quantity"]:
            if key in attributes:
                val = str(attributes[key]).upper().replace(" ", "")
                if val not in " ".join(tokens):
                    tokens.append(val)

        # Truncate or assemble strictly <= 40 characters
        invoice_str = " ".join(tokens).strip()
        
        # If too long, trim tokens from the end
        while len(invoice_str) > 40 and len(tokens) > 1:
            tokens.pop()
            invoice_str = " ".join(tokens).strip()

        # Hard clamp to 40 chars max
        if len(invoice_str) > 40:
            invoice_str = invoice_str[:40].strip()

        return invoice_str.upper()

    def _build_mobile_desc(
        self,
        manuf: str,
        brand: str,
        series: str,
        item_type: str,
        mpn: str,
        attributes: Dict[str, Any]
    ) -> str:
        """
        Target: 60 - 80 characters strictly.
        Formula per Unilog Master Guidelines: Brand, Item Type, Series, MPN, Key Specs
        """
        clean_brand = re.sub(r"[®™]", "", str(brand or "")).strip()
        clean_manuf = re.sub(r"\s*\([A-Z0-9]+\)$", "", str(manuf or "")).strip()

        # Use brand as lead; fallback to manufacturer if brand is empty
        lead = clean_brand if clean_brand else (clean_manuf if clean_manuf else "Industrial")

        parts = [lead]
        if item_type:
            parts.append(item_type)
        if series and series.lower() not in lead.lower():
            parts.append(series)
        if mpn and mpn != "UNKNOWN_MPN":
            parts.append(mpn)

        for key in ["Blade_Diameter", "Dimensions", "Voltage", "Wattage", "Grit", "Tooth_Count", "Finish_Color", "Package_Quantity", "Material"]:
            if key in attributes and str(attributes[key]) not in " ".join(parts):
                parts.append(str(attributes[key]))

        mobile_str = ", ".join([p for p in parts if p]).strip()

        # Expand if under 60 chars
        fillers = ["Industrial Grade", "Commercial Quality", "Professional Performance", "Heavy Duty", "Pro Grade", "Commercial", "Standard Supply"]
        for filler in fillers:
            if len(mobile_str) < 60:
                candidate = f"{mobile_str}, {filler}"
                if len(candidate) <= 80:
                    mobile_str = candidate
                    if len(mobile_str) >= 60:
                        break

        if len(mobile_str) < 60:
            diff = 60 - len(mobile_str)
            if diff <= 11:
                mobile_str = f"Industrial {mobile_str}"
            else:
                mobile_str = f"{mobile_str}, Standard Supply"

        # Trim if exceeds 80 chars
        if len(mobile_str) > 80:
            trimmed = mobile_str[:80].rsplit(",", 1)[0].strip()
            if 60 <= len(trimmed) <= 80:
                mobile_str = trimmed
            else:
                mobile_str = mobile_str[:77].rsplit(" ", 1)[0] + "..."

        return mobile_str

    def _build_long_desc(
        self,
        brand: str,
        series: str,
        mpn: str,
        item_type: str,
        attributes: Dict[str, Any],
        raw_desc: Optional[str]
    ) -> str:
        """
        Constructs rich, comma-separated specification copy for eCommerce product detail pages.
        """
        spec_clauses = [brand]
        if series:
            spec_clauses.append(series)

        if item_type:
            spec_clauses.append(item_type)

        if mpn and mpn != "UNKNOWN_MPN":
            spec_clauses.append(f"Model {mpn}")

        # Add all technical attributes in standardized order
        attr_order = [
            ("Blade_Diameter", "Diameter"),
            ("Dimensions", "Dimensions"),
            ("Thickness", "Thickness"),
            ("Arbor_Size", "Arbor Size"),
            ("Voltage", "Voltage"),
            ("Amperage", "Amperage"),
            ("Wattage", "Wattage"),
            ("Phase", "Phase"),
            ("Horsepower", "Horsepower"),
            ("Battery_Capacity", "Capacity"),
            ("Speed", "Speed"),
            ("Tooth_Count", "Tooth Count"),
            ("Grit", "Grit"),
            ("Luminous_Flux", "Brightness"),
            ("Color_Temperature", "Color Temp"),
            ("Sound_Level", "Sound Level"),
            ("Material", "Material"),
            ("Finish_Color", "Finish"),
            ("Edge_Profile", "Edge"),
            ("Orientation", "Orientation"),
            ("Configuration", "Configuration"),
            ("Package_Quantity", "Package Qty")
        ]

        for attr_key, label in attr_order:
            if attr_key in attributes:
                val = attributes[attr_key]
                spec_clauses.append(f"{val}")

        # Connect clauses with comma separation
        long_desc = ", ".join([c for c in spec_clauses if c]).strip()
        long_desc = re.sub(r"\s+", " ", long_desc)
        long_desc = re.sub(r"\s*,\s*", ", ", long_desc)
        return long_desc
