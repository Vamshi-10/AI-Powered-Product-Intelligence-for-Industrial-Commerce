"""
Adapters Package for Universal Product Data Ingestion
"""

import os
import sys

_current_dir = os.path.dirname(os.path.abspath(__file__))
if _current_dir not in sys.path:
    sys.path.insert(0, _current_dir)

from adapters.csv_adapter import CSVAdapter
from adapters.xlsx_adapter import XLSXAdapter
from adapters.json_adapter import JSONAdapter
from adapters.pdf_adapter import PDFAdapter
from adapters.image_adapter import ImageAdapter
from adapters.url_adapter import URLAdapter
from adapters.text_adapter import TextAdapter
from adapters.manual_adapter import ManualAdapter
from adapters.multi_file_adapter import MultiFileAdapter


def get_adapter(input_type: str):
    """Factory returning appropriate adapter instance."""
    input_type_clean = str(input_type).lower().strip()
    if input_type_clean in ["csv", "tsv"]:
        return CSVAdapter()
    elif input_type_clean in ["xlsx", "xls", "excel"]:
        return XLSXAdapter()
    elif input_type_clean in ["json", "api"]:
        return JSONAdapter()
    elif input_type_clean in ["pdf", "spec_sheet"]:
        return PDFAdapter()
    elif input_type_clean in ["image", "ocr", "photo", "nameplate"]:
        return ImageAdapter()
    elif input_type_clean in ["url", "link", "web", "website"]:
        return URLAdapter()
    elif input_type_clean in ["text", "raw_text", "specs"]:
        return TextAdapter()
    elif input_type_clean in ["manual", "dict", "form"]:
        return ManualAdapter()
    elif input_type_clean in ["multi_file", "batch", "multiple"]:
        return MultiFileAdapter()
    else:
        return CSVAdapter()


__all__ = [
    "CSVAdapter",
    "XLSXAdapter",
    "JSONAdapter",
    "PDFAdapter",
    "ImageAdapter",
    "URLAdapter",
    "TextAdapter",
    "ManualAdapter",
    "MultiFileAdapter",
    "get_adapter"
]
