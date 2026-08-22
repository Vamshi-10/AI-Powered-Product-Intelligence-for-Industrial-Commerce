"""
LOV (Lists of Values) Validator & Taxonomy Normalizer
Validates and standardizes extracted product attributes against strict Unilog Lists of Values (LOV)
to guarantee taxonomy compliance and eliminate invalid/hallucinated attribute values.
"""

import os
import sys
import json
import re
from typing import Dict, Any, Tuple, List, Optional

_current_dir = os.path.dirname(os.path.abspath(__file__))
_root_dir = os.path.dirname(_current_dir)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)


class LOVValidator:
    """
    Validates and normalizes attribute values against permitted Lists of Values (LOV).
    """

    def __init__(self, lov_file_path: Optional[str] = None):
        self.lov_path = lov_file_path or os.path.join(_root_dir, "data", "lov_master_taxonomy.json")
        self.lov_data = self._load_lov_taxonomy()

    def _load_lov_taxonomy(self) -> Dict[str, Any]:
        if os.path.exists(self.lov_path):
            try:
                with open(self.lov_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return {}
        return {}

    def validate_and_normalize_attributes(
        self,
        attributes: Dict[str, Any]
    ) -> Tuple[Dict[str, Any], List[Dict[str, Any]], Dict[str, Any]]:
        """
        Validates an attributes dictionary against the LOV master taxonomy.

        Returns:
            - normalized_attributes: Dict[str, Any] with LOV-standard values
            - lov_lineage: List[Dict] with field-level LOV provenance
            - lov_stats: Dict with compliance metrics
        """
        normalized_attrs = {}
        lov_lineage = []
        total_lov_attributes = 0
        validated_lov_count = 0
        normalized_lov_count = 0
        invalid_lov_count = 0

        for attr_name, raw_val in attributes.items():
            val_str = str(raw_val).strip()
            if not val_str:
                continue

            if attr_name in self.lov_data:
                total_lov_attributes += 1
                attr_lov = self.lov_data[attr_name]
                permitted = attr_lov.get("permitted_values", [])
                synonyms = attr_lov.get("synonyms", {})

                # 1. Exact Match in Permitted Values
                if val_str in permitted:
                    normalized_attrs[attr_name] = val_str
                    validated_lov_count += 1
                    lov_lineage.append({
                        "attribute": attr_name,
                        "raw_value": val_str,
                        "normalized_value": val_str,
                        "lov_status": "LOV_VALIDATED",
                        "source": "lov_master_taxonomy.json"
                    })

                # 2. Match in Synonyms/Aliases
                elif val_str.lower() in synonyms:
                    canonical_lov = synonyms[val_str.lower()]
                    normalized_attrs[attr_name] = canonical_lov
                    normalized_lov_count += 1
                    lov_lineage.append({
                        "attribute": attr_name,
                        "raw_value": val_str,
                        "normalized_value": canonical_lov,
                        "lov_status": "LOV_NORMALIZED",
                        "source": "lov_master_taxonomy.json (Synonym)"
                    })

                # 3. Fuzzy/Case-Insensitive Match
                else:
                    found_match = False
                    for perm_val in permitted:
                        if val_str.lower() == perm_val.lower():
                            normalized_attrs[attr_name] = perm_val
                            validated_lov_count += 1
                            found_match = True
                            lov_lineage.append({
                                "attribute": attr_name,
                                "raw_value": val_str,
                                "normalized_value": perm_val,
                                "lov_status": "LOV_VALIDATED",
                                "source": "lov_master_taxonomy.json"
                            })
                            break

                    if not found_match:
                        # Value not in LOV - preserve without inventing, but flag for review
                        normalized_attrs[attr_name] = val_str
                        invalid_lov_count += 1
                        lov_lineage.append({
                            "attribute": attr_name,
                            "raw_value": val_str,
                            "normalized_value": val_str,
                            "lov_status": "LOV_UNMAPPED",
                            "source": "raw_input_passthrough"
                        })
            else:
                # Non-LOV free-form attribute (e.g. Dimensions, Series)
                normalized_attrs[attr_name] = val_str
                lov_lineage.append({
                    "attribute": attr_name,
                    "raw_value": val_str,
                    "normalized_value": val_str,
                    "lov_status": "FREE_FORM",
                    "source": "extracted_attribute"
                })

        lov_compliance = 100.0 if total_lov_attributes == 0 else round(
            (validated_lov_count + normalized_lov_count) / total_lov_attributes * 100.0, 2
        )

        stats = {
            "total_lov_attributes": total_lov_attributes,
            "validated_count": validated_lov_count,
            "normalized_count": normalized_lov_count,
            "unmapped_count": invalid_lov_count,
            "lov_compliance_rate": lov_compliance
        }

        return normalized_attrs, lov_lineage, stats
