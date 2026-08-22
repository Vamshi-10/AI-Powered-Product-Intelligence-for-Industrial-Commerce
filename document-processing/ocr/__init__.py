"""
Document Processing - OCR & Visual Intelligence Module
"""

import os
import sys

_current_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_current_dir)
for _p in [_current_dir, _parent_dir]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from document_ocr import DocumentVisualOCR

__all__ = ["DocumentVisualOCR"]


if __name__ == "__main__":
    print("[OK] OCR module loaded successfully.")
