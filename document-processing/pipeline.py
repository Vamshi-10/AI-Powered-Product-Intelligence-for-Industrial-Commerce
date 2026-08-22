"""
Unified Universal Document Processing & Product Intelligence Pipeline
Orchestrates ingestion across 11 input modalities, canonical schema transformation,
entity resolution, UOM normalization, attribute extraction, multi-tier description generation,
confidence scoring, human review triage, traceability, and 252-column commercial delivery formatting.
"""

import os
import sys
import json
from typing import Dict, Any, List, Optional, Union
import pandas as pd

# Ensure document-processing directory is in sys.path
_current_dir = os.path.dirname(os.path.abspath(__file__))
if _current_dir not in sys.path:
    sys.path.insert(0, _current_dir)

from canonical_schema import CanonicalProductRecord, SourceMetadata, CanonicalProduct
from parsers.catalog_parser import CatalogParser
from parsers.pdf_parser import PDFSpecSheetParser
from extractors.mpn_extractor import MPNExtractor
from extractors.brand_resolver import BrandResolver
from extractors.uom_normalizer import UOMNormalizer
from extractors.abbreviation_expander import AbbreviationExpander
from extractors.attribute_extractor import AttributeExtractor
from lov_validator import LOVValidator
from description_builder import DescriptionBuilder
from validator import ContentValidator
from delivery_formatter import DeliveryFormatter
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


