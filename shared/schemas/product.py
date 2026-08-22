"""
Canonical Shared Schemas for AI Product Intelligence Platform
Owned by Vamshi Krishna (AI Engine Developer & Project Lead)
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


class DataStatus(str, Enum):
    KNOWN = "known"
    INFERRED = "inferred"
    UNKNOWN = "unknown"
    CONFLICTING = "conflicting"


class ConfidenceLevel(str, Enum):
    HIGH = "high"          # >= 0.85
    MEDIUM = "medium"      # 0.60 - 0.84
    LOW = "low"            # 0.40 - 0.59
    VERY_LOW = "very_low"  # < 0.40


class Evidence(BaseModel):
    source: str
    source_type: str = "extraction"  # extraction | web_search | catalog | vision | consensus
    source_authority: float = 0.5
    document: Optional[str] = None
    page: Optional[int] = None
    url: Optional[str] = None
    extracted_text: Optional[str] = None


class ProductAttribute(BaseModel):
    name: str
    raw_value: Optional[str] = None
    normalized_value: Optional[str] = None
    uom: Optional[str] = None
    lov_valid: Optional[bool] = None
    status: DataStatus = DataStatus.UNKNOWN
    confidence: float = 0.0
    evidence: List[Evidence] = []
    warnings: List[str] = []


class ProductIdentity(BaseModel):
    product_id: str
    mpn: str
    sku: Optional[str] = None
    alternate_part_number: Optional[str] = None
    manufacturer_raw: Optional[str] = None
    e1_brand_raw: Optional[str] = None
    dib_brand_raw: Optional[str] = None
    unilog_brand_raw: Optional[str] = None
    manufacturer_resolved: Optional[str] = None
    manufacturer_code: Optional[str] = None
    brand_resolved: Optional[str] = None
    brand_code: Optional[str] = None
    trade_name: Optional[str] = None
    manufacturer_confidence: float = 0.0
    brand_confidence: float = 0.0
    resolution_method: Optional[str] = None


class ProductClassification(BaseModel):
    department: Optional[str] = None
    product_class: Optional[str] = None
    fine_category: Optional[str] = None
    classpath: Optional[str] = None
    product_type: Optional[str] = None
    unspsc: Optional[str] = None
    classification_confidence: float = 0.0


class ProductContent(BaseModel):
    invoice_description: Optional[str] = None
    mobile_description: Optional[str] = None
    product_title: Optional[str] = None
    short_description: Optional[str] = None
    long_description: Optional[str] = None
    retail_description: Optional[str] = None
    marketing_description: Optional[str] = None
    features: List[str] = []
    with_text: Optional[str] = None
    standards_approvals: Optional[str] = None
    prop_65: Optional[str] = None
    application: Optional[str] = None
    includes: Optional[str] = None
    product_name: Optional[str] = None


class ValidationResult(BaseModel):
    field: str
    rule: str
    status: str
    message: str
    severity: str = "warning"  # info | warning | error


class DigitalAsset(BaseModel):
    asset_type: str = "image"  # image | document | spec_sheet
    url: Optional[str] = None
    filename: Optional[str] = None
    slot: Optional[str] = "Product Image"


class WebEnrichmentData(BaseModel):
    found_urls: List[str] = []
    scraped_text: str = ""
    spec_table: Dict[str, str] = {}
    images: List[str] = []
    buy_links: List[Dict[str, str]] = []


class ConsensusResult(BaseModel):
    field: str
    resolved_value: str
    vote_distribution: Dict[str, int] = {}
    consensus_strength: float = 1.0
    models_consulted: List[str] = []


class ProductIntelligence(BaseModel):
    identity: ProductIdentity
    classification: ProductClassification = Field(default_factory=ProductClassification)
    attributes: List[ProductAttribute] = []
    content: ProductContent = Field(default_factory=ProductContent)
    digital_assets: List[DigitalAsset] = []
    evidence: List[Evidence] = []
    validations: List[ValidationResult] = []
    web_enrichment: Optional[WebEnrichmentData] = None
    consensus_records: List[ConsensusResult] = []
    overall_confidence: float = 0.0
    confidence_level: ConfidenceLevel = ConfidenceLevel.VERY_LOW
    confidence_signals: Dict[str, float] = {}
    needs_human_review: bool = True
    human_review_reasons: List[str] = []
    cache_hit: bool = False
    cache_similarity: float = 0.0
    processing_status: str = "pending"
    processing_time_ms: int = 0
    error_message: Optional[str] = None
    raw_input: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class RawProduct(BaseModel):
    mfg_part_num: str
    part_desc: str
    e1_brand: Optional[str] = None
    unilog_brand: Optional[str] = None
    dib_brand: Optional[str] = None
    part_manuf: Optional[str] = None
    url: Optional[str] = None
    image_path: Optional[str] = None
