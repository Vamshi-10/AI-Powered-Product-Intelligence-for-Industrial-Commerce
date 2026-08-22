"""
Multi-File Composite Input Adapter for Industrial Commerce
Processes batches of mixed files (PDF, XLSX, CSV, JSON, Images) while preserving individual file lineage.
"""

import os
import sys
import io
from typing import List, Dict, Any, Optional, Union, Tuple

_current_dir = os.path.dirname(os.path.abspath(__file__))
_pkg_dir = os.path.dirname(_current_dir)
if _pkg_dir not in sys.path:
    sys.path.insert(0, _pkg_dir)

from canonical_schema import CanonicalProductRecord


class MultiFileAdapter:
    """
    Orchestrates batch ingestion across heterogeneous file types.
    """

    def __init__(self):
        from adapters.csv_adapter import CSVAdapter
        from adapters.xlsx_adapter import XLSXAdapter
        from adapters.json_adapter import JSONAdapter
        from adapters.pdf_adapter import PDFAdapter
        from adapters.image_adapter import ImageAdapter

        self.csv_adapter = CSVAdapter()
        self.xlsx_adapter = XLSXAdapter()
        self.json_adapter = JSONAdapter()
        self.pdf_adapter = PDFAdapter()
        self.image_adapter = ImageAdapter()

    def parse_multiple(
        self,
        files: List[Union[str, Tuple[str, Any], Any]],
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[CanonicalProductRecord]:
        """
        Parses a collection of files into a unified list of CanonicalProductRecords.
        """
        all_records: List[CanonicalProductRecord] = []

        for file_item in files:
            records = self._parse_single_item(file_item)
            all_records.extend(records)

        return all_records

    def _parse_single_item(self, file_item: Any) -> List[CanonicalProductRecord]:
        filename = ""
        content = file_item

        if isinstance(file_item, tuple) and len(file_item) == 2:
            filename, content = file_item
        elif isinstance(file_item, str):
            filename = os.path.basename(file_item)
            content = file_item
        elif hasattr(file_item, "name"):
            filename = getattr(file_item, "name", "uploaded_file")
            content = file_item

        ext = os.path.splitext(filename)[1].lower()

        if ext in [".csv", ".tsv"]:
            return self.csv_adapter.parse(content, filename=filename)
        elif ext in [".xlsx", ".xls"]:
            return self.xlsx_adapter.parse(content, filename=filename)
        elif ext in [".json"]:
            return self.json_adapter.parse(content, filename=filename)
        elif ext in [".pdf"]:
            return self.pdf_adapter.parse(content, filename=filename)
        elif ext in [".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"]:
            return self.image_adapter.parse(content, filename=filename)
        else:
            # Fallback: attempt CSV then JSON
            try:
                return self.csv_adapter.parse(content, filename=filename)
            except Exception:
                return []
