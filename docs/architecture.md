# Architecture: Document Processing Subsystem

## 1. System Overview
The **Document Processing** subsystem is the ingestion and normalization engine of the AI-Powered Industrial Product Intelligence platform. It bridges the gap between unstructured, cryptic distributor spreadsheets/PDF cut-sheets and structured, commerce-ready product data conforming strictly to Unilog internal content standards and controlled vocabularies.

```mermaid
graph TD
    A[Raw Input: CSV / Excel / PDF Spec Sheets] --> B[Document Ingestion & Parsers]
    B --> C[Placeholder Filter & Cleaner]
    C --> D[Entity & Feature Extractors]
    
    subgraph "Document Processing Pipeline"
        D --> D1[MPN & Model Extractor]
        D --> D2[Brand/Mfr Resolver w/ RapidFuzz]
        D --> D3[Domain Abbreviation Expander]
        D --> D4[UOM Normalizer & 64ths Fraction Engine]
        D --> D5[Technical Attribute Extractor LOV]
    end
    
    D1 & D2 & D3 & D4 & D5 --> E[5-Tier Description Builder]
    E --> E1[Invoice Desc: <=40 Chars CAPS]
    E --> E2[Mobile Desc: 60-80 Chars]
    E --> E3[Product Title / Short Desc]
    E --> E4[Long Description PDP]
    E --> E5[Structured Taxonomy Attributes]
    
    E1 & E2 & E3 & E4 & E5 --> F[Content Rules Validator & Confidence Scorer]
    F --> G[Commerce-Ready Dataset / Human-in-the-Loop Review Queue]
```

---

## 2. Core Modules & Responsibilities

### A. Ingestion Parsers (`document-processing/parsers/`)
- **`catalog_parser.py`**:
  - Ingests distributor catalogs in CSV, TSV, and `.xlsx`/`.xls` formats.
  - Automatically handles multi-row headers, merged cells, and stray notes.
  - Eliminates placeholders (`-- Unbranded --`, `-- No Unilog Brand --`, `-- No DIB Brand --`, `COMMODITY - UNBRANDED`, `-`, `N/A`).
- **`pdf_parser.py`**:
  - Ingests manufacturer PDF datasheets, cut sheets, and installation manuals.
  - Extracts structural text blocks, detected part numbers, and embedded parameter matrices.
- **`table_parser.py`**:
  - Parses ASCII, pipe-delimited, and tab-delimited specification tables from technical documents.

### B. Extractors & Normalizers (`document-processing/extractors/`)
- **`mpn_extractor.py`**:
  - High-precision extraction of alphanumeric Manufacturer Part Numbers (MPNs) and series codes from noisy strings.
- **`brand_resolver.py`**:
  - Fast fuzzy matching with `rapidfuzz` against canonical master brand/manufacturer registry (`data/canonical_brands.json`).
  - Automatically appends legal casing and registered trademark symbols (`®`, `™`).
- **`uom_normalizer.py`**:
  - Standardizes 89+ measurement types to approved abbreviations with mandatory space (`24 in`, `120 V`, `15 A`).
  - Converts decimal dimensions to 64ths fractions (`50.25 in` $\to$ `50-1/4 in`).
- **`abbreviation_expander.py`**:
  - Context-aware lexicon resolving industrial acronyms (`SS` $\to$ `Stainless Steel`, `Sq` $\to$ `Square`, `Alum` $\to$ `Aluminum`, `Horiz` $\to$ `Horizontal`).
- **`attribute_extractor.py`**:
  - Extracts dimensions, electrical parameters, mechanical specs, materials, colors/finishes, and package counts.

### C. 5-Tier Description Builder (`document-processing/description_builder.py`)
1. **Invoice Description**: $\le 40$ characters, ALL CAPS, high-density technical specs.
2. **Mobile Description**: $60\text{–}80$ characters target, structured for mobile app cards.
3. **Product Title / Short Description**: Brand® + Series + MPN + Item Type + Key Specs.
4. **Long Description**: Rich, grammatically ordered specification sentences for PDPs.
5. **Structured Taxonomy Attributes**: Key-value pairs for eCommerce faceted navigation.

### D. Quality & Compliance Validator (`document-processing/validator.py`)
- Audits generated records against character limits, casing rules, UOM compliance.
- Assigns a granular confidence score ($0\text{–}100\%$).
- Flags items needing Human-in-the-Loop review when confidence is low or required attributes are ambiguous.
