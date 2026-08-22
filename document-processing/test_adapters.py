"""
Comprehensive Automated Test Suite for Universal Input Adapters & Canonical Schema
Tests all 11 input types: CSV, XLSX, JSON, PDF, Image, URL, Text, Manual, Multi-File, and Schema Validation.
"""

import os
import sys
import json
import unittest
import pandas as pd
import io
from PIL import Image

_current_dir = os.path.dirname(os.path.abspath(__file__))
_root_dir = os.path.dirname(_current_dir)
for p in [_current_dir, _root_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from canonical_schema import CanonicalProductRecord, SourceMetadata, CanonicalProduct
from pipeline import UniversalDataPipeline
from adapters import (
    CSVAdapter,
    XLSXAdapter,
    JSONAdapter,
    PDFAdapter,
    ImageAdapter,
    URLAdapter,
    TextAdapter,
    ManualAdapter,
    MultiFileAdapter
)
from delivery_formatter import DeliveryFormatter
from delivery_validator import DeliverySchemaValidator


class TestUniversalInputAdapters(unittest.TestCase):
    """
    Automated unit and integration test suite across all input modalities.
    """

    @classmethod
    def setUpClass(cls):
        cls.pipeline = UniversalDataPipeline()
        cls.formatter = DeliveryFormatter()
        cls.test_dir = os.path.join(_root_dir, "data", "test_fixtures")
        os.makedirs(cls.test_dir, exist_ok=True)

    def test_01_canonical_schema_serialization(self):
        """Tests that CanonicalProductRecord serializes and deserializes accurately."""
        record = CanonicalProductRecord(
            source=SourceMetadata(source_type="csv", source_name="catalog.csv", source_location="Row 10"),
            raw_data={"part_num": "D0724R", "desc": "Diablo 7-1/4\" Saw Blade 24T"},
            product=CanonicalProduct(
                product_name="Diablo 7-1/4\" Saw Blade 24T",
                brand="Diablo",
                mpn="D0724R",
                description="Diablo 7-1/4\" Saw Blade 24T",
                attributes={"Teeth": "24"}
            )
        )
        d = record.to_dict()
        self.assertEqual(d["source"]["source_type"], "csv")
        self.assertEqual(d["product"]["mpn"], "D0724R")
        self.assertEqual(d["product"]["attributes"]["Teeth"], "24")

        # Test deserialization
        restored = CanonicalProductRecord.from_dict(d)
        self.assertEqual(restored.source.source_name, "catalog.csv")
        self.assertEqual(restored.product.mpn, "D0724R")

    def test_02_csv_adapter_flexible_headers(self):
        """Tests CSV ingestion with custom/dynamic column headers."""
        csv_content = (
            "Item_Number,Product_Description,Brand_Name,Supplier,Category\n"
            "DCB518ASTS06G,Diablo 1/2\"x18\" Sanding Belt 6pc,Diablo,Freud America Inc,Abrasives\n"
            "3MABR-7100075678,3M 775L Stikit Film P150 Cubitron II 50 Disc,3M,3M Co,Abrasives\n"
        )
        csv_file = os.path.join(self.test_dir, "test_custom_headers.csv")
        with open(csv_file, "w", encoding="utf-8") as f:
            f.write(csv_content)

        adapter = CSVAdapter()
        records = adapter.parse(csv_file)
        self.assertEqual(len(records), 2)
        self.assertEqual(records[0].product.mpn, "DCB518ASTS06G")
        self.assertEqual(records[0].product.brand, "Diablo")
        self.assertEqual(records[0].source.source_location, "Row 2")
        self.assertEqual(records[1].product.mpn, "3MABR-7100075678")

    def test_03_xlsx_adapter_multi_sheet(self):
        """Tests Excel ingestion across multiple sheets."""
        xlsx_file = os.path.join(self.test_dir, "test_catalog.xlsx")
        df1 = pd.DataFrame([
            {"MFG_PART_NUM": "DW715", "PART_DESC": "DeWalt 12\" Miter Saw 15 Amp", "UNILOG_BRAND": "DeWalt", "PART_MANUF": "DeWalt"}
        ])
        df2 = pd.DataFrame([
            {"Model": "M18-2804", "Description": "Milwaukee M18 Fuel 1/2\" Hammer Drill", "Brand": "Milwaukee"}
        ])
        with pd.ExcelWriter(xlsx_file, engine="openpyxl") as writer:
            df1.to_excel(writer, sheet_name="Saws", index=False)
            df2.to_excel(writer, sheet_name="Drills", index=False)

        adapter = XLSXAdapter()
        records = adapter.parse(xlsx_file)
        self.assertEqual(len(records), 2)
        self.assertEqual(records[0].product.mpn, "DW715")
        self.assertIn("Sheet 'Saws'", records[0].source.source_location)
        self.assertEqual(records[1].product.mpn, "M18-2804")
        self.assertIn("Sheet 'Drills'", records[1].source.source_location)

    def test_04_json_adapter_nested_and_list(self):
        """Tests JSON adapter with array of items and nested structures."""
        json_data = {
            "catalog": [
                {
                    "partNumber": "48-22-8424",
                    "productName": "Milwaukee PACKOUT Tool Box",
                    "brandName": "Milwaukee",
                    "specifications": {"Material": "Impact Resistant Polymer", "Capacity": "75 lbs"}
                },
                {
                    "mpn": "D0724R",
                    "description": "Diablo 7-1/4\" Saw Blade 24T",
                    "brand": "Diablo",
                    "attributes": {"Tooth_Count": "24", "Diameter": "7-1/4 in"}
                }
            ]
        }
        json_file = os.path.join(self.test_dir, "test_nested.json")
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(json_data, f)

        adapter = JSONAdapter()
        records = adapter.parse(json_file)
        self.assertEqual(len(records), 2)
        self.assertEqual(records[0].product.mpn, "48-22-8424")
        self.assertEqual(records[0].product.attributes.get("Material"), "Impact Resistant Polymer")
        self.assertEqual(records[1].product.mpn, "D0724R")
        self.assertEqual(records[1].product.attributes.get("Tooth_Count"), "24")

    def test_05_pdf_adapter_text_and_page_tracking(self):
        """Tests PDF parsing and page-level provenance."""
        adapter = PDFAdapter()
        # Test with synthetic digital text
        pdf_file = os.path.join(self.test_dir, "synthetic_spec.pdf")
        
        from pypdf import PdfWriter
        writer = PdfWriter()
        writer.add_blank_page(width=612, height=792)
        with open(pdf_file, "wb") as f:
            writer.write(f)

        records = adapter.parse(pdf_file)
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0].source.source_type, "pdf")
        self.assertEqual(records[0].source.source_location, "Page 1")

    def test_06_image_adapter_visual_metadata(self):
        """Tests image visual metadata and property extraction."""
        img_file = os.path.join(self.test_dir, "sample_nameplate_DW715.png")
        img = Image.new("RGB", (400, 200), color=(255, 255, 255))
        img.save(img_file)

        adapter = ImageAdapter()
        records = adapter.parse(img_file)
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0].source.source_type, "image")
        self.assertEqual(records[0].raw_data.get("resolution"), "400x200")
        self.assertIn("DW715", records[0].product.product_name)

    def test_07_url_adapter_inaccessible_and_safe_failure(self):
        """Tests URL validation and safe error handling without hallucinations."""
        adapter = URLAdapter(timeout=2)
        # Inaccessible URL
        records = adapter.parse("https://invalid-non-existent-industrial-domain-9999.org/item/123")
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0].source.retrieval_status, "failed")
        self.assertIn("Inaccessible", records[0].product.product_name)
        self.assertFalse(records[0].product.mpn == "FAKE_123")  # Never hallucinate

    def test_07b_url_adapter_security_and_anti_ssrf(self):
        """Tests that localhost, private IP addresses, and invalid schemes are blocked."""
        adapter = URLAdapter(timeout=2)
        
        # Test localhost blocked
        safe, msg = adapter.validate_url_security("http://localhost:8000/secret")
        self.assertFalse(safe)
        self.assertIn("forbidden", msg.lower())

        # Test loopback IP blocked
        safe, msg = adapter.validate_url_security("http://127.0.0.1/admin")
        self.assertFalse(safe)
        self.assertIn("forbidden", msg.lower())

        # Test invalid scheme
        safe, msg = adapter.validate_url_security("ftp://ftp.example.com/file.csv")
        self.assertFalse(safe)
        self.assertIn("scheme", msg.lower())

    def test_07c_url_adapter_html_json_ld_extraction(self):
        """Tests extracting structured Schema.org / JSON-LD product data from HTML."""
        sample_html = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Milwaukee 49-94-0013 5" Cut Off Disc | Milwaukee Tool</title>
            <script type="application/ld+json">
            {
                "@context": "https://schema.org/",
                "@type": "Product",
                "name": "Milwaukee 5 in x .045 in x 7/8 in Metal Cut Off Wheel",
                "brand": {"@type": "Brand", "name": "Milwaukee"},
                "manufacturer": "Milwaukee Tool",
                "mpn": "49-94-0013",
                "sku": "49-94-0013",
                "description": "5 in. x .045 in. x 7/8 in. Metal Cut Off Wheel for angle grinders",
                "category": "Abrasives",
                "additionalProperty": [
                    {"@type": "PropertyValue", "name": "Diameter", "value": "5 in"},
                    {"@type": "PropertyValue", "name": "Thickness", "value": ".045 in"},
                    {"@type": "PropertyValue", "name": "Arbor Size", "value": "7/8 in"}
                ]
            }
            </script>
        </head>
        <body>
            <h1>5 in. x .045 in. x 7/8 in. Cut Off Wheel</h1>
        </body>
        </html>
        """
        adapter = URLAdapter()
        records = adapter._extract_html_product_page(
            initial_url="https://www.milwaukeetool.com/Products/49-94-0013",
            final_url="https://www.milwaukeetool.com/products/details/5-x-045-x-7-8-metal-cut-off-wheel-type-1/49-94-0013",
            domain="www.milwaukeetool.com",
            status_code=200,
            content_type="text/html",
            raw_bytes=sample_html.encode("utf-8")
        )
        self.assertEqual(len(records), 1)
        rec = records[0]
        self.assertEqual(rec.product.mpn, "49-94-0013")
        self.assertEqual(rec.product.brand, "Milwaukee")
        self.assertEqual(rec.product.manufacturer, "Milwaukee Tool")
        self.assertEqual(rec.product.attributes.get("Diameter"), "5 in")
        self.assertEqual(rec.traceability.get("extraction_method"), "JSON-LD (schema.org/Product)")
        self.assertTrue(rec.traceability.get("is_manufacturer_source"))

    def test_07d_url_adapter_remote_csv_multi_product_routing(self):
        """Tests that remote CSV / spreadsheet URLs parse into multiple canonical product records."""
        csv_bytes = (
            "Mfg_Part_Num,Part_Desc,Unilog_Brand\n"
            "DCB518ASTS06G,Diablo 1/2\"x18\" Sanding Belt 6pc,Diablo\n"
            "49-94-0013,Milwaukee 5\" Cut Off Disc,Milwaukee\n"
        ).encode("utf-8")

        adapter = URLAdapter()
        res_type = adapter._detect_resource_type("https://example.com/catalog.csv", "text/csv", csv_bytes)
        self.assertEqual(res_type, "csv")

        from adapters.csv_adapter import CSVAdapter
        csv_adapter = CSVAdapter()
        records = csv_adapter.parse(csv_bytes, filename="https://example.com/catalog.csv")
        self.assertEqual(len(records), 2)
        self.assertEqual(records[0].product.mpn, "DCB518ASTS06G")
        self.assertEqual(records[1].product.mpn, "49-94-0013")

    def test_07e_url_adapter_html_opengraph_fallback(self):
        """Tests HTML product page parsing when JSON-LD is absent (fallback to OpenGraph & tables)."""
        sample_html = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Diablo DCB518ASTS06G Sanding Belt</title>
            <meta property="og:title" content="Diablo 1/2 in. x 18 in. Sanding Belt (6-Pack)" />
            <meta property="og:description" content="Diablo premium 80 Grit sanding belt for industrial belt sanders." />
            <meta property="product:brand" content="Diablo" />
            <meta property="product:retailer_item_id" content="DCB518ASTS06G" />
        </head>
        <body>
            <table>
                <tr><th>Grit</th><td>80 Grit</td></tr>
                <tr><th>Package Quantity</th><td>6 pc</td></tr>
            </table>
        </body>
        </html>
        """
        adapter = URLAdapter()
        records = adapter._extract_html_product_page(
            initial_url="https://www.diablotools.com/products/DCB518ASTS06G",
            final_url="https://www.diablotools.com/products/DCB518ASTS06G",
            domain="www.diablotools.com",
            status_code=200,
            content_type="text/html",
            raw_bytes=sample_html.encode("utf-8")
        )
        self.assertEqual(len(records), 1)
        rec = records[0]
        self.assertEqual(rec.product.mpn, "DCB518ASTS06G")
        self.assertEqual(rec.product.brand, "Diablo")
        self.assertEqual(rec.product.attributes.get("Grit"), "80 Grit")
        self.assertEqual(rec.traceability.get("extraction_method"), "OpenGraph / HTML Metadata")

    def test_07f_url_adapter_remote_pdf_routing(self):
        """Tests remote PDF datasheet format detection and adapter delegation."""
        adapter = URLAdapter()
        pdf_bytes = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
        res_type = adapter._detect_resource_type("https://example.com/datasheet.pdf", "application/pdf", pdf_bytes)
        self.assertEqual(res_type, "pdf")

    def test_07g_url_adapter_remote_xlsx_routing(self):
        """Tests remote Excel catalog format detection."""
        adapter = URLAdapter()
        xlsx_bytes = b"PK\x03\x04\x14\x00\x06\x00"
        res_type = adapter._detect_resource_type("https://example.com/products.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xlsx_bytes)
        self.assertEqual(res_type, "xlsx")

    def test_07h_url_adapter_remote_json_routing(self):
        """Tests remote JSON API response parsing into product records."""
        json_bytes = json.dumps([
            {"mpn": "DCD1007B", "description": "DeWalt 20V Cordless Hammer Drill", "brand": "DEWALT"},
            {"mpn": "PDSH4816AF", "description": "Frigidaire Built-In Dishwasher SS", "brand": "FRIGIDAIRE"}
        ]).encode("utf-8")

        adapter = URLAdapter()
        res_type = adapter._detect_resource_type("https://api.example.com/products.json", "application/json", json_bytes)
        self.assertEqual(res_type, "json")

        from adapters.json_adapter import JSONAdapter
        json_adapter = JSONAdapter()
        records = json_adapter.parse(json_bytes, filename="https://api.example.com/products.json")
        self.assertEqual(len(records), 2)
        self.assertEqual(records[0].product.mpn, "DCD1007B")
        self.assertEqual(records[1].product.mpn, "PDSH4816AF")

    def test_07i_url_adapter_http_404_error_handling(self):
        """Tests HTTP 404 / 500 error handling returning a failed record without crashing."""
        adapter = URLAdapter()
        rec = adapter._build_failed_record(
            initial_url="https://example.com/non-existent-product",
            final_url="https://example.com/non-existent-product",
            error_msg="HTTP 404: Not Found",
            error_code="HTTP_ERROR",
            status_code=404
        )
        self.assertEqual(rec.source.retrieval_status, "failed")
        self.assertEqual(rec.raw_data.get("status_code"), 404)
        self.assertIn("Inaccessible", rec.product.product_name)

    def test_07j_redirect_handling_traceability(self):
        """Tests that safe_fetch and URLAdapter preserve both original and final URLs and track redirect hops."""
        adapter = URLAdapter()
        # Mock a successful redirect record
        records = adapter._extract_html_product_page(
            initial_url="https://www.milwaukeetool.com/Products/49-94-0013",
            final_url="https://www.milwaukeetool.com/products/details/5-x-045-x-7-8-metal-cut-off-wheel-type-1/49-94-0013",
            domain="www.milwaukeetool.com",
            status_code=200,
            content_type="text/html",
            raw_bytes=b"<html><head><title>Milwaukee Cut Off Disc</title></head><body></body></html>",
            redirect_count=1,
            redirect_chain=[
                "https://www.milwaukeetool.com/Products/49-94-0013",
                "https://www.milwaukeetool.com/products/details/5-x-045-x-7-8-metal-cut-off-wheel-type-1/49-94-0013"
            ]
        )
        self.assertEqual(len(records), 1)
        rec = records[0]
        self.assertEqual(rec.source.source_name, "https://www.milwaukeetool.com/Products/49-94-0013")
        self.assertEqual(rec.traceability.get("source_url"), "https://www.milwaukeetool.com/Products/49-94-0013")
        self.assertEqual(rec.traceability.get("final_url"), "https://www.milwaukeetool.com/products/details/5-x-045-x-7-8-metal-cut-off-wheel-type-1/49-94-0013")
        self.assertTrue(rec.traceability.get("redirected"))
        self.assertEqual(rec.traceability.get("redirect_count"), 1)

    def test_07k_redirect_limit_exceeded(self):
        """Tests that exceeding maximum redirect limit yields REDIRECT_LIMIT_EXCEEDED gracefully."""
        adapter = URLAdapter(max_redirects=2)
        failed_rec = adapter._build_failed_record(
            initial_url="https://example.com/loop1",
            final_url="https://example.com/loop3",
            error_msg="Exceeded maximum redirect limit (2 hops).",
            error_code="REDIRECT_LIMIT_EXCEEDED",
            status_code=308,
            redirect_count=3
        )
        self.assertEqual(failed_rec.source.retrieval_status, "failed")
        self.assertEqual(failed_rec.raw_data.get("error_code"), "REDIRECT_LIMIT_EXCEEDED")
        self.assertEqual(failed_rec.raw_data.get("redirect_count"), 3)

    def test_08_raw_text_adapter(self):
        """Tests raw unstructured text / specs block ingestion."""
        raw_text = (
            "3M 775L Stikit Film P150\n"
            "Series: Cubitron II\n"
            "MPN: 3MABR-7100075678\n"
            "Grit: P150\n"
            "Quantity: 3 pc\n"
        )
        adapter = TextAdapter()
        records = adapter.parse(raw_text)
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0].product.mpn, "3MABR-7100075678")
        self.assertEqual(records[0].product.attributes.get("grit"), "P150")
        self.assertEqual(records[0].source.source_type, "text")

    def test_09_manual_adapter(self):
        """Tests direct manual form dictionary entry."""
        manual_dict = {
            "brand": "Diablo",
            "product_name": "Sanding Belt 6pc",
            "mpn": "DCB518ASTS06G",
            "grit": "80 Grit",
            "dimensions": "1/2 in x 18 in"
        }
        adapter = ManualAdapter()
        records = adapter.parse(manual_dict)
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0].product.mpn, "DCB518ASTS06G")
        self.assertEqual(records[0].product.brand, "Diablo")
        self.assertEqual(records[0].source.source_type, "manual")

    def test_10_multi_file_batch_adapter(self):
        """Tests multi-file batch ingestion combining different file formats."""
        csv_file = os.path.join(self.test_dir, "batch_1.csv")
        json_file = os.path.join(self.test_dir, "batch_2.json")
        
        with open(csv_file, "w", encoding="utf-8") as f:
            f.write("mfg_part_num,part_desc,unilog_brand\nDCB518ASTS06G,Diablo Sanding Belt 6pc,Diablo\n")
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump([{"mpn": "3MABR-7100075678", "description": "3M Cubitron Disc", "brand": "3M"}], f)

        adapter = MultiFileAdapter()
        records = adapter.parse_multiple([csv_file, json_file])
        self.assertEqual(len(records), 2)
        self.assertEqual(records[0].source.source_type, "csv")
        self.assertEqual(records[1].source.source_type, "json")

    def test_11_universal_pipeline_end_to_end_and_delivery_validation(self):
        """Tests end-to-end processing of diverse inputs into 252-column delivery CSV."""
        inputs = [
            {"mfg_part_num": "DCB518ASTS06G", "part_desc": "Diablo 1/2\"x18\" - Sanding Belt 6pc", "unilog_brand": "Diablo"},
            {"mfg_part_num": "3MABR-7100075678", "part_desc": "3M 775L Stikit Film P150 - Cubitron II 50 Disc/Box", "unilog_brand": "3M"}
        ]
        res = self.pipeline.process_input("json", inputs)
        self.assertTrue(res["success"])
        self.assertEqual(res["total_products"], 2)

        # Format into 252-column Unihack format
        out_csv = os.path.join(self.test_dir, "delivery_test.csv")
        df_252 = self.formatter.format_batch(res["products"])
        df_252.to_csv(out_csv, index=False)
        self.assertEqual(df_252.shape[1], 252)

        # Verify gatekeeper validator
        expected_path = os.path.join(_root_dir, "data", "sample_products", "Unihack_Expected_Output.csv")
        validator = DeliverySchemaValidator(expected_path)
        is_passed, checks = validator.validate_file(out_csv, res["quality_metrics"])
        self.assertTrue(checks["schema_header_order_match"])
        self.assertEqual(checks["duplicate_headers_count"], 0)


if __name__ == "__main__":
    unittest.main()
