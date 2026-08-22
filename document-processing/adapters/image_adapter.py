"""
Image / Visual Spec Sheet Adapter for Industrial Commerce
Processes nameplate images, packaging photos, and catalog cut-sheet diagrams into CanonicalProductRecords.
"""

import os
import sys
import io
import re
from typing import List, Dict, Any, Optional, Union
from PIL import Image

_current_dir = os.path.dirname(os.path.abspath(__file__))
_pkg_dir = os.path.dirname(_current_dir)
if _pkg_dir not in sys.path:
    sys.path.insert(0, _pkg_dir)

from canonical_schema import CanonicalProductRecord, SourceMetadata, CanonicalProduct
from ocr.document_ocr import DocumentVisualOCR
from extractors.mpn_extractor import MPNExtractor


class ImageAdapter:
    """
    Ingests product images and nameplates, extracts visual metadata and OCR text into CanonicalProductRecords.
    """

    def __init__(self):
        self.ocr_engine = DocumentVisualOCR()
        self.mpn_extractor = MPNExtractor()

    def parse(
        self,
        input_data: Union[str, bytes, io.IOBase],
        filename: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[CanonicalProductRecord]:
        """
        Parses image input into a CanonicalProductRecord.
        """
        if filename:
            source_name = filename
        elif isinstance(input_data, str):
            source_name = os.path.basename(input_data)
        else:
            source_name = "product_image.png"

        img = self._load_image(input_data)
        
        if img is None:
            return []

        width, height = img.size
        img_format = img.format or "PNG"
        img.close()
        
        # Extract visual OCR text if available (fallback to filename / metadata heuristic)
        extracted_text = ""
        if isinstance(input_data, str) and os.path.exists(input_data):
            ocr_res = self.ocr_engine.extract_text_from_image(input_data)
            extracted_text = ocr_res.get("extracted_text", "")

        # Extract MPN from filename or extracted text
        mpn_candidate = ""
        raw_text_for_mpn = f"{source_name} {extracted_text}"
        extracted_mpn, mpn_conf = self.mpn_extractor.extract_mpn("", raw_text_for_mpn)
        if extracted_mpn and extracted_mpn != "UNKNOWN_MPN":
            mpn_candidate = extracted_mpn

        # Clean product title from filename
        clean_name = os.path.splitext(source_name)[0].replace("_", " ").replace("-", " ")

        record = CanonicalProductRecord(
            source=SourceMetadata(
                source_type="image",
                source_name=source_name,
                source_location="Visual Asset",
                source_id=f"img_{source_name}",
                content_type=f"image/{img_format.lower()}",
                retrieval_status="processed"
            ),
            raw_data={
                "resolution": f"{width}x{height}",
                "aspect_ratio": round(width / max(1, height), 2),
                "format": img_format,
                "ocr_text": extracted_text,
                "filename": source_name
            },
            product=CanonicalProduct(
                product_name=clean_name,
                mpn=mpn_candidate,
                description=f"Industrial product visual asset: {clean_name}",
                attributes={
                    "Resolution": f"{width}x{height}",
                    "Image_Format": img_format
                }
            )
        )

        return [record]

    def _load_image(self, input_data: Union[str, bytes, io.IOBase]) -> Optional[Image.Image]:
        try:
            if isinstance(input_data, str) and os.path.exists(input_data):
                return Image.open(input_data)
            elif isinstance(input_data, bytes):
                return Image.open(io.BytesIO(input_data))
            elif hasattr(input_data, "read"):
                return Image.open(input_data)
        except Exception:
            return None
        return None
