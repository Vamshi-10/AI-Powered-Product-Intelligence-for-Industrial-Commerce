"""
Brand and Manufacturer Resolver
Resolves raw brand and manufacturer strings to canonical legal entities with trademark symbols (®, ™)
using exact dictionary lookups and RapidFuzz fuzzy matching.
"""

import os
import json
import re
from typing import Dict, Any, Optional, Tuple
from rapidfuzz import fuzz, process


class BrandResolver:
    """
    Normalizes noisy supplier brand and manufacturer names into canonical legal forms with full traceability.
    """

    def __init__(self, canonical_brands_path: Optional[str] = None):
        if canonical_brands_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            canonical_brands_path = os.path.join(base_dir, "data", "canonical_brands.json")
        
        self.brands_data = self._load_canonical_data(canonical_brands_path)
        self._build_alias_index()

    def _load_canonical_data(self, path: str) -> list:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f).get("brands", [])
        return []

    def _build_alias_index(self):
        """Builds lookup index for exact and fuzzy matching."""
        self.alias_to_brand: Dict[str, Dict[str, Any]] = {}
        self.all_aliases: list = []

        for entry in self.brands_data:
            canonical_brand = entry["canonical_brand"]
            brand_name = entry["brand_name"]
            manufacturer_name = entry["manufacturer_name"]
            
            # Map canonical names
            self.alias_to_brand[canonical_brand.lower()] = entry
            self.alias_to_brand[brand_name.lower()] = entry
            self.alias_to_brand[manufacturer_name.lower()] = entry

            self.all_aliases.append(canonical_brand.lower())
            self.all_aliases.append(brand_name.lower())
            self.all_aliases.append(manufacturer_name.lower())

            for alias in entry.get("aliases", []):
                self.alias_to_brand[alias.lower()] = entry
                self.all_aliases.append(alias.lower())

        self.all_aliases = list(set(self.all_aliases))

    def resolve(
        self,
        raw_brand: Optional[str],
        raw_manuf: Optional[str],
        part_desc: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Resolves brand and manufacturer with high precision and returns full traceability metadata:
        - canonical_brand (with ® / ™)
        - brand_code
        - canonical_manufacturer
        - manufacturer_code
        - resolution_status (EXACT_MATCH, ALIAS_RESOLVED, FUZZY_MATCH, DESC_EXTRACTED, UNRESOLVED_COMMODITY, NOT_FOUND)
        - resolution_source (canonical_brands.json, rapidfuzz, desc_ner, fallback)
        - confidence
        """
        candidates = []
        if raw_brand and raw_brand.strip():
            candidates.append((raw_brand.strip(), "explicit_brand"))
        if raw_manuf and raw_manuf.strip():
            cleaned_manuf = re.sub(r"\s*\([A-Z0-9]+\)$", "", raw_manuf.strip())
            candidates.append((cleaned_manuf, "explicit_manuf"))
            candidates.append((raw_manuf.strip(), "explicit_manuf_raw"))
        
        # 1. Search candidate strings
        for text, source in candidates:
            lookup_key = text.lower().strip()
            # Exact lookup
            if lookup_key in self.alias_to_brand:
                entry = self.alias_to_brand[lookup_key]
                status = "EXACT_MATCH" if lookup_key == entry["brand_name"].lower() else "ALIAS_RESOLVED"
                return self._format_result(entry, confidence=0.99, status=status, match_source="canonical_brands.json")

            # Fuzzy match
            if self.all_aliases:
                match_result = process.extractOne(
                    lookup_key,
                    self.all_aliases,
                    scorer=fuzz.token_sort_ratio,
                    score_cutoff=75
                )
                if match_result:
                    matched_alias, score, _ = match_result
                    entry = self.alias_to_brand[matched_alias]
                    confidence = min(0.95, score / 100.0)
                    return self._format_result(
                        entry,
                        confidence=confidence,
                        status="FUZZY_MATCH",
                        match_source=f"rapidfuzz (score: {score})"
                    )

        # 2. Search within description if provided
        if part_desc:
            desc_lower = part_desc.lower()
            for alias, entry in self.alias_to_brand.items():
                if len(alias) >= 3 and re.search(r"\b" + re.escape(alias) + r"\b", desc_lower):
                    return self._format_result(
                        entry,
                        confidence=0.88,
                        status="DESC_EXTRACTED",
                        match_source=f"description_ner ('{alias}')"
                    )

        # 3. Fallback: Identify if missing, ambiguous, or unmapped brand
        fallback_brand = raw_brand or (raw_manuf if raw_manuf else "Industrial Standard")
        cleaned_fallback = re.sub(r"\s*\([A-Z0-9]+\)$", "", str(fallback_brand)).strip()
        
        # Check if raw input was completely missing or placeholder
        is_missing = not raw_brand or raw_brand.lower() in ["-- unbranded --", "-- no unilog brand --", "-- no dib brand --", "commodity - unbranded", "-", "n/a", ""]
        
        # Check if there was an ambiguous partial match (score 50-74)
        is_ambiguous = False
        if candidates and self.all_aliases:
            partial_match = process.extractOne(
                candidates[0][0].lower(),
                self.all_aliases,
                scorer=fuzz.token_sort_ratio,
                score_cutoff=50
            )
            if partial_match:
                is_ambiguous = True

        if is_missing:
            status = "MISSING_BRAND"
        elif is_ambiguous:
            status = "AMBIGUOUS_BRAND"
        else:
            status = "BRAND_NOT_FOUND"

        return {
            "canonical_brand": cleaned_fallback,
            "brand_code": "UNKN",
            "canonical_manufacturer": raw_manuf or cleaned_fallback,
            "manufacturer_code": "UNKN",
            "confidence": 0.40,
            "resolution_status": status,
            "resolution_source": "fallback_unmapped",
            "needs_review": True
        }

    def _format_result(
        self,
        entry: Dict[str, Any],
        confidence: float,
        status: str,
        match_source: str
    ) -> Dict[str, Any]:
        return {
            "canonical_brand": entry["canonical_brand"],
            "brand_code": entry.get("brand_code", "UNIL"),
            "canonical_manufacturer": entry["manufacturer_name"],
            "manufacturer_code": entry.get("manufacturer_code", "UNIL"),
            "confidence": round(confidence, 2),
            "resolution_status": status,
            "resolution_source": match_source,
            "needs_review": confidence < 0.70
        }
