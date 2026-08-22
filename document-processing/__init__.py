"""
AI-Powered Product Intelligence - Document Processing Package
Unified module for catalog parsing, PDF spec sheet extraction, entity resolution,
UOM normalization, multi-tier description building, content validation, and universal input adapters.
"""

import os
import sys

# Add current and parent directories to sys.path so modules resolve cleanly in IDE
_current_dir = os.path.dirname(os.path.abspath(__file__))
_root_dir = os.path.dirname(_current_dir)
for _p in [_current_dir, _root_dir]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from canonical_schema import (
    CanonicalProductRecord,
    SourceMetadata,
    CanonicalProduct,
    NormalizedData,
    GeneratedContent,
    QualityMetadata
)
from pipeline import DocumentProcessingPipeline, UniversalDataPipeline
from validator import ContentValidator
from description_builder import DescriptionBuilder
from delivery_formatter import DeliveryFormatter
from delivery_validator import DeliverySchemaValidator
from parsers.catalog_parser import CatalogParser, PLACEHOLDER_VALUES
from parsers.pdf_parser import PDFSpecSheetParser
from parsers.table_parser import TableParser
from extractors.mpn_extractor import MPNExtractor
from extractors.brand_resolver import BrandResolver
from extractors.uom_normalizer import UOMNormalizer
from extractors.abbreviation_expander import AbbreviationExpander
from extractors.attribute_extractor import AttributeExtractor
from adapters import (
    CSVAdapter,
    XLSXAdapter,
    JSONAdapter,
    PDFAdapter,
    ImageAdapter,
    URLAdapter,
    TextAdapter,
    ManualAdapter,
    MultiFileAdapter,
    get_adapter
)

__all__ = [
    "CanonicalProductRecord",
    "SourceMetadata",
    "CanonicalProduct",
    "NormalizedData",
    "GeneratedContent",
    "QualityMetadata",
    "DocumentProcessingPipeline",
    "UniversalDataPipeline",
    "ContentValidator",
    "DescriptionBuilder",
    "DeliveryFormatter",
    "DeliverySchemaValidator",
    "CatalogParser",
    "PLACEHOLDER_VALUES",
    "PDFSpecSheetParser",
    "TableParser",
    "MPNExtractor",
    "BrandResolver",
    "UOMNormalizer",
    "AbbreviationExpander",
    "AttributeExtractor",
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


if __name__ == "__main__":
    print("[OK] Universal Document Processing package successfully initialized and ready.")
    pipeline = DocumentProcessingPipeline()
    test_result = pipeline.process_item({
        "mfg_part_num": "PDSH4816AF",
        "part_desc": "PDSH4816AF Dishwasher SS - Display Only",
        "part_manuf": "Appliance Dealers Cooperative (APPDE)"
    })
    print(f"Sample Title: {test_result['product_title']}")
    print(f"Confidence  : {test_result['overall_confidence']}%")
