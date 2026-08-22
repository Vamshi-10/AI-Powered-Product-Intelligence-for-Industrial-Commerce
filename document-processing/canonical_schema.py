"""
Common Canonical Product Schema for Industrial Commerce
Defines the standard internal representation for all ingested product information
across all 11 supported input modalities (CSV, XLSX, JSON, PDF, Image, URL, Text, Manual, Multi-file).
"""

import os
import sys
import json
from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional, Union


@dataclass
class SourceMetadata:
    """Tracks origin and extraction location of input data."""
    source_type: str = "manual"       # csv | xlsx | json | pdf | image | url | text | manual
    source_name: str = ""             # filename or URL or title
    source_location: str = ""         # page 2, sheet 'Specs' row 14, or URL path
    source_id: str = ""               # identifier or unique hash
    retrieval_status: str = "success" # success | failed | partial | cached
    content_type: str = "text/plain"  # MIME type or document format
    timestamp: str = ""               # Ingestion timestamp


@dataclass
class CanonicalProduct:
    """Normalized core product entity prior to multi-tier description generation."""
    product_name: str = ""
    brand: str = ""
    manufacturer: str = ""
    mpn: str = ""
    description: str = ""
    category: str = ""
    sku: str = ""
    series: str = ""
    item_type: str = ""
    specifications: Dict[str, Any] = field(default_factory=dict)
    attributes: Dict[str, Any] = field(default_factory=dict)


@dataclass
class NormalizedData:
    """Standardized and resolved entity fields."""
    brand: str = ""
    brand_code: str = ""
    manufacturer: str = ""
    manufacturer_code: str = ""
    mpn: str = ""
    uom: str = ""
    attributes: Dict[str, Any] = field(default_factory=dict)
    resolution_status: str = "EXACT_MATCH"
    resolution_source: str = "canonical_brands.json"


@dataclass
class GeneratedContent:
    """5-Tier commercial description content."""
    invoice_description: str = ""
    mobile_description: str = ""
    title: str = ""
    long_description: str = ""
    retail_description: str = ""
    marketing_description: str = ""


@dataclass
class QualityMetadata:
    """Confidence scoring, rule validation, and human review routing."""
    confidence: float = 0.0
    review_required: bool = False
    primary_review_reason: str = "NONE"
    review_reasons: List[str] = field(default_factory=list)
    rule_checks: Dict[str, bool] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)


@dataclass
class CanonicalProductRecord:
    """
    The Single Universal Product Record representation used across the entire platform.
    """
    source: SourceMetadata = field(default_factory=SourceMetadata)
    raw_data: Dict[str, Any] = field(default_factory=dict)
    product: CanonicalProduct = field(default_factory=CanonicalProduct)
    normalized: NormalizedData = field(default_factory=NormalizedData)
    generated: GeneratedContent = field(default_factory=GeneratedContent)
    quality: QualityMetadata = field(default_factory=QualityMetadata)
    traceability: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Serializes to a clean standard dictionary."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CanonicalProductRecord":
        """Deserializes from a standard dictionary."""
        source_data = data.get("source", {})
        product_data = data.get("product", {})
        norm_data = data.get("normalized", {})
        gen_data = data.get("generated", {})
        quality_data = data.get("quality", {})

        return cls(
            source=SourceMetadata(**{k: v for k, v in source_data.items() if k in SourceMetadata.__dataclass_fields__}),
            raw_data=data.get("raw_data", {}),
            product=CanonicalProduct(**{k: v for k, v in product_data.items() if k in CanonicalProduct.__dataclass_fields__}),
            normalized=NormalizedData(**{k: v for k, v in norm_data.items() if k in NormalizedData.__dataclass_fields__}),
            generated=GeneratedContent(**{k: v for k, v in gen_data.items() if k in GeneratedContent.__dataclass_fields__}),
            quality=QualityMetadata(**{k: v for k, v in quality_data.items() if k in QualityMetadata.__dataclass_fields__}),
            traceability=data.get("traceability", {})
        )

    def to_pipeline_input(self) -> Dict[str, Any]:
        """Maps canonical product fields into pipeline raw dictionary format."""
        return {
            "mfg_part_num": self.product.mpn,
            "part_desc": self.product.description or self.product.product_name,
            "part_manuf": self.product.manufacturer,
            "unilog_brand": self.product.brand,
            "classpath": self.product.category,
            "sku": self.product.sku,
            "extra_fields": self.product.attributes,
            "source_type": self.source.source_type,
            "source_name": self.source.source_name,
            "source_location": self.source.source_location
        }

    def apply_pipeline_output(self, pipeline_output: Dict[str, Any]):
        """Populates normalized, generated, quality, and traceability fields from pipeline result."""
        # Normalized entities
        self.normalized.brand = pipeline_output.get("canonical_brand", "")
        self.normalized.brand_code = pipeline_output.get("brand_code", "")
        self.normalized.manufacturer = pipeline_output.get("canonical_manufacturer", "")
        self.normalized.manufacturer_code = pipeline_output.get("manufacturer_code", "")
        self.normalized.mpn = pipeline_output.get("mfg_part_num", self.product.mpn)
        self.normalized.attributes = pipeline_output.get("attributes", {})
        self.normalized.resolution_status = pipeline_output.get("brand_resolution_status", "EXACT_MATCH")
        self.normalized.resolution_source = pipeline_output.get("brand_resolution_source", "canonical_brands.json")

        # Generated descriptions
        self.generated.invoice_description = pipeline_output.get("invoice_description", "")
        self.generated.mobile_description = pipeline_output.get("mobile_description", "")
        self.generated.title = pipeline_output.get("product_title", "")
        self.generated.long_description = pipeline_output.get("long_description", "")
        self.generated.retail_description = f"{self.normalized.attributes.get('Series', '')} {self.normalized.attributes.get('Item_Type', '')}, {self.normalized.mpn}".strip(", ")
        self.generated.marketing_description = self.generated.long_description

        # Quality scoring & Human review
        val = pipeline_output.get("validation", {})
        self.quality.confidence = pipeline_output.get("overall_confidence", 0.0) / 100.0 if pipeline_output.get("overall_confidence", 0.0) > 1.0 else pipeline_output.get("overall_confidence", 0.0)
        self.quality.review_required = pipeline_output.get("needs_human_review", False)
        self.quality.primary_review_reason = pipeline_output.get("primary_review_reason", "NONE")
        self.quality.review_reasons = pipeline_output.get("review_reasons", [])
        self.quality.rule_checks = val.get("rule_checks", {})
        self.quality.warnings = val.get("warnings", [])

        # Traceability & Lineage
        self.traceability = pipeline_output.get("traceability", {})
        self.traceability["source_provenance"] = {
            "source_type": self.source.source_type,
            "source_name": self.source.source_name,
            "source_location": self.source.source_location
        }