class DocumentProcessingPipeline:
    """
    End-to-End Pipeline for transforming fragmented industrial product data across
    PDF, CSV, XLSX, JSON, Image, URL, Text, and Manual inputs into commerce-ready product intelligence.
    """

    def __init__(
        self,
        canonical_brands_path: Optional[str] = None,
        uom_standards_path: Optional[str] = None,
        decimal_fractions_path: Optional[str] = None,
        abbreviations_path: Optional[str] = None,
        lov_path: Optional[str] = None
    ):
        self.catalog_parser = CatalogParser()
        self.pdf_parser = PDFSpecSheetParser()
        self.mpn_extractor = MPNExtractor()
        self.brand_resolver = BrandResolver(canonical_brands_path)
        self.uom_normalizer = UOMNormalizer(uom_standards_path, decimal_fractions_path)
        self.abbrev_expander = AbbreviationExpander(abbreviations_path)
        self.attr_extractor = AttributeExtractor(self.uom_normalizer)
        self.lov_validator = LOVValidator(lov_path)
        self.desc_builder = DescriptionBuilder()
        self.validator = ContentValidator()
        self.delivery_formatter = DeliveryFormatter()

        # Input Adapters Layer
        self.csv_adapter = CSVAdapter()
        self.xlsx_adapter = XLSXAdapter()
        self.json_adapter = JSONAdapter()
        self.pdf_adapter = PDFAdapter()
        self.image_adapter = ImageAdapter()
        self.url_adapter = URLAdapter()
        self.text_adapter = TextAdapter()
        self.manual_adapter = ManualAdapter()
        self.multi_file_adapter = MultiFileAdapter()

    # =========================================================================
    # UNIVERSAL SERVICE INTERFACE (For Backend API & Frontend Integration)
    # =========================================================================

    def process_input(
        self,
        input_type: str,
        input_data: Any,
        filename: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Universal entry point: Ingests any supported input type, standardizes into Canonical Schema,
        enriches through the intelligence engine, and returns structured results with quality metrics.
        """
        adapter = get_adapter(input_type)
        try:
            canonical_records = adapter.parse(input_data, filename=filename, metadata=metadata)
        except Exception as e:
            return {
                "success": False,
                "error_code": "ADAPTER_EXTRACTION_ERROR",
                "message": f"Failed to ingest input via {input_type} adapter: {str(e)}",
                "source": filename or input_type,
                "products": [],
                "quality_metrics": {}
            }

        if not canonical_records:
            return {
                "success": False,
                "error_code": "NO_PRODUCT_DATA_FOUND",
                "message": "No valid product records could be extracted from the supplied input.",
                "source": filename or input_type,
                "products": [],
                "quality_metrics": {}
            }

        # Process canonical records through enrichment engine
        processed_records = self.process_canonical_records(canonical_records)
        metrics = self._calculate_batch_metrics(processed_records)

        return {
            "success": True,
            "input_type": input_type,
            "source_name": filename or input_type,
            "total_products": len(processed_records),
            "quality_metrics": metrics,
            "products": [r.to_dict() for r in processed_records]
        }

    def process_file(
        self,
        file_path_or_bytes: Any,
        filename: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Auto-detects file type from filename extension and processes accordingly."""
        fname = filename or (os.path.basename(file_path_or_bytes) if isinstance(file_path_or_bytes, str) else "uploaded_file")
        ext = os.path.splitext(fname)[1].lower()

        type_map = {
            ".csv": "csv",
            ".tsv": "csv",
            ".xlsx": "xlsx",
            ".xls": "xlsx",
            ".json": "json",
            ".pdf": "pdf",
            ".png": "image",
            ".jpg": "image",
            ".jpeg": "image",
            ".tiff": "image",
            ".webp": "image",
            ".bmp": "image",
            ".txt": "text"
        }
        input_type = type_map.get(ext, "csv")
        return self.process_input(input_type, file_path_or_bytes, filename=fname, metadata=metadata)

    def process_files(
        self,
        files: List[Any],
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Processes multiple uploaded files in a single batch, preserving individual lineage."""
        canonical_records = self.multi_file_adapter.parse_multiple(files, metadata=metadata)
        if not canonical_records:
            return {
                "success": False,
                "error_code": "NO_PRODUCT_DATA_FOUND",
                "message": "No valid products found across the supplied files.",
                "products": [],
                "quality_metrics": {}
            }

        processed = self.process_canonical_records(canonical_records)
        metrics = self._calculate_batch_metrics(processed)

        return {
            "success": True,
            "input_type": "multi_file",
            "total_products": len(processed),
            "quality_metrics": metrics,
            "products": [r.to_dict() for r in processed]
        }

    def process_url(self, url: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Fetches product specs from a web URL and enriches it."""
        return self.process_input("url", url, filename=url, metadata=metadata)

    def process_text(self, text: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Enriches raw pasted text or specification block."""
        return self.process_input("text", text, filename="pasted_specs.txt", metadata=metadata)

    def process_manual(self, product_dict: Dict[str, Any], metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Enriches a manual form submission."""
        return self.process_input("manual", product_dict, filename="manual_entry", metadata=metadata)

    # =========================================================================
    # CORE ENRICHMENT LOGIC (Canonical Schema Processing)
    # =========================================================================

    def process_canonical_records(
        self,
        records: List[CanonicalProductRecord]
    ) -> List[CanonicalProductRecord]:
        """
        Passes a list of CanonicalProductRecords through the intelligence pipeline.
        """
        for record in records:
            if record.source.retrieval_status == "failed":
                err_msg = record.raw_data.get("error_message") or record.raw_data.get("error") or "Source retrieval failed"
                err_code = record.raw_data.get("error_code") or "INACCESSIBLE_SOURCE"
                record.quality.confidence_score = 0.0
                record.quality.quality_tier = "FAILED"
                record.quality.needs_human_review = True
                record.quality.review_reasons = [err_code]
                record.generated.title = f"Failed Ingestion: {record.source.source_name}"
                record.generated.invoice_description = "FAILED RETRIEVAL"
                record.generated.mobile_description = f"Failed Retrieval: {record.source.source_name[:50]}"
                record.generated.long_description = f"Could not retrieve or process product data from {record.source.source_name}: {err_msg}"
                continue

            pipeline_input = record.to_pipeline_input()
            pipeline_output = self.process_item(pipeline_input)
            record.apply_pipeline_output(pipeline_output)
        return records

    def process_item(self, raw_item: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enriches a single raw distributor catalog record into structured product intelligence.
        """
        raw_mpn = raw_item.get("mfg_part_num")
        raw_desc = raw_item.get("part_desc")
        e1_brand = raw_item.get("e1_brand")
        unilog_brand = raw_item.get("unilog_brand")
        dib_brand = raw_item.get("dib_brand")
        part_manuf = raw_item.get("part_manuf")
        classpath = raw_item.get("classpath")
        extra_fields = raw_item.get("extra_fields", {})

        # Step 1: MPN Extraction & Cleaning
        mpn, mpn_conf = self.mpn_extractor.extract_mpn(raw_mpn, raw_desc)
        cleaned_desc = self.mpn_extractor.clean_mpn_from_desc(raw_desc or "", mpn)

        # Step 2: Brand & Manufacturer Resolution
        active_brand_input = unilog_brand or e1_brand or dib_brand
        brand_info = self.brand_resolver.resolve(active_brand_input, part_manuf, raw_desc)

        # Step 3: Domain Acronym & Abbreviation Expansion
        expanded_desc = self.abbrev_expander.expand(cleaned_desc)

        # Step 4: UOM & Dimension Normalization
        normalized_desc = self.uom_normalizer.normalize_dimension_string(expanded_desc)

        # Step 5: Structured Technical Attribute Extraction
        extracted_attributes = self.attr_extractor.extract_attributes(
            part_desc=normalized_desc,
            mpn=mpn,
            extra_fields=extra_fields
        )

        # Step 5.5: Strict LOV (Lists of Values) Validation & Taxonomy Normalization
        normalized_attributes, lov_lineage, lov_stats = self.lov_validator.validate_and_normalize_attributes(
            extracted_attributes
        )

        # Step 6: 5-Tier Content Generation (Invoice, Mobile, Title, Long Desc, Taxonomy)
        descriptions = self.desc_builder.build_all(
            mpn=mpn,
            brand_info=brand_info,
            attributes=normalized_attributes,
            raw_desc=normalized_desc
        )

        # Step 7: Content Quality & Rule Validation
        enriched_payload = {
            "mfg_part_num": mpn,
            "raw_part_desc": raw_desc,
            "canonical_brand": brand_info["canonical_brand"],
            "brand_code": brand_info["brand_code"],
            "canonical_manufacturer": brand_info["canonical_manufacturer"],
            "manufacturer_code": brand_info["manufacturer_code"],
            "brand_resolution_status": brand_info.get("resolution_status", "EXACT_MATCH"),
            "brand_resolution_source": brand_info.get("resolution_source", "canonical_brands.json"),
            "classpath": classpath or normalized_attributes.get("Item_Type", "Industrial Equipment"),
            "product_title": descriptions["product_title"],
            "invoice_description": descriptions["invoice_description"],
            "mobile_description": descriptions["mobile_description"],
            "long_description": descriptions["long_description"],
            "attributes": normalized_attributes,
            "brand_info": brand_info,
            "mpn_confidence": mpn_conf,
            "lov_stats": lov_stats,
            "traceability": {
                "raw_input": {
                    "mfg_part_num": raw_mpn,
                    "part_desc": raw_desc,
                    "part_manuf": part_manuf,
                    "active_brand_input": active_brand_input
                },
                "transformations": {
                    "extracted_mpn": mpn,
                    "expanded_acronyms_desc": expanded_desc,
                    "uom_normalized_desc": normalized_desc
                },
                "brand_resolution": {
                    "input_brand": active_brand_input or part_manuf,
                    "resolved_brand": brand_info["canonical_brand"],
                    "brand_code": brand_info["brand_code"],
                    "status": brand_info.get("resolution_status", "EXACT_MATCH"),
                    "source": brand_info.get("resolution_source", "canonical_brands.json"),
                    "confidence": brand_info.get("confidence", 0.99)
                },
                "manufacturer_source": {
                    "resolved_manufacturer": brand_info["canonical_manufacturer"],
                    "manufacturer_code": brand_info["manufacturer_code"],
                    "source": "canonical_brands.json / manufacturer_master_catalog"
                },
                "attributes_lov_lineage": lov_lineage
            }
        }

        validation_report = self.validator.validate_record(enriched_payload)
        enriched_payload["validation"] = validation_report
        enriched_payload["overall_confidence"] = validation_report["confidence_score"]
        enriched_payload["needs_human_review"] = validation_report["needs_human_review"]
        enriched_payload["review_required"] = validation_report["needs_human_review"]
        enriched_payload["primary_review_reason"] = validation_report.get("primary_review_reason", "NONE")
        enriched_payload["review_reasons"] = validation_report.get("review_reasons", [])

        return enriched_payload

    def process_batch(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Enriches a batch of raw dictionary records (Backward Compatible)."""
        return [self.process_item(item) for item in items]

    def process_catalog_file(self, file_path: str) -> List[Dict[str, Any]]:
        """Loads and enriches an entire catalog CSV or Excel file (Backward Compatible)."""
        raw_items = self.catalog_parser.parse_file(file_path)
        return self.process_batch(raw_items)

    def _calculate_batch_metrics(self, records: List[CanonicalProductRecord]) -> Dict[str, Any]:
        """Calculates aggregate quality metrics across processed records."""
        total = len(records)
        if total == 0:
            return {}

        invoice_pass = sum(1 for r in records if r.quality.rule_checks.get("invoice_char_limit", True))
        mobile_pass = sum(1 for r in records if r.quality.rule_checks.get("mobile_length_compliance", True))
        uom_pass = sum(1 for r in records if r.quality.rule_checks.get("uom_spacing_compliance", True))
        brand_pass = sum(1 for r in records if r.quality.rule_checks.get("brand_resolution", True))
        review_count = sum(1 for r in records if r.quality.review_required)
        avg_conf = sum(r.quality.confidence for r in records) / total

        return {
            "total_products": total,
            "average_confidence": round(avg_conf * 100.0, 2),
            "invoice_compliance_rate": round(invoice_pass / total * 100, 2),
            "mobile_compliance_rate": round(mobile_pass / total * 100, 2),
            "uom_compliance_rate": round(uom_pass / total * 100, 2),
            "brand_resolution_rate": round(brand_pass / total * 100, 2),
            "human_review_count": review_count,
            "human_review_rate": round(review_count / total * 100, 2)
        }


# Alias for Universal pipeline naming
UniversalDataPipeline = DocumentProcessingPipeline
