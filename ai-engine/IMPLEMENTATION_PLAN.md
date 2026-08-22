# AI ENGINE — Complete Implementation Plan (0% → 100%)

> **READ THIS FIRST**: This file contains EVERYTHING needed to build the AI Engine module from scratch. It is the intelligence core of an "AI Product Data Intelligence Platform" that takes messy industrial product descriptions and produces enriched, validated, commerce-ready product records.

---

## TABLE OF CONTENTS
1. [Project Context](#1-project-context)
2. [What This Module Does](#2-what-this-module-does)
3. [Technology Stack](#3-technology-stack)
4. [Folder Structure](#4-folder-structure)
5. [Shared Schema (This Module Owns It)](#5-shared-schema)
6. [File-by-File Implementation](#6-file-by-file-implementation)
7. [Prompt Templates](#7-prompt-templates)
8. [Integration Contracts](#8-integration-contracts)
9. [Testing Strategy](#9-testing-strategy)
10. [Build Order](#10-build-order)

---

## 1. PROJECT CONTEXT

### The Business Problem
A hardware distributor has 1,000 messy product rows like:
```
MPN: 49-94-0013
Desc: "49-94-0013 Milw 5""x.045""x7/8"" Metal Cut Off Disc"
Part_Manuf: "Milwaukee Accessory (4031)"
E1_Brand: "-- Unbranded --"
DIB_Brand: "-- No DIB Brand --"
```

The system must produce a 252-column enriched record including:
- Resolved manufacturer name (e.g., "Milwaukee Tool")
- Resolved brand name (e.g., "Milwaukee®")
- Product classification (e.g., "Abrasives > Cut-Off Wheels > Metal Cut-Off Discs")
- Extracted attributes (Diameter: 5 in, Thickness: 0.045 in, Arbor: 7/8 in)
- Generated descriptions in 5+ formats (invoice ≤40 chars ALL CAPS, mobile 60-80 chars, short, long, retail)
- Validation results (LOV compliance, UOM compliance, character limits)
- Confidence score (0.0 - 1.0) based on 7 weighted signals

### Critical Rules
1. **EVIDENCE BEFORE GENERATION** — Never invent data. Extract from input or reference sources only.
2. **DETERMINISTIC WHERE POSSIBLE** — UOM lookup, fraction conversion, LOV validation = pure Python. LLM only for classification, extraction, generation.
3. **Part_Manuf is the DISTRIBUTOR, not the manufacturer** — Must resolve actual product manufacturer from desc/MPN/brand signals.
4. **Confidence from signals, not LLM self-assessment** — Weighted formula over 7 measurable signals.

### Hardware Constraint
- NVIDIA RTX 4060 with 8GB VRAM
- Primary model: Qwen2.5-7B-Instruct (Q4_K_M) via Ollama (~4.5GB VRAM)

### Input Data (6 columns)
```csv
Mfg_Part_Num,Part_Desc,E1_Brand,Unilog_Brand,DIB_Brand,Part_Manuf
```

### Product Categories in the Dataset
| Category | ~Count | Key Brands |
|----------|--------|------------|
| LED Bulbs/Lighting | ~200 | Philips, Satco, Kichler, Feit |
| Composite Decking | ~150 | Trex, TimberTech/Azek |
| Power Tools | ~120 | Milwaukee, DeWalt, Makita, Kreg, Festool |
| Appliances | ~80 | GE/Café, Frigidaire, Whirlpool, LG, KitchenAid |
| Abrasives | ~60 | Milwaukee, Diablo/Freud, 3M, Mirka |
| Electrical | ~40 | Leviton, Southwire, Square D |

---

## 2. WHAT THIS MODULE DOES

### The Pipeline (7 stages)
```
RawProduct (6 fields)
  → Stage 1: Manufacturer & Brand Resolution  [DETERMINISTIC + FUZZY + optional LLM]
  → Stage 2: Product Classification            [LLM]
  → Stage 3: Attribute Extraction              [REGEX + LLM]
  → Stage 4: Attribute Normalization            [DETERMINISTIC]
  → Stage 5: Content Generation                [LLM + TEMPLATES]
  → Stage 6: Validation                        [DETERMINISTIC]
  → Stage 7: Confidence Scoring                [DETERMINISTIC]
  → ProductIntelligence (enriched record)
```

### Single Entry Point
```python
from ai_engine.engine import AIEngine
engine = AIEngine(reference_data_service)
result: ProductIntelligence = engine.process_product(raw_product)
```

---

## 3. TECHNOLOGY STACK

### Python Packages
```
pydantic>=2.0
httpx>=0.25.0
rapidfuzz>=3.0
```

### External Services
- **Ollama** at `http://localhost:11434`
- Install: `winget install Ollama.Ollama`
- Pull model: `ollama pull qwen2.5:7b-instruct-q4_K_M`

---

## 4. FOLDER STRUCTURE

```
ai_engine/
├── __init__.py               # Exports AIEngine class
├── engine.py                 # Main pipeline orchestrator
├── llm_client.py             # Ollama abstraction
├── resolver.py               # Manufacturer & brand resolution
├── classifier.py             # Product classification
├── extractor.py              # Attribute extraction
├── normalizer.py             # UOM/fraction/LOV normalization (deterministic)
├── generator.py              # Description generation (5 formats)
├── validator.py              # Rule-based validation
├── confidence.py             # Multi-signal confidence scoring
└── prompts/
    ├── classify.txt
    ├── extract_attributes.txt
    ├── generate_descriptions.txt
    └── resolve_manufacturer.txt

shared/
├── __init__.py
├── schemas/
│   ├── __init__.py
│   └── product.py            # ALL Pydantic models (this module OWNS this)
└── config/
    ├── __init__.py
    └── settings.py           # All configuration constants
```

---

## 5. SHARED SCHEMA

**This module OWNS `shared/schemas/product.py`.** All other modules import from here.

### File: `shared/schemas/product.py`
```python
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
    source_type: str
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
    severity: str


class DigitalAsset(BaseModel):
    asset_type: str
    url: Optional[str] = None
    filename: Optional[str] = None
    slot: Optional[str] = None


class ProductIntelligence(BaseModel):
    identity: ProductIdentity
    classification: ProductClassification = ProductClassification()
    attributes: List[ProductAttribute] = []
    content: ProductContent = ProductContent()
    digital_assets: List[DigitalAsset] = []
    evidence: List[Evidence] = []
    validations: List[ValidationResult] = []
    overall_confidence: float = 0.0
    confidence_level: ConfidenceLevel = ConfidenceLevel.VERY_LOW
    confidence_signals: Dict[str, float] = {}
    needs_human_review: bool = True
    human_review_reasons: List[str] = []
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
```

### File: `shared/config/settings.py`
```python
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
REFERENCE_DIR = DATA_DIR / "reference"

OLLAMA_BASE_URL = "http://localhost:11434"
LLM_MODEL = "qwen2.5:7b-instruct-q4_K_M"
LLM_TEMPERATURE = 0.1
LLM_JSON_TEMPERATURE = 0.0
LLM_MAX_TOKENS = 2048
LLM_TIMEOUT_SECONDS = 120

PLACEHOLDER_VALUES = {
    "-- Unbranded --", "-- No Unilog Brand --",
    "-- No DIB Brand --", "-", "", "COMMODITY - UNBRANDED",
}

CONFIDENCE_HIGH = 0.85
CONFIDENCE_MEDIUM = 0.60
CONFIDENCE_LOW = 0.40
HUMAN_REVIEW_THRESHOLD = 0.70

INVOICE_DESC_MAX_CHARS = 40
MOBILE_DESC_MIN_CHARS = 60
MOBILE_DESC_MAX_CHARS = 80
SHORT_DESC_MAX_CHARS = 150
LONG_DESC_MAX_CHARS = 750

API_HOST = "0.0.0.0"
API_PORT = 8000
FRONTEND_URL = "http://localhost:5173"
```

---

## 6. FILE-BY-FILE IMPLEMENTATION

### File: `ai_engine/__init__.py`
```python
from .engine import AIEngine
```

### File: `ai_engine/llm_client.py`
```python
import json
import time
import httpx
from typing import Optional
from shared.config.settings import (
    OLLAMA_BASE_URL, LLM_MODEL, LLM_TEMPERATURE,
    LLM_JSON_TEMPERATURE, LLM_TIMEOUT_SECONDS
)


class LLMClient:
    def __init__(self, base_url=OLLAMA_BASE_URL, model=LLM_MODEL, timeout=LLM_TIMEOUT_SECONDS):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.client = httpx.Client(timeout=timeout)

    def is_available(self) -> bool:
        try:
            resp = self.client.get(f"{self.base_url}/api/tags")
            if resp.status_code == 200:
                models = [m["name"] for m in resp.json().get("models", [])]
                return any(self.model in m for m in models)
            return False
        except Exception:
            return False

    def generate(self, prompt: str, system: str = "", temperature: Optional[float] = None, max_retries: int = 2) -> str:
        temp = temperature if temperature is not None else LLM_TEMPERATURE
        for attempt in range(max_retries + 1):
            try:
                response = self.client.post(
                    f"{self.base_url}/api/generate",
                    json={"model": self.model, "prompt": prompt, "system": system,
                          "temperature": temp, "stream": False}
                )
                response.raise_for_status()
                return response.json().get("response", "")
            except Exception as e:
                if attempt == max_retries:
                    raise RuntimeError(f"LLM failed: {e}")
                time.sleep(2 ** attempt)

    def generate_json(self, prompt: str, system: str = "", max_retries: int = 3) -> dict:
        for attempt in range(max_retries + 1):
            try:
                response = self.client.post(
                    f"{self.base_url}/api/generate",
                    json={"model": self.model, "prompt": prompt, "system": system,
                          "temperature": LLM_JSON_TEMPERATURE, "stream": False, "format": "json"}
                )
                response.raise_for_status()
                text = response.json().get("response", "{}")
                text = text.strip()
                if text.startswith("```json"): text = text[7:]
                if text.startswith("```"): text = text[3:]
                if text.endswith("```"): text = text[:-3]
                return json.loads(text.strip())
            except json.JSONDecodeError:
                if attempt == max_retries: return {}
                prompt += "\n\nIMPORTANT: Respond with ONLY valid JSON."
            except Exception as e:
                if attempt == max_retries: return {}
                time.sleep(2 ** attempt)
        return {}
```

### File: `ai_engine/resolver.py`

This is the HARDEST file — resolves actual manufacturer/brand from distributor info.

```python
import re
import uuid
from typing import Optional, Tuple
from rapidfuzz import fuzz, process
from shared.schemas.product import RawProduct, ProductIdentity, Evidence, DataStatus
from shared.config.settings import PLACEHOLDER_VALUES


class ManufacturerBrandResolver:
    def __init__(self, manufacturer_brand_index: dict, llm_client=None):
        self.index = manufacturer_brand_index
        self.llm = llm_client

        # Part_Desc abbreviations → brand
        self.brand_abbreviations = {
            "milw": "MILWAUKEE", "dew": "DEWALT", "mak": "MAKITA",
            "diablo": "DIABLO", "kichler": "KICHLER", "satco": "SATCO",
            "leviton": "LEVITON", "hunter": "HUNTER", "festool": "FESTOOL",
            "kreg": "KREG", "trex": "TREX", "timbertech": "TIMBERTECH",
            "azek": "TIMBERTECH", "frigidaire": "FRIGIDAIRE",
            "whirlpool": "WHIRLPOOL", "kitchenaid": "KITCHENAID",
            "cafe": "CAFE", "philips": "PHILIPS", "feit": "FEIT ELECTRIC",
            "dremel": "DREMEL", "mirka": "MIRKA", "senco": "SENCO",
            "vessel": "VESSEL", "wera": "WERA", "irwin": "IRWIN",
            "velux": "VELUX", "provia": "PROVIA", "hardie": "JAMES HARDIE",
            "smartside": "LP SMARTSIDE", "ge ": "GE APPLIANCES",
            "lg ": "LG", "sq ": "SPEED QUEEN",
        }

        # MPN prefix patterns → brand
        self.mpn_patterns = [
            (r'^DC[A-Z]{1,4}\d', "DEWALT"), (r'^DW[A-Z]?\d', "DEWALT"),
            (r'^DWMT', "DEWALT"), (r'^DWHT', "DEWALT"),
            (r'^\d{4}-\d{2}$', "MILWAUKEE"), (r'^48-\d{2}-\d{4}', "MILWAUKEE"),
            (r'^49-\d{2}-\d{4}', "MILWAUKEE"), (r'^X[A-Z]{2,3}\d{2}', "MAKITA"),
            (r'^BL1\d{3}', "MAKITA"), (r'^GSL\d{2}', "MAKITA"),
            (r'^KPT', "KREG"), (r'^D\d{4}[A-Z]', "DIABLO"),
            (r'^DBD', "DIABLO"), (r'^DPH\d', "DIABLO"),
            (r'^DSQ\d', "DIABLO"), (r'^DT\d{2}', "DIABLO"),
            (r'^5\d{5}', "PHILIPS"), (r'^S\d{5}', "SATCO"),
            (r'^62-\d{4}', "SATCO"), (r'^65-\d{3}', "SATCO"),
            (r'^543\d{6}', "TREX"), (r'^1513\d{3}', "TREX"),
            (r'^1516\d{3}', "TREX"), (r'^A[DG]B?\d{5}', "TIMBERTECH"),
            (r'^PDT\d{3}', "GE APPLIANCES"), (r'^GNE\d{2}', "GE APPLIANCES"),
            (r'^C[79][A-Z]{4}', "CAFE"), (r'^PDSH\d{4}', "FRIGIDAIRE"),
            (r'^WDTS\d{4}', "WHIRLPOOL"), (r'^LSEL\d{4}', "LG"),
            (r'^LDPH\d{4}', "LG"), (r'^KDTS\d{3}', "KITCHENAID"),
            (r'^HOM\d{4}', "SQUARE D"), (r'^QO\d{3}', "SQUARE D"),
            (r'^AYCL', "LUTRON"),
        ]

    def resolve(self, raw: RawProduct) -> ProductIdentity:
        identity = ProductIdentity(
            product_id=str(uuid.uuid4())[:8], mpn=raw.mfg_part_num,
            manufacturer_raw=raw.part_manuf, e1_brand_raw=raw.e1_brand,
            dib_brand_raw=raw.dib_brand, unilog_brand_raw=raw.unilog_brand,
        )
        dist_name, dist_code = self._parse_part_manuf(raw.part_manuf or "")

        candidates = []
        if raw.dib_brand and raw.dib_brand.strip() not in PLACEHOLDER_VALUES:
            candidates.append(("dib_brand", raw.dib_brand.strip(), 0.95))
        if raw.e1_brand and raw.e1_brand.strip() not in PLACEHOLDER_VALUES:
            candidates.append(("e1_brand", raw.e1_brand.strip(), 0.90))
        desc_brand = self._extract_brand_from_desc(raw.part_desc)
        if desc_brand:
            candidates.append(("desc_extraction", desc_brand, 0.75))
        mpn_brand = self._match_mpn_pattern(raw.mfg_part_num)
        if mpn_brand:
            candidates.append(("mpn_pattern", mpn_brand, 0.70))
        if dist_name and dist_name not in PLACEHOLDER_VALUES:
            candidates.append(("part_manuf", dist_name, 0.30))

        best_match, best_method, best_conf = None, None, 0.0
        for method, candidate, priority in candidates:
            match = self._lookup_brand(candidate)
            if match and priority > best_conf:
                best_match, best_method, best_conf = match, method, min(priority, 0.95)
        if not best_match:
            for method, candidate, priority in candidates:
                match = self._fuzzy_match_brand(candidate)
                if match:
                    conf = min(priority * 0.85, 0.85)
                    if conf > best_conf:
                        best_match, best_method, best_conf = match, f"{method}_fuzzy", conf

        if best_match:
            identity.manufacturer_resolved = best_match.get("manufacturer_name", "")
            identity.manufacturer_code = best_match.get("manufacturer_code", "")
            identity.brand_resolved = best_match.get("brand_name", "")
            identity.brand_code = best_match.get("brand_code", "")
            identity.manufacturer_confidence = best_conf
            identity.brand_confidence = best_conf
            identity.resolution_method = best_method
        else:
            identity.manufacturer_resolved = dist_name or "Unknown"
            identity.manufacturer_confidence = 0.20
            identity.brand_confidence = 0.10
            identity.resolution_method = "fallback_distributor"
        return identity

    def _parse_part_manuf(self, pm: str) -> Tuple[str, str]:
        if not pm or pm.strip() in PLACEHOLDER_VALUES: return "", ""
        m = re.match(r'^(.+?)\s*\(([^)]+)\)\s*$', pm.strip())
        return (m.group(1).strip(), m.group(2).strip()) if m else (pm.strip(), "")

    def _extract_brand_from_desc(self, desc: str) -> Optional[str]:
        dl = desc.lower()
        for abbr, brand in self.brand_abbreviations.items():
            if abbr in dl: return brand
        return None

    def _match_mpn_pattern(self, mpn: str) -> Optional[str]:
        for pattern, brand in self.mpn_patterns:
            if re.match(pattern, mpn, re.IGNORECASE): return brand
        return None

    def _lookup_brand(self, candidate: str) -> Optional[dict]:
        clean = candidate.replace("®", "").replace("™", "").strip().upper()
        return self.index.get("brand_names", {}).get(clean)

    def _fuzzy_match_brand(self, candidate: str, threshold: int = 82) -> Optional[dict]:
        clean = candidate.replace("®", "").replace("™", "").strip().upper()
        all_brands = self.index.get("all_brand_names", [])
        if not all_brands: return None
        result = process.extractOne(clean, all_brands, scorer=fuzz.ratio, score_cutoff=threshold)
        return self.index.get("brand_names", {}).get(result[0]) if result else None
```

### File: `ai_engine/classifier.py`
```python
from typing import Optional, List
from shared.schemas.product import ProductClassification
import re

class ProductClassifier:
    def __init__(self, classpath_list: List[str], llm_client):
        self.classpaths = classpath_list
        self.llm = llm_client
        self._groups = {}
        for cp in self.classpaths:
            dept = cp.split(">")[0].strip()
            self._groups.setdefault(dept, []).append(cp)

    def classify(self, part_desc: str, brand: str = "", manufacturer: str = "", mpn: str = "") -> ProductClassification:
        dept = self._classify_department(part_desc)
        candidates = self._groups.get(dept, self.classpaths[:200])
        classpath = self._classify_classpath(part_desc, brand, manufacturer, candidates[:50])

        result = ProductClassification()
        if classpath:
            parts = [p.strip() for p in classpath.split(">")]
            result.department = parts[0] if len(parts) > 0 else None
            result.product_class = parts[1] if len(parts) > 1 else None
            result.fine_category = parts[2] if len(parts) > 2 else None
            result.classpath = classpath
            result.classification_confidence = 0.80
        else:
            result.classification_confidence = 0.20

        result.product_type = self._extract_product_type(part_desc)
        return result

    def _classify_department(self, desc: str) -> str:
        dl = desc.lower()
        kw_map = {
            "Tools": ["drill", "saw", "grinder", "sander", "nailer", "driver", "wrench", "router"],
            "Lighting": ["bulb", "led", "light", "lamp", "chandelier", "pendant", "ceiling", "downlight"],
            "Appliances": ["dishwasher", "dryer", "washer", "fridge", "refrigerator", "range", "oven", "microwave", "freezer"],
            "Building Materials": ["decking", "fascia", "siding", "drywall", "sheathing", "lumber"],
            "Electrical": ["outlet", "switch", "wire", "cable", "breaker", "dimmer", "timer", "gfci"],
            "Abrasives": ["sanding", "cut off disc", "grinding wheel", "abrasive", "abranet"],
        }
        for dept, kws in kw_map.items():
            if any(kw in dl for kw in kws): return dept
        departments = list(self._groups.keys())
        prompt = f"Classify into ONE department.\nProduct: {desc}\nDepartments: {', '.join(departments[:30])}\nRespond with ONLY the department name."
        result = self.llm.generate(prompt, temperature=0.0).strip()
        for d in departments:
            if d.lower() in result.lower(): return d
        return departments[0] if departments else "General"

    def _classify_classpath(self, desc, brand, mfg, candidates):
        prompt = f"""Classify this product into the MOST SPECIFIC category path.\n\nProduct: {desc}\nBrand: {brand}\nManufacturer: {mfg}\n\nOptions:\n{chr(10).join(f'- {cp}' for cp in candidates)}\n\nRespond with JSON: {{"classpath": "exact path from list"}}"""
        result = self.llm.generate_json(prompt)
        cp = result.get("classpath", "")
        if cp in candidates: return cp
        from rapidfuzz import process as fp, fuzz as fs
        m = fp.extractOne(cp, candidates, scorer=fs.ratio, score_cutoff=70)
        return m[0] if m else (candidates[0] if candidates else None)

    def _extract_product_type(self, desc: str) -> Optional[str]:
        patterns = [
            r'(?:Dishwasher|Dryer|Washer|Refrigerator|Fridge|Microwave|Range|Oven|Freezer)',
            r'(?:Drill|Saw|Grinder|Sander|Nailer|Driver|Wrench|Ratchet|Router)',
            r'(?:Bulb|Light|Lamp|Fan|Chandelier|Pendant|Downlight)',
            r'(?:Decking|Fascia|Railing|Siding)',
            r'(?:Cut Off Disc|Grinding Wheel|Sanding Belt)',
            r'(?:Outlet|Switch|Dimmer|Timer|Wire)',
        ]
        for p in patterns:
            m = re.search(p, desc, re.IGNORECASE)
            if m: return m.group(0)
        return None
```

### File: `ai_engine/extractor.py`
```python
import re
from typing import List, Optional
from shared.schemas.product import ProductAttribute, Evidence, DataStatus

class AttributeExtractor:
    def __init__(self, lov_by_classpath: dict, llm_client):
        self.lov = lov_by_classpath
        self.llm = llm_client

    def extract(self, part_desc: str, classpath: str = "", brand: str = "", mpn: str = "") -> List[ProductAttribute]:
        attrs = self._extract_regex(part_desc)
        cat_spec = self.lov.get(classpath, {})
        expected = cat_spec.get("required", []) + cat_spec.get("optional", [])
        extracted_names = {a.name.lower() for a in attrs}
        remaining = [a for a in expected if a.lower() not in extracted_names]
        if remaining:
            attrs.extend(self._extract_llm(part_desc, remaining, brand, classpath))
        attrs.extend(self._extract_universal(part_desc, extracted_names))
        return attrs

    def _extract_regex(self, desc: str) -> List[ProductAttribute]:
        attrs = []
        # Voltage
        m = re.search(r'(\d+)\s*[Vv](?:olt)?(?:\b|$)', desc)
        if m: attrs.append(self._mk("Voltage Rating", m.group(1), "V", 0.95, desc))
        # Amperage
        m = re.search(r'(\d+)\s*[Aa](?:mp)?(?:\b|$)', desc)
        if m: attrs.append(self._mk("Amperage Rating", m.group(1), "A", 0.90, desc))
        # Wattage
        m = re.search(r'(\d+)\s*[Ww](?:att)?(?:\b|$)', desc)
        if m: attrs.append(self._mk("Wattage", m.group(1), "W", 0.90, desc))
        # Grit
        m = re.search(r'(?:P(\d+)|(\d+)\s*[Gg]rit)', desc)
        if m: attrs.append(self._mk("Grit", m.group(1) or m.group(2), None, 0.95, desc))
        # Piece count
        m = re.search(r'(\d+)\s*(?:pc|pk|pack)', desc, re.I)
        if m: attrs.append(self._mk("Package Quantity", m.group(1), "EA", 0.90, desc))
        # Length in feet
        m = re.search(r"(\d+(?:-\d+/\d+)?)\s*['\u2019]", desc)
        if m: attrs.append(self._mk("Length", m.group(1), "ft", 0.85, desc))
        # Color temp
        m = re.search(r'(\d{2})[Kk](?:\b|$)', desc)
        if m: attrs.append(self._mk("Color Temperature", str(int(m.group(1))*100), "K", 0.90, desc))
        # Sound level
        m = re.search(r'(\d+)\s*dBA', desc)
        if m: attrs.append(self._mk("Sound Level", m.group(1), "dBA", 0.95, desc))
        return attrs

    def _extract_universal(self, desc: str, done: set) -> List[ProductAttribute]:
        attrs = []
        dl = desc.lower()
        if "color" not in done:
            cm = {" ss": "Stainless Steel", " wh": "White", " bk": "Black",
                  " bss": "Black Stainless Steel", " bn": "Brushed Nickel", " mb": "Matte Black"}
            for k, v in cm.items():
                if k in dl:
                    attrs.append(self._mk("Color", v, None, 0.70, desc))
                    break
        if "material" not in done:
            mm = {"metal": "Metal", "stainless steel": "Stainless Steel", "masonry": "Masonry",
                  "pvc": "PVC", "aluminum": "Aluminum", "ceramic": "Ceramic"}
            for k, v in mm.items():
                if k in dl:
                    attrs.append(self._mk("Material", v, None, 0.75, desc))
                    break
        return attrs

    def _extract_llm(self, desc, expected, brand, classpath) -> List[ProductAttribute]:
        prompt = f"""Extract attributes from this product description.\n\nProduct: {desc}\nBrand: {brand}\nCategory: {classpath}\n\nExtract ONLY these (if present):\n{chr(10).join(f'- {a}' for a in expected[:20])}\n\nRules: Extract ONLY explicit info. Set null if not present. Include UOM.\n\nJSON: {{"attributes": [{{"name": "...", "value": "...", "uom": "...", "confidence": 0.85}}]}}"""
        result = self.llm.generate_json(prompt)
        return [self._mk(a["name"], str(a["value"]), a.get("uom"), float(a.get("confidence", 0.6)), desc)
                for a in result.get("attributes", []) if a.get("value") and a["value"] != "null"]

    def _mk(self, name, value, uom, conf, src) -> ProductAttribute:
        return ProductAttribute(
            name=name, raw_value=value, normalized_value=value, uom=uom,
            status=DataStatus.KNOWN if conf >= 0.85 else DataStatus.INFERRED,
            confidence=conf, evidence=[Evidence(source="extraction", source_type="extraction",
            source_authority=0.9 if conf >= 0.85 else 0.6, extracted_text=src[:200])])
```

### File: `ai_engine/normalizer.py`
```python
from typing import Optional
from shared.schemas.product import ProductAttribute

class ValueNormalizer:
    def __init__(self, uom_lookup: dict, fraction_lookup: dict, lov_values: dict):
        self.uom_lookup = {k.lower().strip(): v for k, v in uom_lookup.items()}
        self.fraction_lookup = fraction_lookup
        self.lov_values = lov_values

    def normalize_attribute(self, attr: ProductAttribute) -> ProductAttribute:
        if attr.uom:
            attr.uom = self.uom_lookup.get(attr.uom.lower().strip().rstrip("."), attr.uom.strip())
        if attr.raw_value:
            attr.normalized_value = self._normalize_value(attr.name, attr.raw_value)
            attr.lov_valid = self._check_lov(attr.name, attr.normalized_value)
            if attr.lov_valid is False:
                attr.warnings.append(f"Value '{attr.normalized_value}' not in LOV for '{attr.name}'")
        return attr

    def _normalize_value(self, name: str, val: str) -> str:
        lov_map = self.lov_values.get(name, {})
        if val.strip().upper() in {k.upper(): k for k in lov_map}:
            for k, v in lov_map.items():
                if k.upper() == val.strip().upper(): return v
        try:
            num = float(val)
            if num == int(num): return str(int(num))
            whole = int(num)
            frac = self.fraction_lookup.get(round(num - whole, 6))
            if frac: return f"{whole}-{frac}" if whole else frac
        except ValueError: pass
        return val

    def _check_lov(self, name: str, value: str) -> Optional[bool]:
        lov_map = self.lov_values.get(name)
        if lov_map is None: return None
        approved = {v.upper() for v in lov_map.values()}
        return value.upper() in approved
```

### File: `ai_engine/generator.py`
```python
from typing import List
from shared.schemas.product import ProductIdentity, ProductClassification, ProductAttribute, ProductContent
from shared.config.settings import INVOICE_DESC_MAX_CHARS

class ContentGenerator:
    def __init__(self, content_rules: dict, llm_client):
        self.rules = content_rules
        self.llm = llm_client

    def generate(self, identity: ProductIdentity, classification: ProductClassification,
                 attributes: List[ProductAttribute]) -> ProductContent:
        content = ProductContent()
        facts = self._facts(identity, classification, attributes)
        content.invoice_description = self._invoice(facts)
        llm = self._llm_descs(facts)
        content.mobile_description = llm.get("mobile_desc", "")
        content.product_title = llm.get("short_desc", "")
        content.long_description = llm.get("long_desc", "")
        content.retail_description = llm.get("retail_desc", "")
        content.product_name = classification.product_type or ""
        return content

    def _facts(self, i, c, attrs):
        ad = {}
        for a in attrs:
            v = a.normalized_value or a.raw_value
            if v: ad[a.name] = f"{v} {a.uom}" if a.uom else v
        return {"mpn": i.mpn, "manufacturer": i.manufacturer_resolved or "",
                "brand": i.brand_resolved or "", "product_type": c.product_type or "",
                "classpath": c.classpath or "", "attributes": ad}

    def _invoice(self, f):
        parts = [f.get("product_type", "").upper()]
        for k in ["Material", "Voltage Rating", "Diameter", "Color"]:
            if k in f["attributes"]:
                v = f["attributes"][k].replace("Stainless Steel", "SST").upper()
                parts.append(v)
        desc = " ".join(p for p in parts if p)
        return desc[:INVOICE_DESC_MAX_CHARS].rsplit(" ", 1)[0].upper() if len(desc) > INVOICE_DESC_MAX_CHARS else desc.upper()

    def _llm_descs(self, f):
        al = "\n".join(f"  - {k}: {v}" for k, v in f["attributes"].items())
        prompt = f"""Generate product descriptions from VERIFIED FACTS ONLY.\n\nFACTS:\n- MPN: {f['mpn']}\n- Manufacturer: {f['manufacturer']}\n- Brand: {f['brand']}\n- Type: {f['product_type']}\n- Category: {f['classpath']}\n- Attributes:\n{al}\n\n1. mobile_desc (60-80 chars): Manufacturer Brand, Type, MPN\n2. short_desc (max 150 chars): Brand® MPN Type, Key Attrs\n3. long_desc (max 750 chars): Comprehensive\n4. retail_desc (max 100 chars): Consumer-friendly\n\nJSON: {{"mobile_desc": "..", "short_desc": "..", "long_desc": "..", "retail_desc": ".."}}"""
        return self.llm.generate_json(prompt)
```

### File: `ai_engine/validator.py`
```python
from typing import List
from shared.schemas.product import ProductIntelligence, ValidationResult
from shared.config.settings import *

class ValidationEngine:
    def __init__(self, uom_set: set, lov_by_classpath: dict, content_rules: dict):
        self.uoms = uom_set
        self.lov = lov_by_classpath
        self.rules = content_rules

    def validate(self, p: ProductIntelligence) -> List[ValidationResult]:
        r = []
        r.extend(self._char_limits(p))
        r.extend(self._casing(p))
        r.extend(self._uom(p))
        r.extend(self._lov(p))
        r.extend(self._required(p))
        return r

    def _char_limits(self, p):
        r = []
        checks = [("invoice_description", p.content.invoice_description, None, INVOICE_DESC_MAX_CHARS),
                  ("mobile_description", p.content.mobile_description, MOBILE_DESC_MIN_CHARS, MOBILE_DESC_MAX_CHARS),
                  ("product_title", p.content.product_title, None, SHORT_DESC_MAX_CHARS),
                  ("long_description", p.content.long_description, None, LONG_DESC_MAX_CHARS)]
        for f, v, mn, mx in checks:
            if not v:
                r.append(ValidationResult(field=f, rule="required", status="warning", message=f"{f} empty", severity="warning"))
                continue
            l = len(v)
            if mx and l > mx:
                r.append(ValidationResult(field=f, rule="char_limit", status="error", message=f"{f}: {l} chars (max {mx})", severity="critical"))
            elif mn and l < mn:
                r.append(ValidationResult(field=f, rule="char_min", status="warning", message=f"{f}: {l} chars (min {mn})", severity="warning"))
            else:
                r.append(ValidationResult(field=f, rule="char_limit", status="pass", message=f"{f}: {l} chars OK", severity="info"))
        return r

    def _casing(self, p):
        inv = p.content.invoice_description
        if inv and inv != inv.upper():
            return [ValidationResult(field="invoice_description", rule="casing", status="error", message="Must be ALL CAPS", severity="critical")]
        return [ValidationResult(field="invoice_description", rule="casing", status="pass", message="ALL CAPS OK", severity="info")] if inv else []

    def _uom(self, p):
        r = []
        if not self.uoms: return r
        for a in p.attributes:
            if a.uom:
                st = "pass" if a.uom in self.uoms else "error"
                r.append(ValidationResult(field=f"attr:{a.name}", rule="uom", status=st,
                    message=f"UOM '{a.uom}' {'approved' if st=='pass' else 'not approved'}", severity="info" if st=="pass" else "warning"))
        return r

    def _lov(self, p):
        return [ValidationResult(field=f"attr:{a.name}", rule="lov", status="pass" if a.lov_valid else "warning",
            message=f"'{a.normalized_value}' {'LOV OK' if a.lov_valid else 'not in LOV'}",
            severity="info" if a.lov_valid else "warning") for a in p.attributes if a.lov_valid is not None]

    def _required(self, p):
        r = []
        if not p.identity.manufacturer_resolved:
            r.append(ValidationResult(field="manufacturer", rule="required", status="error", message="Not resolved", severity="critical"))
        if not p.classification.classpath:
            r.append(ValidationResult(field="classpath", rule="required", status="error", message="Not classified", severity="critical"))
        return r
```

### File: `ai_engine/confidence.py`
```python
from typing import Tuple, List, Dict
from shared.schemas.product import ProductIntelligence, ConfidenceLevel
from shared.config.settings import CONFIDENCE_HIGH, CONFIDENCE_MEDIUM, CONFIDENCE_LOW, HUMAN_REVIEW_THRESHOLD

class ConfidenceScorer:
    def __init__(self, weights=None):
        self.weights = weights or {
            "manufacturer_confidence": 0.20, "brand_confidence": 0.10,
            "classification_confidence": 0.15, "attribute_completeness": 0.15,
            "lov_compliance": 0.15, "uom_compliance": 0.10, "validation_pass_rate": 0.15}

    def score(self, p: ProductIntelligence) -> Tuple[float, ConfidenceLevel, Dict[str, float], List[str]]:
        s = {}
        s["manufacturer_confidence"] = p.identity.manufacturer_confidence
        s["brand_confidence"] = p.identity.brand_confidence
        s["classification_confidence"] = p.classification.classification_confidence
        total = max(len(p.attributes), 1)
        s["attribute_completeness"] = sum(1 for a in p.attributes if a.normalized_value or a.raw_value) / total
        lc = [a for a in p.attributes if a.lov_valid is not None]
        s["lov_compliance"] = sum(1 for a in lc if a.lov_valid) / max(len(lc), 1) if lc else 0.5
        uv = [v for v in p.validations if v.rule == "uom"]
        s["uom_compliance"] = sum(1 for v in uv if v.status == "pass") / max(len(uv), 1) if uv else 0.5
        s["validation_pass_rate"] = sum(1 for v in p.validations if v.status == "pass") / max(len(p.validations), 1) if p.validations else 0.5

        score = max(0.0, min(1.0, sum(s.get(k, 0) * self.weights.get(k, 0) for k in self.weights)))
        level = ConfidenceLevel.HIGH if score >= CONFIDENCE_HIGH else ConfidenceLevel.MEDIUM if score >= CONFIDENCE_MEDIUM else ConfidenceLevel.LOW if score >= CONFIDENCE_LOW else ConfidenceLevel.VERY_LOW
        reasons = []
        if score < HUMAN_REVIEW_THRESHOLD: reasons.append(f"Confidence {score:.2f} below {HUMAN_REVIEW_THRESHOLD}")
        if s.get("manufacturer_confidence", 0) < 0.50: reasons.append("Low manufacturer confidence")
        return score, level, s, reasons
```

### File: `ai_engine/engine.py`
```python
import time
from typing import List
from shared.schemas.product import RawProduct, ProductIntelligence, ProductIdentity
from .llm_client import LLMClient
from .resolver import ManufacturerBrandResolver
from .classifier import ProductClassifier
from .extractor import AttributeExtractor
from .normalizer import ValueNormalizer
from .generator import ContentGenerator
from .validator import ValidationEngine
from .confidence import ConfidenceScorer
import uuid

class AIEngine:
    def __init__(self, reference_data, llm_client: LLMClient = None):
        self.llm = llm_client or LLMClient()
        self.resolver = ManufacturerBrandResolver(reference_data.manufacturer_brand_index, self.llm)
        self.classifier = ProductClassifier(reference_data.classpath_list, self.llm)
        self.extractor = AttributeExtractor(reference_data.lov_by_classpath, self.llm)
        self.normalizer = ValueNormalizer(reference_data.uom_lookup, reference_data.fraction_lookup, reference_data.lov_values)
        self.generator = ContentGenerator(reference_data.content_rules, self.llm)
        self.validator = ValidationEngine(reference_data.uom_set, reference_data.lov_by_classpath, reference_data.content_rules)
        self.confidence_scorer = ConfidenceScorer()

    def process_product(self, raw: RawProduct) -> ProductIntelligence:
        start = time.time()
        try:
            identity = self.resolver.resolve(raw)
            classification = self.classifier.classify(raw.part_desc, identity.brand_resolved or "", identity.manufacturer_resolved or "", raw.mfg_part_num)
            attributes = self.extractor.extract(raw.part_desc, classification.classpath or "", identity.brand_resolved or "", raw.mfg_part_num)
            attributes = [self.normalizer.normalize_attribute(a) for a in attributes]
            content = self.generator.generate(identity, classification, attributes)
            product = ProductIntelligence(identity=identity, classification=classification, attributes=attributes, content=content, raw_input=raw.model_dump(), processing_status="completed")
            product.validations = self.validator.validate(product)
            score, level, signals, reasons = self.confidence_scorer.score(product)
            product.overall_confidence = score
            product.confidence_level = level
            product.confidence_signals = signals
            product.needs_human_review = score < 0.70
            product.human_review_reasons = reasons
            product.processing_time_ms = int((time.time() - start) * 1000)
            return product
        except Exception as e:
            return ProductIntelligence(
                identity=ProductIdentity(product_id=str(uuid.uuid4())[:8], mpn=raw.mfg_part_num, manufacturer_raw=raw.part_manuf),
                raw_input=raw.model_dump(), processing_status="error", error_message=str(e),
                processing_time_ms=int((time.time() - start) * 1000))

    def process_batch(self, products: List[RawProduct]) -> List[ProductIntelligence]:
        return [self.process_product(p) for p in products]

    def health_check(self) -> dict:
        return {"llm_available": self.llm.is_available(), "model": self.llm.model, "status": "ok" if self.llm.is_available() else "llm_unavailable"}
```

---

## 7. PROMPT TEMPLATES

Create these files in `ai_engine/prompts/`:

### `classify.txt`
```
Classify this product into the MOST SPECIFIC category path.
Product: {part_desc}
Brand: {brand}
Options:
{classpath_options}
JSON: {"classpath": "exact path from list", "confidence": 0.85}
```

### `extract_attributes.txt`
```
Extract attributes from product description.
Product: {part_desc}
Brand: {brand}
Category: {classpath}
Expected: {expected_attributes}
Rules: ONLY explicit info. null if not present. Include UOM.
JSON: {"attributes": [{"name": "...", "value": "...", "uom": "...", "confidence": 0.85}]}
```

### `generate_descriptions.txt`
```
Generate descriptions from VERIFIED FACTS ONLY.
FACTS: {fact_sheet}
1. mobile_desc (60-80 chars)
2. short_desc (≤150 chars)
3. long_desc (≤750 chars)
4. retail_desc (≤100 chars)
JSON: {"mobile_desc": "..", "short_desc": "..", "long_desc": "..", "retail_desc": ".."}
```

### `resolve_manufacturer.txt`
```
Identify the BRAND NAME.
Product: {part_desc}
Part Number: {mpn}
Distributor: {distributor}
The distributor is NOT the brand. Return ONLY the brand name or "UNKNOWN".
```

---

## 8. INTEGRATION CONTRACTS

### What this module RECEIVES from Data Processing (Member 4)
The `reference_data` object must have:
- `.manufacturer_brand_index` (dict)
- `.classpath_list` (list[str])
- `.lov_by_classpath` (dict)
- `.uom_lookup` (dict)
- `.uom_set` (set)
- `.fraction_lookup` (dict)
- `.lov_values` (dict)
- `.content_rules` (dict)

### What this module PROVIDES to Backend (Member 2)
```python
from ai_engine.engine import AIEngine
from shared.schemas.product import RawProduct, ProductIntelligence

engine = AIEngine(reference_data)
result: ProductIntelligence = engine.process_product(RawProduct(...))
results: list[ProductIntelligence] = engine.process_batch([RawProduct(...)])
health: dict = engine.health_check()
```

---

## 9. TESTING STRATEGY

### Test LLM connectivity
```python
client = LLMClient()
assert client.is_available()
resp = client.generate("What is 2+2? Only the number.")
assert "4" in resp
```

### Test resolver
```python
raw = RawProduct(mfg_part_num="DCF809D1", part_desc="DCF809D1 Dewalt Atomic 20V Impact Driver", dib_brand="DEWALT", part_manuf="Black & Decker/dewlt (2585)")
identity = resolver.resolve(raw)
assert "DEWALT" in identity.brand_resolved.upper()
```

### Test full pipeline
```python
raw = RawProduct(mfg_part_num="PDSH4816AF", part_desc="PDSH4816AF Dishwasher SS")
result = engine.process_product(raw)
assert result.processing_status == "completed"
assert result.content.invoice_description
assert len(result.content.invoice_description) <= 40
assert result.content.invoice_description == result.content.invoice_description.upper()
```

---

## 10. BUILD ORDER

| Step | Files | Test |
|------|-------|------|
| 1 | `shared/schemas/product.py`, `shared/config/settings.py` | Import succeeds |
| 2 | `ai_engine/llm_client.py` | `generate("Hello")` works |
| 3 | `ai_engine/resolver.py` | Test 5 known products |
| 4 | `ai_engine/classifier.py` | Test 5 products |
| 5 | `ai_engine/extractor.py` | Test 5 products |
| 6 | `ai_engine/normalizer.py` | decimal→fraction works |
| 7 | `ai_engine/generator.py` | invoice desc ≤40 chars |
| 8 | `ai_engine/validator.py` | validation rules fire |
| 9 | `ai_engine/confidence.py` | score calculation |
| 10 | `ai_engine/engine.py` | Full pipeline test |

**END OF AI ENGINE PLAN**
