"""
Content Quality & Rule Compliance Validator for Industrial Commerce
Performs multi-rule audits, computes granular quality confidence scores (0-100%),
and flags ambiguous items for human-in-the-loop review with full explainability.
"""

import os
import sys
import re
from typing import Dict, Any, List, Optional


class ContentValidator:
    """
    Validates enriched product intelligence records against Unilog and industrial commerce standards.
    """

    def validate_record(self, enriched_record: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validates an enriched record directly from the pipeline.
        """
        brand_info = enriched_record.get("brand_info", {})
        return self.validate(enriched_record, brand_info)

    def validate(
        self,
        enriched_record: Dict[str, Any],
        brand_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Runs comprehensive rule-based validation checks on the generated record.
        """
        rule_results: Dict[str, bool] = {}
        warnings: List[str] = []
        review_reasons: List[str] = []
        score_deductions = 0.0

        invoice_desc = enriched_record.get("invoice_description", "")
        mobile_desc = enriched_record.get("mobile_description", "")
        product_title = enriched_record.get("product_title", "")
        long_desc = enriched_record.get("long_description", "")
        mpn = enriched_record.get("mfg_part_num", "")
        attributes = enriched_record.get("attributes", {})

        # Rule 1: Invoice Description <= 40 chars
        if len(invoice_desc) <= 40:
            rule_results["invoice_char_limit"] = True
        else:
            rule_results["invoice_char_limit"] = False
            warnings.append(f"Invoice description exceeds 40 chars ({len(invoice_desc)} chars)")
            review_reasons.append("invoice_length_exceeded")
            score_deductions += 0.15

        # Rule 2: Invoice Description ALL CAPS
        if invoice_desc == invoice_desc.upper():
            rule_results["invoice_casing_caps"] = True
        else:
            rule_results["invoice_casing_caps"] = False
            warnings.append("Invoice description is not uppercase")
            score_deductions += 0.10

        # Rule 3: Mobile Description 60-80 chars
        mobile_len = len(mobile_desc)
        if 55 <= mobile_len <= 85:  # Tolerance window
            rule_results["mobile_length_compliance"] = True
        else:
            rule_results["mobile_length_compliance"] = False
            warnings.append(f"Mobile description outside ideal 60-80 range ({mobile_len} chars)")
            score_deductions += 0.08

        # Rule 4: UOM spacing rule (must have space before unit e.g. '24 in' not '24in')
        # We exclude the MPN/model code so alphanumeric part numbers like '9A-570' or '37418A' are not falsely flagged.
        text_to_audit = f"{product_title} {long_desc}"
        if mpn and mpn != "UNKNOWN_MPN":
            text_to_audit = re.sub(re.escape(mpn), "", text_to_audit, flags=re.IGNORECASE)

        invalid_uom_spacing = re.search(
            r"(?<![A-Za-z0-9\-])\d+(?:[\.\/]\d+)?(in|ft|mm|cm|kw|hp|dba|rpm|deg|hz)\b",
            text_to_audit,
            re.IGNORECASE
        )
        if not invalid_uom_spacing:
            invalid_uom_spacing = re.search(
                r"(?<![A-Za-z0-9\-])\d+(?:[\.\/]\d+)?([VvAaWw])(?=[\s,\.\)]|$)",
                text_to_audit
            )

        if not invalid_uom_spacing:
            rule_results["uom_spacing_compliance"] = True
        else:
            rule_results["uom_spacing_compliance"] = False
            warnings.append(f"UOM spacing violation detected: '{invalid_uom_spacing.group(0)}' (expected space before unit)")
            review_reasons.append("invalid_uom_spacing")
            score_deductions += 0.10

        # Rule 5: Brand resolution & legal trademark
        canonical_brand = brand_info.get("canonical_brand", "")
        brand_conf = brand_info.get("confidence", 0.5)
        if brand_conf >= 0.75:
            rule_results["brand_resolution"] = True
        else:
            rule_results["brand_resolution"] = False
            warnings.append(f"Low confidence in brand resolution ({brand_conf * 100:.0f}%)")
            review_reasons.append("brand_unresolved_low_confidence")
            score_deductions += 0.20

        # Rule 6: Attribute richness
        if len(attributes) >= 2:
            rule_results["attribute_richness"] = True
        else:
            rule_results["attribute_richness"] = False
            warnings.append("Limited technical attributes extracted")
            review_reasons.append("limited_technical_attributes")
            score_deductions += 0.15

        # Calculate final confidence
        base_confidence = 1.0 - score_deductions
        final_confidence = max(0.20, min(0.99, base_confidence))

        # Flag for human-in-the-loop review if confidence < 75% or any critical rule failed (brand/invoice)
        needs_human_review = (
            final_confidence < 0.75 or
            not rule_results.get("brand_resolution", True) or
            not rule_results.get("invoice_char_limit", True)
        )

        # Map primary review reason code
        code_mapping = {
            "brand_unresolved_low_confidence": "AMBIGUOUS_BRAND",
            "invoice_length_exceeded": "INVOICE_LENGTH_EXCEEDED",
            "invalid_uom_spacing": "INVALID_UOM",
            "limited_technical_attributes": "LIMITED_ATTRIBUTES"
        }
        primary_reason = "NONE"
        if needs_human_review:
            if review_reasons:
                primary_reason = code_mapping.get(review_reasons[0], review_reasons[0].upper())
            else:
                primary_reason = "LOW_CONFIDENCE"

        return {
            "is_valid": len(warnings) == 0,
            "confidence_score": round(final_confidence * 100, 1),
            "needs_human_review": needs_human_review,
            "review_required": needs_human_review,
            "primary_review_reason": primary_reason,
            "review_reasons": [code_mapping.get(r, r.upper()) for r in review_reasons],
            "rule_checks": rule_results,
            "warnings": warnings,
            "passed_checks_count": sum(1 for v in rule_results.values() if v),
            "total_checks_count": len(rule_results)
        }
