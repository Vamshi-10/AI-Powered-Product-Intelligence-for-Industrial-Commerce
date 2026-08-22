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
        Executes the end-to-end 6-stage AI intelligence pipeline.
        """
        start_time = time.time()
        product_id = raw.mfg_part_num or str(uuid.uuid4())[:8]

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

        # STEP 3: Identity & Brand Resolution (Consensus Engine)
        mfg_resolved, brand_resolved, consensus_records = self.consensus.resolve_identity_consensus(
            part_desc=raw.part_desc,
            mpn=raw.mfg_part_num,
            distributor_raw=raw.part_manuf or "",
            e1_brand_raw=raw.e1_brand or "",
        )

        identity = ProductIdentity(
            product_id=product_id,
            mpn=raw.mfg_part_num,
            manufacturer_raw=raw.part_manuf,
            e1_brand_raw=raw.e1_brand,
            dib_brand_raw=raw.dib_brand,
            unilog_brand_raw=raw.unilog_brand,
            manufacturer_resolved=mfg_resolved,
            brand_resolved=brand_resolved,
            manufacturer_confidence=consensus_records[0].consensus_strength if consensus_records else 0.85,
            brand_confidence=consensus_records[1].consensus_strength if len(consensus_records) > 1 else 0.85,
            resolution_method="consensus_mesh",
        )

        # STEP 4: High-Speed Classification, Attributes & Descriptions (Groq Llama 3.3 70B)
        extraction_prompt = f"""
Analyze this industrial product and generate structured commerce intelligence:
Product Description: {raw.part_desc}
MPN: {raw.mfg_part_num}
Resolved Manufacturer: {mfg_resolved}
Resolved Brand: {brand_resolved}
Web Context: {web_data.scraped_text[:1500]}
Specifications Scraped: {web_data.spec_table}

Output strictly valid JSON with the following structure:
{{
  "department": "Tools / Lighting / Appliances / Building Materials / Electrical / Abrasives",
  "product_class": "e.g., Power Tools",
  "fine_category": "e.g., Cut-Off Wheels",
  "classpath": "Department > Class > Fine Category",
  "product_type": "e.g., Cut-Off Disc",
  "attributes": [
    {{"name": "Diameter", "value": "5", "uom": "in", "confidence": 0.95}},
    {{"name": "Thickness", "value": "0.045", "uom": "in", "confidence": 0.95}},
    {{"name": "Arbor Size", "value": "7/8", "uom": "in", "confidence": 0.90}}
  ],
  "invoice_desc": "MILW 5X.045X7/8 METAL CUT OFF DISC",
  "mobile_desc": "Milwaukee 5 in. x 0.045 in. x 7/8 in. Metal Cut-Off Wheel",
  "short_desc": "Milwaukee® 49-94-0013 5 in. Metal Cut-Off Disc for Angle Grinders",
  "long_desc": "High-performance metal cut-off wheel engineered for fast, clean cuts in steel, stainless steel, and ferrous metals.",
  "retail_desc": "Milwaukee 5-Inch Metal Cutting Disc",
  "features": [
    "Fast cutting speed with extended wheel life",
    "Optimized for angle grinders with 7/8 in. arbor"
  ]
}}
"""
        extraction_system = "You are a professional industrial product taxonomy and content generation engine. Evidence before generation."
        extracted = self.router.route_task("fast_extractor", extraction_prompt, extraction_system)

        classification = ProductClassification(
            department=extracted.get("department", "Tools"),
            product_class=extracted.get("product_class", "Accessories"),
            fine_category=extracted.get("fine_category", "General"),
            classpath=extracted.get("classpath", "Tools > Accessories > General"),
            product_type=extracted.get("product_type", "Industrial Supply"),
            classification_confidence=0.88,
        )

        attributes: List[ProductAttribute] = []
        for item in extracted.get("attributes", []):
            if isinstance(item, dict) and item.get("name") and item.get("value"):
                attributes.append(
                    ProductAttribute(
                        name=item["name"],
                        raw_value=str(item["value"]),
                        normalized_value=str(item["value"]),
                        uom=item.get("uom"),
                        status=DataStatus.KNOWN,
                        confidence=float(item.get("confidence", 0.85)),
                        evidence=[
                            Evidence(
                                source="ai_model_mesh",
                                source_type="extraction",
                                source_authority=0.9,
                                extracted_text=raw.part_desc,
                            )
                        ],
                    )
                )

        content = ProductContent(
            invoice_description=extracted.get("invoice_desc"),
            mobile_description=extracted.get("mobile_desc"),
            short_description=extracted.get("short_desc"),
            long_description=extracted.get("long_desc"),
            retail_description=extracted.get("retail_desc"),
            product_title=extracted.get("short_desc"),
            features=extracted.get("features", []),
            product_name=extracted.get("product_type"),
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
