"""
Unit of Measure (UOM) Normalizer & Fraction Converter
Normalizes measurements to Unilog approved abbreviations with space separation (e.g. '24 in', '120 V')
and converts decimals to standard trade fractions based on the 64ths lookup table.
"""

import os
import json
import re
from typing import Dict, Any, Optional, Tuple


class UOMNormalizer:
    """
    Standardizes units of measurement and formats decimal dimensions into standard fractions.
    """

    def __init__(
        self,
        uom_standards_path: Optional[str] = None,
        decimal_fractions_path: Optional[str] = None
    ):
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        if uom_standards_path is None:
            uom_standards_path = os.path.join(base_dir, "data", "uom_standards.json")
        if decimal_fractions_path is None:
            decimal_fractions_path = os.path.join(base_dir, "data", "decimal_fractions.json")

        self.uom_rules = self._load_json(uom_standards_path)
        self.fraction_data = self._load_json(decimal_fractions_path)
        self._build_uom_map()

    def _load_json(self, path: str) -> Dict[str, Any]:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}

    def _build_uom_map(self):
        """Builds unit synonym lookup map."""
        self.unit_synonyms: Dict[str, str] = {}
        for mtype, mdata in self.uom_rules.get("measurement_types", {}).items():
            approved = mdata["approved_unit"]
            for syn in mdata.get("synonyms", []):
                self.unit_synonyms[syn.lower()] = approved
            self.unit_synonyms[approved.lower()] = approved

    def decimal_to_trade_fraction(self, decimal_val: float, tolerance: float = 0.008) -> str:
        """
        Converts a decimal number to standard hyphenated fraction (e.g. 50.25 -> '50-1/4', 0.5 -> '1/2').
        """
        whole = int(decimal_val)
        remainder = decimal_val - whole

        if abs(remainder) < 0.001:
            return str(whole)

        # Look for exact or nearest fraction in lookup
        best_fraction = None
        min_diff = float("inf")

        for frac_str, dec in self.fraction_data.get("fraction_to_decimal", {}).items():
            diff = abs(remainder - dec)
            if diff < min_diff:
                min_diff = diff
                best_fraction = frac_str

        if min_diff <= tolerance and best_fraction:
            if whole > 0:
                return f"{whole}-{best_fraction}"
            return best_fraction

        # Fallback to 2 decimal places if no clean fraction exists
        return f"{decimal_val:.2f}".rstrip("0").rstrip(".")

    def normalize_dimension_string(self, text: str) -> str:
        """
        Transforms messy dimension strings like:
        - 1/2"x18" -> 1/2 in W x 18 in L
        - 4-1/2"x.045"x7/8" -> 4-1/2 in Dia x 3/64 in THK x 7/8 in Arbor
        - 1x6-16' -> 1 in x 6 in x 16 ft
        """
        if not text:
            return text

        normalized = text

        # Replace double quotes with " in" (with preceding space if needed)
        normalized = re.sub(r'(\d+)\s*["”″]', r'\1 in', normalized)
        normalized = re.sub(r'(\d+/\d+)\s*["”″]', r'\1 in', normalized)
        normalized = re.sub(r'(\d+-\d+/\d+)\s*["”″]', r'\1 in', normalized)

        # Replace single quotes with " ft"
        normalized = re.sub(r"(\d+)\s*['’′]", r'\1 ft', normalized)

        # Clean decimal inch notations (e.g. 50.25 in -> 50-1/4 in)
        def replace_decimal_in(match):
            val = float(match.group(1))
            frac = self.decimal_to_trade_fraction(val)
            unit = match.group(2)
            return f"{frac} {unit}"

        normalized = re.sub(r'(\d+\.\d+)\s*(in|ft|mm|cm|m)\b', replace_decimal_in, normalized, flags=re.IGNORECASE)

        # Normalize spacing between digits and letters
        normalized = re.sub(r'(\d+)(in|ft|mm|cm|v|vac|vdc|w|kw|hp|a|amp|amps|dba|rpm|gpm|psi|gal|qt|oz|lb|lbs|ga|t|k)\b', r'\1 \2', normalized, flags=re.IGNORECASE)

        # Capitalize electrical and scientific units appropriately
        normalized = re.sub(r'\b(\d+(?:-\d+/\d+|\.\d+)?)\s*v\b', r'\1 V', normalized, flags=re.IGNORECASE)
        normalized = re.sub(r'\b(\d+(?:-\d+/\d+|\.\d+)?)\s*a\b', r'\1 A', normalized, flags=re.IGNORECASE)
        normalized = re.sub(r'\b(\d+(?:-\d+/\d+|\.\d+)?)\s*w\b', r'\1 W', normalized, flags=re.IGNORECASE)
        normalized = re.sub(r'\b(\d+(?:-\d+/\d+|\.\d+)?)\s*kw\b', r'\1 kW', normalized, flags=re.IGNORECASE)
        normalized = re.sub(r'\b(\d+(?:-\d+/\d+|\.\d+)?)\s*hp\b', r'\1 hp', normalized, flags=re.IGNORECASE)
        normalized = re.sub(r'\b(\d+(?:-\d+/\d+|\.\d+)?)\s*dba\b', r'\1 dBA', normalized, flags=re.IGNORECASE)
        normalized = re.sub(r'\b(\d+(?:-\d+/\d+|\.\d+)?)\s*k\b', r'\1 K', normalized, flags=re.IGNORECASE)
        normalized = re.sub(r'\b(\d+(?:-\d+/\d+|\.\d+)?)\s*ah\b', r'\1 Ah', normalized, flags=re.IGNORECASE)

        return normalized.strip()

    def format_uom_value(self, value: Any, unit_name: str) -> str:
        """
        Formats a single numeric/string value with its canonical approved unit symbol with space.
        """
        if value is None:
            return ""
        
        val_str = str(value).strip()
        # Find approved unit
        approved_unit = self.unit_synonyms.get(unit_name.lower().strip(), unit_name.strip())

        # If already formatted with unit, re-standardize
        if val_str.lower().endswith(approved_unit.lower()):
            clean_num = val_str[:-len(approved_unit)].strip()
            return f"{clean_num} {approved_unit}"
        
        return f"{val_str} {approved_unit}"
