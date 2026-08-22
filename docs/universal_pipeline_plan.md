# Implementation Plan: Universal Product Data Processing Pipeline

## 1. Objective & Scope
Build a comprehensive **Universal Product Data Processing Pipeline** that ingests all 11 input types provided by the frontend interface (PDF, CSV, XLSX, JSON, Image/OCR, Product URL, Catalog URL, Manual Entry, Raw Text, Drag & Drop, Multiple Files) and converts them into a single **Common Canonical Product Schema**, processes them through the enrichment engine, and outputs 100% compliant 252-column Unihack commercial delivery format with full traceability.

---

## 2. Architecture & Components

```mermaid
graph TD
    subgraph "Input Layer (11 Formats)"
        I1[CSV] --> A1[csv_adapter.py]
        I2[XLSX] --> A2[xlsx_adapter.py]
        I3[JSON] --> A3[json_adapter.py]
        I4[PDF] --> A4[pdf_adapter.py]
        I5[Image/OCR] --> A5[image_adapter.py]
        I6[Product/Catalog URL] --> A6[url_adapter.py]
        I7[Raw Text/Specs] --> A7[text_adapter.py]
        I8[Manual Dict] --> A8[manual_adapter.py]
        I9[Multi-File Batch] --> A9[multi_file_adapter.py]
    end

    A1 & A2 & A3 & A4 & A5 & A6 & A7 & A8 & A9 --> C[Canonical Product Schema]

    subgraph "Universal Enrichment Engine"
        C --> D1[Cleaner & Acronym Expander]
        D1 --> D2[Brand Resolver w/ RapidFuzz]
        D2 --> D3[UOM Normalizer & 64ths Fractions]
        D3 --> D4[Attribute Extractor LOV]
        D4 --> D5[5-Tier Description Builder]
    end

    subgraph "Quality & Delivery Gatekeeper"
        D5 --> Q1[Content Validator & Confidence]
        Q1 --> Q2[Traceability & Lineage Attacher]
        Q2 --> Q3[Human Review Router]
        Q3 --> Q4[Unilog 252-Column Delivery Formatter]
        Q4 --> Q5[Automated Gatekeeper Schema Validator]
    end
```

---

## 3. Detailed File Plan

### A. Canonical Schema (`document-processing/canonical_schema.py`)
- `CanonicalProductRecord`: Standard dataclass/dict schema with `source`, `raw_data`, `product`, `normalized`, `generated`, `quality`, `traceability`.
- `SourceMetadata`: Source type, filename, location/sheet/row/page/url, source ID.

### B. Input Adapters Layer (`document-processing/adapters/`)
1. `csv_adapter.py`: Flexible column mapping, encoding auto-detection (`utf-8`, `latin1`, `cp1252`), multi-row headers, row-level provenance.
2. `xlsx_adapter.py`: Multi-sheet inspection, header detection, empty row skipping, sheet + row provenance.
3. `json_adapter.py`: Single item, list of items, nested structures, alias dictionary mapping (`productName`, `item_name`, `part_desc`).
4. `pdf_adapter.py`: Text extraction with PyPDF, page numbers, parameter matrix parsing, scanned PDF detection with OCR fallback flag.
5. `image_adapter.py`: Image format support, visual property extraction, OCR text parsing for label specs.
6. `url_adapter.py`: URL validation, HTTP request with timeout & redirect handling, HTML cleanup, metadata & text extraction, linked PDF detection.
7. `text_adapter.py`: Raw pasted text parser (key-value patterns, product bullet points, unstructured specs).
8. `manual_adapter.py`: Direct dictionary / form input mapping to canonical schema.
9. `multi_file_adapter.py`: Composite processor handling lists of mixed files (`.pdf` + `.xlsx` + `.csv` + `.json` + `.png`) maintaining individual provenance.
10. `__init__.py`: Adapter registry and auto-dispatcher (`get_adapter_for_input`).

### C. Backend Service & Universal Pipeline Integration
- `UniversalDataPipeline` in `document-processing/pipeline.py` exposing:
  - `process_input(input_type, input_data, metadata=None)`
  - `process_batch(inputs)`
  - `process_file(file_path_or_bytes, filename=None, metadata=None)`
  - `process_files(list_of_files)`
  - `process_url(url, metadata=None)`
  - `process_text(raw_text, metadata=None)`
  - `process_manual(product_dict, metadata=None)`
- Expose REST API router in `backend/app/api.py` for frontend integration.

### D. Comprehensive Automated Test Suite (`document-processing/test_adapters.py`)
- Unit and integration tests for every single input adapter.
- Tests for missing fields, invalid files, OCR fallbacks, URL timeouts, and multi-file merges.
- Full verification that `python document-processing/benchmark.py` passes with 1000 items, 252 columns, and exit code 0.
