# Universal Backend API & Service Integration Guide

This document details how the **Frontend** and **Backend** connect to the **Universal Product Data Processing Pipeline** across all 11 supported input modalities.

---

## 1. Quick Python Service Usage

```python
from backend.app.api import service

# 1. Single File (PDF, CSV, XLSX, JSON, Image)
result = service.process_input("csv", "path/to/catalog.csv")
# or auto-detect by filename:
result = service.process_input("pdf", pdf_bytes, filename="specsheet.pdf")

# 2. Multi-File / Drag & Drop Batch
files = [("catalog.xlsx", xlsx_bytes), ("datasheet.pdf", pdf_bytes), ("image.png", img_bytes)]
result = service.process_files(files)

# 3. Product or Catalog URL
result = service.process_url("https://example.com/products/drill-dw715")

# 4. Raw Unstructured Text / Spec Bullet Points
result = service.process_text("""
3M 775L Stikit Film P150
Series: Cubitron II
MPN: 3MABR-7100075678
Quantity: 3 pc
""")

# 5. Manual Product Entry Form
result = service.process_manual({
    "brand": "Diablo",
    "product_name": "Sanding Belt 6pc",
    "mpn": "DCB518ASTS06G",
    "grit": "80 Grit"
})

# 6. Export to 252-Column Unihack Delivery CSV
service.export_unilog_252_csv(result["products"], "data/output/custom_delivery.csv")
```

---

## 2. Common Canonical Product Schema

Every input modality is normalized into the common Canonical Schema:

```json
{
  "source": {
    "source_type": "csv | xlsx | json | pdf | image | url | text | manual | multi_file",
    "source_name": "catalog.xlsx",
    "source_location": "Sheet 'Specs' Row 14",
    "source_id": "catalog.xlsx_Specs_r14",
    "retrieval_status": "success",
    "content_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  },
  "raw_data": {
    "Item_Num": "DCB518ASTS06G",
    "Desc": "Diablo 1/2\"x18\" Sanding Belt 6pc"
  },
  "product": {
    "product_name": "Diablo 1/2\"x18\" Sanding Belt 6pc",
    "brand": "Diablo",
    "manufacturer": "Freud America Inc",
    "mpn": "DCB518ASTS06G",
    "description": "Diablo 1/2\"x18\" Sanding Belt 6pc",
    "category": "Abrasives",
    "specifications": {},
    "attributes": {
      "Package_Quantity": "6 pc"
    }
  },
  "normalized": {
    "brand": "Diablo®",
    "brand_code": "DIAB",
    "manufacturer": "Freud America Inc",
    "manufacturer_code": "2435",
    "mpn": "DCB518ASTS06G",
    "resolution_status": "EXACT_MATCH",
    "resolution_source": "canonical_brands.json",
    "attributes": {
      "Item_Type": "Abrasive Sanding Media",
      "Package_Quantity": "6 pc"
    }
  },
  "generated": {
    "invoice_description": "ABRASIVE SANDING MEDIA 6PC",
    "mobile_description": "Diablo, Abrasive Sanding Media, DCB518ASTS06G, 6 pc, Industrial Grade",
    "title": "Diablo® DCB518ASTS06G Abrasive Sanding Media 6 pc",
    "long_description": "Diablo®, Abrasive Sanding Media, Model DCB518ASTS06G, 6 pc"
  },
  "quality": {
    "confidence": 0.99,
    "review_required": false,
    "primary_review_reason": "NONE",
    "review_reasons": [],
    "rule_checks": {
      "invoice_char_limit": true,
      "invoice_casing_caps": true,
      "mobile_length_compliance": true,
      "uom_spacing_compliance": true,
      "brand_resolution": true
    },
    "warnings": []
  },
  "traceability": {
    "raw_input": {
      "mfg_part_num": "DCB518ASTS06G",
      "part_desc": "Diablo 1/2\"x18\" Sanding Belt 6pc"
    },
    "transformations": {
      "extracted_mpn": "DCB518ASTS06G",
      "expanded_acronyms_desc": "Diablo 1/2\"x18\" Sanding Belt 6pc",
      "uom_normalized_desc": "Diablo 1/2 in x 18 in Sanding Belt 6 pc"
    },
    "brand_resolution": {
      "input_brand": "Diablo",
      "resolved_brand": "Diablo®",
      "status": "EXACT_MATCH",
      "source": "canonical_brands.json",
      "confidence": 0.99
    },
    "attributes_lineage": [
      {
        "attribute": "Item_Type",
        "value": "Abrasive Sanding Media",
        "source_field": "part_desc",
        "extractor": "AttributeExtractor",
        "schema_standard": "Unilog LOV"
      }
    ],
    "source_provenance": {
      "source_type": "xlsx",
      "source_name": "catalog.xlsx",
      "source_location": "Sheet 'Specs' Row 14"
    }
  }
}
```

---

## 3. Supported Input Modalities (11 Formats)

| Input Option | Adapter Class | Description |
| :--- | :--- | :--- |
| **1. PDF Upload** | `PDFAdapter` | Digital cut-sheet text, table matrices, page-level provenance. |
| **2. CSV Upload** | `CSVAdapter` | Encoding-tolerant (`utf-8`, `latin1`), flexible header alias matching. |
| **3. XLSX Upload** | `XLSXAdapter` | Multi-sheet parsing, sheet name & row index provenance. |
| **4. JSON Upload** | `JSONAdapter` | Single items, lists, or nested containers (`{"products": [...]}`). |
| **5. Image Upload** | `ImageAdapter` | Visual metadata, nameplate dimensions, OCR text extraction. |
| **6. Product URL** | `URLAdapter` | HTTP/HTTPS product pages, OpenGraph & Schema.org metadata. |
| **7. Catalog Link** | `URLAdapter` | Direct PDF & document URL fetching with redirect & timeout handling. |
| **8. Manual Entry** | `ManualAdapter` | Form field dictionaries mapped to canonical product fields. |
| **9. Raw Text** | `TextAdapter` | Unstructured specs, bullet points, and key-value blocks. |
| **10. Drag & Drop** | `MultiFileAdapter` | Ingests dropped files and auto-routes by file extension. |
| **11. Multi-File Batch** | `MultiFileAdapter` | Heterogeneous collections (`.pdf` + `.xlsx` + `.csv` + `.png`). |

---

## 4. Quality & Gatekeeper Output

Calling the pipeline returns:
```json
{
  "success": true,
  "input_type": "csv",
  "source_name": "catalog.csv",
  "total_products": 1000,
  "quality_metrics": {
    "total_products": 1000,
    "average_confidence": 91.6,
    "invoice_compliance_rate": 100.0,
    "mobile_compliance_rate": 100.0,
    "uom_compliance_rate": 100.0,
    "brand_resolution_rate": 96.9,
    "human_review_count": 31,
    "human_review_rate": 3.1
  },
  "products": [...]
}
```
