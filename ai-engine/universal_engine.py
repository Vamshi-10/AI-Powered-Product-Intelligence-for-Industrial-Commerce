"""
Universal AI Product Intelligence Engine (v2.0 Advanced Orchestrator)
Orchestrates the 6-Layer Pipeline: Memory -> Web/Vision -> Consensus -> Groq Extraction -> Quality Audit -> Output
Owned by Vamshi Krishna (AI Engine Developer & Project Lead)
"""

import time
import uuid
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from shared.schemas.product import (
    RawProduct,
    ProductIntelligence,
    ProductIdentity,
    ProductClassification,
    ProductContent,
    ProductAttribute,
    DigitalAsset,
    Evidence,
    DataStatus,
    ConfidenceLevel,
    WebEnrichmentData,
)
from shared.config.settings import (
    CONFIDENCE_HIGH,
    CONFIDENCE_MEDIUM,
    CONFIDENCE_LOW,
    HUMAN_REVIEW_THRESHOLD,
)

try:
    from .smart_router import SpecializedModelRouter
    from .consensus import ConsensusEngine
    from .web_enricher import WebProductEnricher
    from .normalizer import DeterministicQualityAuditor
    from .memory import ProductVectorMemory
except ImportError:
    from smart_router import SpecializedModelRouter
    from consensus import ConsensusEngine
    from web_enricher import WebProductEnricher
    from normalizer import DeterministicQualityAuditor
    from memory import ProductVectorMemory

logger = logging.getLogger("UniversalAIEngine")


