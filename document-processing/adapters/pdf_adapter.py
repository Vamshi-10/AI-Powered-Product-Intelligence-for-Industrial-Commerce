"""
PDF Technical Spec Sheet Adapter for Industrial Commerce
Parses PDF datasheets, cut sheets, and catalogs, extracts product parameters,
and standardizes them into CanonicalProductRecords with page-level provenance.
"""

import os
import sys
import io
import re
from typing import List, Dict, Any, Optional, Union
from pypdf import PdfReader

_current_dir = os.path.dirname(os.path.abspath(__file__))
_pkg_dir = os.path.dirname(_current_dir)
if _pkg_dir not in sys.path:
    sys.path.insert(0, _pkg_dir)

from canonical_schema import CanonicalProductRecord, SourceMetadata, CanonicalProduct
from parsers.pdf_parser import PDFSpecSheetParser
from extractors.mpn_extractor import MPNExtractor


class PDFAdapter:
    """
    Ingests PDF spec sheets and catalog cut-sheets into CanonicalProductRecords.
    """

    def __init__(self):
        self.pdf_parser = PDFSpecSheetParser()
        self.mpn_extractor = MPNExtractor()

    def parse(
        self,
        input_data: Union[str, bytes, io.IOBase],
        filename: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[CanonicalProductRecord]:
        """
        Parses PDF input into CanonicalProductRecord items.
        """
        source_name = filename or "document.pdf"
        reader = self._get_pdf_reader(input_data)
        
        if reader is None or len(reader.pages) == 0:
            return []

        records: List[CanonicalProductRecord] = []
        meta = reader.metadata or {}
        doc_title = str(meta.get("/Title", "") or "").strip()

        for page_idx, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            page_num = page_idx + 1

            if not page_text.strip():
                # Scanned page / no digital text detected
                record = CanonicalProductRecord(
                    source=SourceMetadata(
                        source_type="pdf",
                        source_name=source_name,
                        source_location=f"Page {page_num}",
                        source_id=f"{source_name}_p{page_num}",
                        content_type="application/pdf",
                        retrieval_status="scanned_requires_ocr"
                    ),
                    raw_data={"page_number": page_num, "text_length": 0, "is_scanned": True},
                    product=CanonicalProduct(
                        product_name=doc_title or f"Scanned Catalog Page {page_num}",
                        description=f"Scanned document page requiring OCR processing from {source_name}"
                    )
                )
                records.append(record)
                continue

            # Extract MPN candidates from page
            extracted_mpn, mpn_conf = self.mpn_extractor.extract_mpn("", page_text)
            
            # Extract key-value specifications from page lines
            specs = self._extract_specs_from_text(page_text)
            
            # Find brand mention
            detected_brand = self._detect_brand_in_text(page_text)

            # Generate description from top lines
            lines = [l.strip() for l in page_text.splitlines() if l.strip()]
            desc_candidate = lines[0] if lines else f"Spec Sheet Page {page_num}"
            if len(desc_candidate) < 15 and len(lines) > 1:
                desc_candidate = f"{lines[0]} - {lines[1]}"

            record = CanonicalProductRecord(
                source=SourceMetadata(
                    source_type="pdf",
                    source_name=source_name,
                    source_location=f"Page {page_num}",
                    source_id=f"{source_name}_p{page_num}",
                    content_type="application/pdf"
                ),
                raw_data={
                    "page_number": page_num,
                    "extracted_text_preview": page_text[:500],
                    "raw_text": page_text
                },
                product=CanonicalProduct(
                    product_name=desc_candidate[:150],
                    brand=detected_brand,
                    manufacturer="",
                    mpn=extracted_mpn if extracted_mpn != "UNKNOWN_MPN" else "",
                    description=desc_candidate[:250],
                    category=specs.get("Item_Type", specs.get("Category", "Industrial Equipment")),
                    specifications=specs,
                    attributes=specs
                )
            )
            records.append(record)

        return records

    def _get_pdf_reader(self, input_data: Union[str, bytes, io.IOBase]) -> Optional[PdfReader]:
        try:
            if isinstance(input_data, str) and os.path.isfile(input_data):
                return PdfReader(input_data)
            elif isinstance(input_data, bytes):
                return PdfReader(io.BytesIO(input_data))
            elif hasattr(input_data, "read"):
                return PdfReader(input_data)
        except Exception:
            return None
        return None

    def _extract_specs_from_text(self, text: str) -> Dict[str, str]:
        specs = {}
        for line in text.splitlines():
            line = line.strip()
            if ":" in line and len(line) < 120:
                parts = line.split(":", 1)
                k = parts[0].strip()
                v = parts[1].strip()
                if 2 <= len(k) <= 30 and 1 <= len(v) <= 80:
                    clean_k = re.sub(r"[^a-zA-Z0-9_\s]", "", k).strip().replace(" ", "_")
                    specs[clean_k] = v
        return specs

    def _detect_brand_in_text(self, text: str) -> str:
        common_brands = ["Diablo", "3M", "DeWalt", "Milwaukee", "Bosch", "Makita", "Klein Tools", "Square D", "Eaton", "Fluke"]
        for b in common_brands:
            if re.search(r"\b" + re.escape(b) + r"\b", text, re.IGNORECASE):
                return b
        return ""
