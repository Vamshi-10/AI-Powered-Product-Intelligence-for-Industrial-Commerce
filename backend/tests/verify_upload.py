import io
import pandas as pd
from starlette.testclient import TestClient
from app.main import app
from app.services.product_service import product_service

client = TestClient(app)


def test_file_upload():
    print("--- VERIFYING DOCUMENT PROCESSING & FILE UPLOAD SYSTEM ---")

    # Reset in-memory product service state
    product_service.products = {}
    product_service.next_product_id = 1

    # 1. Create in-memory CSV file data
    csv_data = (
        "name,category,price,competitor_price\n"
        "Centrifugal Pump,Pumps,850.0,900.0\n"
        "Hydraulic Valve,Valves,210.0,200.0\n"
        "Industrial Gearbox,Gears,1500.0,1650.0\n"
    )
    csv_bytes = csv_data.encode("utf-8")

    print("1. Testing POST /products/upload with CSV file...")
    response = client.post(
        "/products/upload",
        files={"file": ("industrial_catalog.csv", csv_bytes, "text/csv")}
    )
    print(f"   Status Code: {response.status_code}")
    print(f"   Response JSON: {response.json()}")

    assert response.status_code == 200
    res_data = response.json()
    assert res_data["filename"] == "industrial_catalog.csv"
    assert res_data["processed_rows"] == 3
    assert res_data["inserted_count"] == 3
    assert res_data["failed_count"] == 0

    # 2. Verify products were created in system
    get_res = client.get("/products")
    products = get_res.json()
    print(f"2. Products list after CSV import (total {len(products)}):")
    for pid, pdata in products.items():
        print(f"   ID {pid}: {pdata}")
    assert len(products) == 3

    # 3. Create in-memory Excel file data
    df_excel = pd.DataFrame([
        {
            "name": "High-Pressure Hose",
            "category": "Hoses",
            "price": 95.0,
            "competitor_price": 105.0
        },
        {
            "name": "Pneumatic Cylinder",
            "category": "Actuators",
            "price": 320.0,
            "competitor_price": 310.0
        }
    ])
    excel_buffer = io.BytesIO()
    with pd.ExcelWriter(excel_buffer, engine="openpyxl") as writer:
        df_excel.to_excel(writer, index=False)
    excel_bytes = excel_buffer.getvalue()

    print("\n3. Testing POST /products/upload with Excel file...")
    response_excel = client.post(
        "/products/upload",
        files={"file": ("catalog_batch2.xlsx", excel_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    )
    print(f"   Status Code: {response_excel.status_code}")
    print(f"   Response JSON: {response_excel.json()}")

    assert response_excel.status_code == 200
    res_excel_data = response_excel.json()
    assert res_excel_data["processed_rows"] == 2
    assert res_excel_data["inserted_count"] == 2

    # 4. Verify combined products count
    get_all_res = client.get("/products")
    all_products = get_all_res.json()
    print(f"\n4. Combined products list after Excel import (total {len(all_products)}):")
    assert len(all_products) == 5

    # 5. Test invalid file format error handling
    print("\n5. Testing invalid file format handling...")
    invalid_res = client.post(
        "/products/upload",
        files={"file": ("invalid_doc.pdf", b"pdf content", "application/pdf")}
    )
    print(f"   Status Code: {invalid_res.status_code}, Response: {invalid_res.json()}")
    assert invalid_res.status_code == 400

    print("\n--- ALL DOCUMENT PROCESSING VERIFICATIONS PASSED ---")


if __name__ == "__main__":
    test_file_upload()
