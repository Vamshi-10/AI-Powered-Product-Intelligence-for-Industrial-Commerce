"""
PDF Spec Sheet & Cut-Sheet Parser for Industrial Commerce
Extracts technical text, model numbers, product descriptions, and specification tables
from manufacturer PDF datasheets, cut sheets, installation guides, and catalogs.
"""

import os
import re
from typing import List, Dict, Any, Optional
from pypdf import PdfReader


class PDFSpecSheetParser:
    """
    Parses industrial manufacturer PDF technical documents, spec sheets,
    and product cut sheets into structured sections and key-value attributes.
    """

    def __init__(self):
        # Common industrial spec section header patterns
        self.section_patterns = [
            r"(?i)^(?:technical\s+)?specifications",
            r"(?i)^features(?:\s+and\s+benefits)?",
            r"(?i)^dimensions(?:\s+and\s+weight)?",
            r"(?i)^electrical(?:\s+data|\s+ratings|\s+specifications)?",
            r"(?i)^performance(?:\s+data)?",
            r"(?i)^materials?(?:\s+of\s+construction)?",
            r"(?i)^ordering\s+information",
            r"(?i)^model\s+numbers?"
        ]

    def parse_pdf(self, file_path: str) -> Dict[str, Any]:
        """
        Extracts full text, page texts, detected sections, and embedded tables/specs from a PDF.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"PDF file not found: {file_path}")

        reader = PdfReader(file_path)
        num_pages = len(reader.pages)
        
        full_text_list = []
        page_records = []

        for idx, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            page_records.append({
                "page_number": idx + 1,
                "text": page_text
            })
            full_text_list.append(page_text)

        full_text = "\n\n".join(full_text_list)
        
        # Extract metadata
        meta = reader.metadata or {}
        metadata_dict = {
            "title": str(meta.get("/Title", "")).strip(),
            "author": str(meta.get("/Author", "")).strip(),
            "subject": str(meta.get("/Subject", "")).strip(),
            "creator": str(meta.get("/Creator", "")).strip(),
            "producer": str(meta.get("/Producer", "")).strip(),
            "page_count": num_pages
        }

        sections = self.extract_sections(full_text)
        extracted_tables = self.extract_key_value_specifications(full_text)
        detected_part_numbers = self.detect_potential_part_numbers(full_text)

        return {
            "file_path": file_path,
            "filename": os.path.basename(file_path),
            "metadata": metadata_dict,
            "page_count": num_pages,
            "full_text": full_text,
            "sections": sections,
            "specifications": extracted_tables,
            "detected_part_numbers": detected_part_numbers
        }

    def extract_sections(self, text: str) -> Dict[str, str]:
        """
        Splits text into logical sections based on common datasheet headers.
        """
        lines = text.split("\n")
        sections: Dict[str, List[str]] = {"General": []}
        current_section = "General"

        for line in lines:
            trimmed = line.strip()
            if not trimmed:
                continue

            matched = False
            for pattern in self.section_patterns:
                if re.match(pattern, trimmed):
                    current_section = trimmed
                    if current_section not in sections:
                        sections[current_section] = []
                    matched = True
                    break
            
            if not matched:
                sections[current_section].append(trimmed)

        # Convert line lists to consolidated paragraphs
        return {sec: "\n".join(lines_list) for sec, lines_list in sections.items() if lines_list}

    def extract_key_value_specifications(self, text: str) -> Dict[str, str]:
        """
        Extracts colon-delimited or tab-delimited technical parameter pairs
        e.g., 'Voltage: 120 V', 'Flow Rate: 1.5 gpm', 'Blade Diameter: 7-1/4 in'.
        """
        specs = {}
        # Pattern for "Key: Value" or "Key - Value"
        kv_pattern = r"(?m)^([A-Za-z0-9\s/_\-()]{3,35})\s*[:\t=]\s*([A-Za-z0-9\s/_\-.,\"'#°%]+)$"
        matches = re.findall(kv_pattern, text)
        for key, val in matches:
            clean_key = key.strip()
            clean_val = val.strip()
            if len(clean_key) > 2 and len(clean_val) > 0 and len(clean_val) < 100:
                specs[clean_key] = clean_val
        return specs

    def detect_potential_part_numbers(self, text: str) -> List[str]:
        """
        Scans datasheet text for industrial alphanumeric model/part numbers.
        """
        mpn_regex = r"\b[A-Z0-9]{3,8}(?:-[A-Z0-9]{2,8})+\b|\b[A-Z]{2,5}[0-9]{3,7}[A-Z0-9]*\b"
        candidates = set(re.findall(mpn_regex, text))
        # Filter false positives (e.g. common words or date formats)
        filtered = [c for c in candidates if not re.match(r"^\d{4}-\d{2}-\d{2}$", c) and len(c) >= 5]
        return sorted(filtered)[:20]