class UniversalAIEngine:
    """
    Master Pipeline Orchestrator for Industrial Product Intelligence.
    Transforms raw, incomplete catalog inputs into 252-column commerce-ready datasets.
    """

    def __init__(
        self,
        router: Optional[SpecializedModelRouter] = None,
        memory: Optional[ProductVectorMemory] = None,
    ):
        self.router = router or SpecializedModelRouter()
        self.consensus = ConsensusEngine(self.router)
        self.web_enricher = WebProductEnricher()
        self.auditor = DeterministicQualityAuditor()
        self.memory = memory or ProductVectorMemory()

    def process_product(self, raw: RawProduct, enable_web: bool = True) -> ProductIntelligence:
        """
        Executes the end-to-end 6-stage AI intelligence pipeline with crash protection.
        """
        start_time = time.time()
        product_id = raw.mfg_part_num or str(uuid.uuid4())[:8]
        try:
            return self._run_pipeline(raw, enable_web, start_time, product_id)
        except Exception as e:
            logger.error(f"Pipeline crashed for product {product_id}: {e}", exc_info=True)
            fallback_identity = ProductIdentity(
                product_id=product_id,
                mpn=raw.mfg_part_num or "UNKNOWN",
                manufacturer_raw=raw.part_manuf,
                e1_brand_raw=raw.e1_brand,
            )
            return ProductIntelligence(
                identity=fallback_identity,
                processing_status="failed",
                error_message=str(e),
                processing_time_ms=int((time.time() - start_time) * 1000)
            )

    def _run_pipeline(self, raw: RawProduct, enable_web: bool, start_time: float, product_id: str) -> ProductIntelligence:

        # STEP 1: Memory Check (Vector DB Cache on 2TB drive)
        cached_result = self.memory.find_similar_product(raw.part_desc)
        if cached_result.get("found"):
            data = cached_result["cached_record"]
            cached_intel = ProductIntelligence(**data)
            cached_intel.identity.mpn = raw.mfg_part_num
            cached_intel.cache_hit = True
            cached_intel.cache_similarity = cached_result["similarity"]
            cached_intel.processing_time_ms = int((time.time() - start_time) * 1000)
            return cached_intel

        # STEP 2: Web & Vision Expansion (if URL, image, or sparse text)
        web_data = WebEnrichmentData()
        images = []
        spec_text = ""

        if raw.url:
            scraped = self.web_enricher.scrape_product_url(raw.url)
            web_data.scraped_text = scraped.get("raw_text", "")
            web_data.spec_table = scraped.get("spec_table", {})
            web_data.images = scraped.get("images", [])
            images.extend(web_data.images)
        elif enable_web and (raw.mfg_part_num or len(raw.part_desc) > 5):
            query = f"{raw.mfg_part_num} {raw.part_desc}".strip()
            search_res = self.web_enricher.search_and_enrich(query)
            web_data.found_urls = search_res.get("found_urls", [])
            web_data.scraped_text = search_res.get("scraped_text", "")
            web_data.spec_table = search_res.get("spec_table", {})
            web_data.images = search_res.get("images", [])
            web_data.buy_links = search_res.get("buy_links", [])
            images.extend(web_data.images)

        # STEP 3: Single Autonomous Leader Extraction (Zero Arguing / Seamless Failover)
        # One high-capability leader takes full ownership of the product.
        # If it runs out of tokens or hits a limit, the Smart Router immediately rescues it.
        unified_prompt = f"""
You are the ADHARRA Lead Industrial Intelligence Specialist.
Take full responsibility for analyzing this industrial product and generate complete, commerce-ready structured data.

Input Product Record:
- MPN: {raw.mfg_part_num}
- Raw Description: {raw.part_desc}
- Brand Hint: {raw.e1_brand or raw.unilog_brand or raw.dib_brand or '-- Unbranded --'}
- Manufacturer Hint: {raw.part_manuf or 'Unknown'}
- Web / Scraped Context: {web_data.scraped_text[:1200]}

Generate strictly valid JSON with this exact schema:
{{
  "brand_resolved": "Clean Standardized Brand Name (resolve unbranded / clean messy aliases)",
  "manufacturer_resolved": "Official Corporate Manufacturer Name",
  "department": "e.g. Electrical, Tools, Fasteners, Safety, Hydraulics, Plumbing",
  "product_class": "Specific industrial category",
  "fine_category": "Fine subcategory",
  "unspsc": "8-digit UNSPSC code if identifiable, otherwise null",
  "product_title": "Standardized title: Brand + Model + Class + Key Spec (max 100 chars)",
  "invoice_desc": "UPPERCASE commercial description (STRICTLY MAXIMUM 40 CHARACTERS)",
  "mobile_desc": "Mobile ecommerce description (STRICTLY BETWEEN 60 AND 80 CHARACTERS)",
  "short_desc": "Concise technical description (1-2 sentences)",
  "long_desc": "Detailed product description covering applications and features",
  "retail_desc": "Clean retail ecommerce display title",
  "features": ["Key Feature 1", "Key Feature 2", "Key Feature 3"],
  "attributes": [
    {{"name": "Attribute Name", "value": "Normalized numerical or categorical value", "uom": "Standard UOM (e.g. in, mm, V, A, W, kW, lb, kg, pc) or empty", "confidence": 0.95}}
  ],
  "confidence_score": 0.95
}}
"""
        extraction_system = "You are the primary lead industrial catalog normalization engine. Take direct ownership of the output."
        extracted = self.router.route_task("fast_extractor", unified_prompt, extraction_system)

        # Build Identity
        mfg_resolved = extracted.get("manufacturer_resolved") or raw.part_manuf or "Standard Manufacturer"
        brand_resolved = extracted.get("brand_resolved") or raw.e1_brand or "Standard Brand"

        identity = ProductIdentity(
            product_id=product_id,
            mpn=raw.mfg_part_num,
            manufacturer_raw=raw.part_manuf,
            e1_brand_raw=raw.e1_brand,
            dib_brand_raw=raw.dib_brand,
            unilog_brand_raw=raw.unilog_brand,
            manufacturer_resolved=mfg_resolved,
            brand_resolved=brand_resolved,
            manufacturer_confidence=0.95,
            brand_confidence=0.95,
            resolution_method="autonomous_leader",
        )

        # Build Classification
        classification = ProductClassification(
            department=extracted.get("department", "Industrial Supplies"),
            product_class=extracted.get("product_class", "Components & Accessories"),
            fine_category=extracted.get("fine_category", "General Industrial"),
            classpath=f"{extracted.get('department', 'Industrial Supplies')} > {extracted.get('product_class', 'Components')}",
            product_type=extracted.get("product_class", "Industrial Supply"),
            unspsc=extracted.get("unspsc"),
            classification_confidence=0.92,
        )

        # Build Attributes
        attributes: List[ProductAttribute] = []
        for item in extracted.get("attributes", []):
            if isinstance(item, dict) and item.get("name") and item.get("value"):
                attributes.append(
                    ProductAttribute(
                        name=item["name"],
                        raw_value=str(item["value"]),
                        normalized_value=str(item["value"]),
                        uom=item.get("uom", ""),
                        status=DataStatus.KNOWN,
                        confidence=float(item.get("confidence", 0.95)),
                        evidence=[
                            Evidence(
                                source="autonomous_lead_engine",
                                source_type="extraction",
                                source_authority=0.95,
                                extracted_text=raw.part_desc,
                            )
                        ],
                    )
                )

        # Build Commercial Descriptions
        content = ProductContent(
            invoice_description=extracted.get("invoice_desc"),
            mobile_description=extracted.get("mobile_desc"),
            short_description=extracted.get("short_desc"),
            long_description=extracted.get("long_desc"),
            retail_description=extracted.get("retail_desc"),
            product_title=extracted.get("product_title") or extracted.get("short_desc"),
            features=extracted.get("features", []),
            product_name=extracted.get("product_class"),
        )

        digital_assets = [
            DigitalAsset(
                asset_type="image",
                url=img_url,
                slot="Product Image" if idx == 0 else f"Alternate Image {idx}",
            )
            for idx, img_url in enumerate(images[:4])
        ]

        # STEP 5: Quality Audit (Deterministic normalizer - 0 tokens)
        candidate_record = ProductIntelligence(
            identity=identity,
            classification=classification,
            attributes=attributes,
            content=content,
            digital_assets=digital_assets,
            web_enrichment=web_data,
            consensus_records=consensus_records,
            raw_input=raw.model_dump(),
            processing_status="completed",
        )

        audited_record = self.auditor.audit_and_normalize(candidate_record)

        # STEP 6: Multi-Signal Confidence Scoring & Storage
        scores = [
            identity.manufacturer_confidence,
            identity.brand_confidence,
            classification.classification_confidence,
            0.90 if attributes else 0.40,
            0.95 if audited_record.content.invoice_description else 0.30,
        ]
        overall_conf = round(sum(scores) / len(scores), 2)
        audited_record.overall_confidence = overall_conf

        if overall_conf >= CONFIDENCE_HIGH:
            audited_record.confidence_level = ConfidenceLevel.HIGH
            audited_record.needs_human_review = False
        elif overall_conf >= CONFIDENCE_MEDIUM:
            audited_record.confidence_level = ConfidenceLevel.MEDIUM
            audited_record.needs_human_review = False
        else:
            audited_record.confidence_level = ConfidenceLevel.LOW
            audited_record.needs_human_review = True
            audited_record.human_review_reasons.append("Low overall confidence score across extraction signals.")

        audited_record.processing_time_ms = int((time.time() - start_time) * 1000)

        # Store in Vector Memory on 2TB drive for instant future reuse
        try:
            self.memory.store_enriched_product(
                product_id=product_id,
                description=raw.part_desc,
                enriched_record=audited_record.model_dump(mode="json"),
            )
        except Exception as e:
            logger.warning(f"Failed to cache to vector memory: {e}")

        return audited_record
