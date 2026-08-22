"""
Manufacturer Part Number (MPN) Extractor & Normalizer
Extracts, cleans, and standardizes part numbers, model codes, and SKUs from cryptic catalog strings.
"""

import re
from typing import Dict, Any, Optional, Tuple


class MPNExtractor:
    """
    Extracts and standardizes Manufacturer Part Numbers (MPN), Series identifiers,
    and SKUs from raw distributor strings.
    """

    def __init__(self):
        # Regex patterns for industrial MPN patterns
        # e.g., 49-94-0013, DCB518ASTS06G, 3MABR-7100075678, PTD70GBPTDG, 543302126, FS C01 2004S
        self.mpn_patterns = [
            r"\b([A-Z0-9]{2,8}(?:-[A-Z0-9]{2,8}){1,4})\b",          # e.g. 49-94-0013, 3MABR-7100075678, 52C3-5/8-UPC
            r"\b([A-Z]{2,6}[0-9]{3,8}[A-Z0-9]*)\b",                  # e.g. DCB518ASTS06G, PDSH4816AF, PTD70GBPTDG
            r"\b([0-9]{6,10})\b",                                     # e.g. 543302126, 73019603, 1513703
            r"\b([A-Z]{1,3}\s+[A-Z0-9]{2,4}\s+[0-9]{3,5}[A-Z]?)\b"   # e.g. FS C01 2004S
        ]

    def extract_mpn(self, raw_mpn: Optional[str], part_desc: Optional[str]) -> Tuple[str, float]:
        """
        Extracts the canonical MPN and returns (mpn_value, confidence_score).
        """
        # 1. If explicit raw_mpn is provided and clean, prioritize it
        if raw_mpn and str(raw_mpn).strip():
            clean_mpn = str(raw_mpn).strip()
            # Remove any unwanted surrounding quotes or spaces
            clean_mpn = re.sub(r"^[\"']|[\"']$", "", clean_mpn).strip()
            if len(clean_mpn) >= 2:
                return clean_mpn, 0.98

        # 2. Extract from beginning or within part_desc
        if part_desc and str(part_desc).strip():
            text = str(part_desc).strip()
            # Often first token in part_desc is the MPN (e.g. "DCB518ASTS06G Diablo 1/2x18 - Sanding Belt")
            tokens = text.split()
            first_token = tokens[0].strip('",;:()-')
            
            # Check if first token matches an MPN pattern
            for pattern in self.mpn_patterns:
                if re.fullmatch(pattern, first_token):
                    return first_token, 0.90
            
            # Search throughout the entire text for candidate MPNs
            for pattern in self.mpn_patterns:
                match = re.search(pattern, text)
                if match:
                    return match.group(1).strip(), 0.85

        return (raw_mpn or "UNKNOWN_MPN").strip(), 0.50

    def clean_mpn_from_desc(self, part_desc: str, mpn: str) -> str:
        """
        Removes the redundant MPN token from the beginning of part_desc if present.
        """
        if not part_desc or not mpn:
            return part_desc or ""
        
        # Strip exact MPN prefix
        pattern = r"^\s*" + re.escape(mpn) + r"[\s\-:,]*"
        cleaned_desc = re.sub(pattern, "", part_desc, flags=re.IGNORECASE).strip()
        return cleaned_desc if cleaned_desc else part_desc
