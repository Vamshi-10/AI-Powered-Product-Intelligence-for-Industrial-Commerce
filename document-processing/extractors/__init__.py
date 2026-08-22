"""
Document Processing - Extractors Module
"""

import os
import sys

_current_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_current_dir)
for _p in [_current_dir, _parent_dir]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from mpn_extractor import MPNExtractor
from brand_resolver import BrandResolver
from uom_normalizer import UOMNormalizer
from abbreviation_expander import AbbreviationExpander
from attribute_extractor import AttributeExtractor

__all__ = [
    "MPNExtractor",
    "BrandResolver",
    "UOMNormalizer",
    "AbbreviationExpander",
    "AttributeExtractor"
]


if __name__ == "__main__":
    print("[OK] Extractors module loaded successfully.")
