import io
import json
import pandas as pd
from PIL import Image
from starlette.testclient import TestClient
from app.main import app
from app.services.product_service import product_service

client = TestClient(app)


def test_file_upload():
    print("--- VERIFYING EXPANDED DOCUMENT PROCESSING & INPUT SUPPORT ---")

    # Reset in-memory product service state
    product_service.products = {}
    product_service.next_product_id = 1

    # -----------------------------------------------------------------
    # 1. CSV UPLOAD
    # -----------------------------------------------------------------
    csv_data = (
        "name,category,price,competitor_price\n"
        "Centrifugal Pump,Pumps,850.0,900.0\n"
        "Hydraulic Valve,Valves,210.0,200.0\n"
    )
    csv_bytes = csv_data.encode("utf-8")

    print("\n1. Testing POST /products/upload with CSV file...")
    res_csv = client.post(
        "/products/upload",
        files={"file": ("industrial_catalog.csv", csv_bytes, "text/csv")}
    )
    print(f"   Status Code: {res_csv.status_code}")
    print(f"   Response JSON: {res_csv.json()}")
    assert res_csv.status_code == 200
    assert res_csv.json()["inserted_count"] == 2
    assert "jobId" in res_csv.json()

    # -----------------------------------------------------------------
    # 2. EXCEL UPLOAD
    # -----------------------------------------------------------------
    df_excel = pd.DataFrame([
        {"name": "High-Pressure Hose", "category": "Hoses", "price": 95.0, "competitor_price": 105.0}
    ])
    excel_buffer = io.BytesIO()
    with pd.ExcelWriter(excel_buffer, engine="openpyxl") as writer:
        df_excel.to_excel(writer, index=False)
    excel_bytes = excel_buffer.getvalue()

    print("\n2. Testing POST /products/upload with Excel file...")
    res_excel = client.post(
        "/products/upload",
        files={"file": ("catalog_batch2.xlsx", excel_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    )
    print(f"   Status Code: {res_excel.status_code}")
    print(f"   Response JSON: {res_excel.json()}")
    assert res_excel.status_code == 200
    assert res_excel.json()["inserted_count"] == 1

    # -----------------------------------------------------------------
    # 3. PDF FILE UPLOAD
    # -----------------------------------------------------------------
    pdf_bytes = (
        b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n"
        b"xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n"
        b"0000000115 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF"
    )

    print("\n3. Testing POST /products/upload with PDF file...")
    res_pdf = client.post(
        "/products/upload",
        files={"file": ("spec_sheet.pdf", pdf_bytes, "application/pdf")}
    )
    print(f"   Status Code: {res_pdf.status_code}")
    print(f"   Response JSON: {res_pdf.json()}")
    assert res_pdf.status_code == 200
    assert res_pdf.json()["file_type"] == "pdf"

    # -----------------------------------------------------------------
    # 4. JSON FILE UPLOAD
    # -----------------------------------------------------------------
    json_content = json.dumps([
        {"name": "Digital Pressure Gauge", "category": "Sensors", "price": 140.0, "competitor_price": 150.0}
    ]).encode("utf-8")

    print("\n4. Testing POST /products/upload with JSON file...")
    res_json = client.post(
        "/products/upload",
        files={"file": ("products.json", json_content, "application/json")}
    )
    print(f"   Status Code: {res_json.status_code}")
    print(f"   Response JSON: {res_json.json()}")
    assert res_json.status_code == 200
    assert res_json.json()["inserted_count"] == 1

    # -----------------------------------------------------------------
    # 5. TXT FILE UPLOAD
    # -----------------------------------------------------------------
    txt_bytes = b"Maximum operating pressure: 10 bar. Temperature range: -20C to 80C."

    print("\n5. Testing POST /products/upload with TXT file...")
    res_txt = client.post(
        "/products/upload",
        files={"file": ("notes.txt", txt_bytes, "text/plain")}
    )
    print(f"   Status Code: {res_txt.status_code}")
    print(f"   Response JSON: {res_txt.json()}")
    assert res_txt.status_code == 200
    assert res_txt.json()["file_type"] == "txt"

    # -----------------------------------------------------------------
    # 6. IMAGE FILE UPLOAD
    # -----------------------------------------------------------------
    img = Image.new("RGB", (100, 100), color="blue")
    img_buffer = io.BytesIO()
    img.save(img_buffer, format="PNG")
    img_bytes = img_buffer.getvalue()

    print("\n6. Testing POST /products/upload with Image file...")
    res_img = client.post(
        "/products/upload",
        files={"file": ("product_label.png", img_bytes, "image/png")}
    )
    print(f"   Status Code: {res_img.status_code}")
    print(f"   Response JSON: {res_img.json()}")
    assert res_img.status_code == 200
    assert res_img.json()["file_type"] == "image"

    # -----------------------------------------------------------------
    # 7. PRODUCT URL INPUT
    # -----------------------------------------------------------------
    print("\n7. Testing POST /products/url with Product URL...")
    res_url = client.post(
        "/products/url",
        json={"url": "https://industrial-supplier.com/products/valve-101"}
    )
    print(f"   Status Code: {res_url.status_code}")
    print(f"   Response JSON: {res_url.json()}")
    assert res_url.status_code == 200
    assert res_url.json()["source_type"] == "url"

    # -----------------------------------------------------------------
    # 8. PASTED PRODUCT TEXT INPUT
    # -----------------------------------------------------------------
    print("\n8. Testing POST /products/text with Pasted Text...")
    res_pasted = client.post(
        "/products/text",
        json={"text": "Heavy Duty Industrial Motor - Model X500, 50HP, 460V, 3 Phase."}
    )
    print(f"   Status Code: {res_pasted.status_code}")
    print(f"   Response JSON: {res_pasted.json()}")
    assert res_pasted.status_code == 200
    assert res_pasted.json()["source_type"] == "text"

    # -----------------------------------------------------------------
    # 9. MANUAL PRODUCT ENTRY
    # -----------------------------------------------------------------
    print("\n9. Testing POST /products/manual with Manual Product Fields...")
    res_manual = client.post(
        "/products/manual",
        json={
            "name": "Thermal Imaging Camera",
            "category": "Inspection",
            "price": 1200.0,
            "competitor_price": 1350.0,
            "manufacturer": "FLIR",
            "sku": "TIC-9900"
        }
    )
    print(f"   Status Code: {res_manual.status_code}")
    print(f"   Response JSON: {res_manual.json()}")
    assert res_manual.status_code == 200
    assert res_manual.json()["source_type"] == "manual"

    # -----------------------------------------------------------------
    # 10. UNIFIED API (/api/uploads) AND JOB STATUS (/api/jobs/{job_id})
    # -----------------------------------------------------------------
    print("\n10. Testing POST /api/uploads and GET /api/jobs/{jobId}...")
    res_api_upload = client.post(
        "/api/uploads",
        files={"file": ("unified_catalog.csv", csv_bytes, "text/csv")}
    )
    print(f"    Status Code: {res_api_upload.status_code}")
    print(f"    Upload Response: {res_api_upload.json()}")
    assert res_api_upload.status_code == 200
    job_id = res_api_upload.json()["jobId"]

    res_job = client.get(f"/api/jobs/{job_id}")
    print(f"    Job Status Code: {res_job.status_code}")
    print(f"    Job Response: {res_job.json()}")
    assert res_job.status_code == 200
    assert res_job.json()["jobId"] == job_id
    assert res_job.json()["status"] == "queued"

    # -----------------------------------------------------------------
    # 11. INVALID FILE FORMAT ERROR HANDLING
    # -----------------------------------------------------------------
    print("\n11. Testing invalid file format error handling...")
    res_invalid = client.post(
        "/products/upload",
        files={"file": ("corrupt_file.xyz", b"some raw bytes", "application/octet-stream")}
    )
    print(f"    Status Code: {res_invalid.status_code}")
    print(f"    Response JSON: {res_invalid.json()}")
    assert res_invalid.status_code == 400
    assert "Unsupported file format" in res_invalid.json()["detail"]

    print("\n--- ALL EXTENDED INPUT SUPPORT VERIFICATIONS PASSED SUCCESSFULLY ---")


if __name__ == "__main__":
    test_file_upload()
