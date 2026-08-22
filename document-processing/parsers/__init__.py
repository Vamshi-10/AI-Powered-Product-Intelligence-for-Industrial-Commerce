"""
Document Processing - Parsers Module
"""

import os
import sys

_current_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_current_dir)
for _p in [_current_dir, _parent_dir]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from catalog_parser import CatalogParser, PLACEHOLDER_VALUES
from pdf_parser import PDFSpecSheetParser
from table_parser import TableParser

__all__ = ["CatalogParser", "PLACEHOLDER_VALUES", "PDFSpecSheetParser", "TableParser"]


if __name__ == "__main__":
    print("[OK] Parsers module loaded successfully.")
