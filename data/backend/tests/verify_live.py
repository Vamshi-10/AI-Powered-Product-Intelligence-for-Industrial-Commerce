import json
import sys
import urllib.request
import urllib.error

PORT = sys.argv[1] if len(sys.argv) > 1 else "8089"
BASE_URL = f"http://127.0.0.1:{PORT}"


def make_request(url, method="GET", body=None):
    headers = {"Content-Type": "application/json"}
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content)
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        return e.code, json.loads(content)


def main():
    print(f"Testing live FastAPI endpoints on {BASE_URL}...")

    # 1. Root
    status, res = make_request(f"{BASE_URL}/")
    print(f"GET / -> Status: {status}, Response: {res}")
    assert status == 200 and res == {"message": "AI Product Intelligence API is running"}

    # 2. GET /products (empty)
    status, res = make_request(f"{BASE_URL}/products")
    print(f"GET /products -> Status: {status}, Response: {res}")
    assert status == 200

    # 3. POST /products
    product_payload = {
        "name": "Industrial Compressor",
        "category": "Compressors",
        "price": 1200.0,
        "competitor_price": 1350.0
    }
    status, res = make_request(f"{BASE_URL}/products", method="POST", body=product_payload)
    print(f"POST /products -> Status: {status}, Response: {res}")
    assert status == 200 and res.get("id") == 1
    product_id = res["id"]

    # 4. GET /products/{product_id}
    status, res = make_request(f"{BASE_URL}/products/{product_id}")
    print(f"GET /products/{product_id} -> Status: {status}, Response: {res}")
    assert status == 200 and res.get("name") == "Industrial Compressor"

    # 5. PUT /products/{product_id}
    update_payload = {
        "name": "Industrial Compressor V2",
        "category": "Compressors",
        "price": 1250.0,
        "competitor_price": 1350.0
    }
    status, res = make_request(f"{BASE_URL}/products/{product_id}", method="PUT", body=update_payload)
    print(f"PUT /products/{product_id} -> Status: {status}, Response: {res}")
    assert status == 200 and res.get("name") == "Industrial Compressor V2"

    # 6. POST /products/analyze
    analyze_payload = {
        "name": "Industrial Compressor V2",
        "category": "Compressors",
        "price": 1250.0,
        "competitor_price": 1350.0
    }
    status, res = make_request(f"{BASE_URL}/products/analyze", method="POST", body=analyze_payload)
    print(f"POST /products/analyze -> Status: {status}, Response: {res}")
    assert status == 200 and res.get("price_position") == "Cheaper than competitor"

    # 7. DELETE /products/{product_id}
    status, res = make_request(f"{BASE_URL}/products/{product_id}", method="DELETE")
    print(f"DELETE /products/{product_id} -> Status: {status}, Response: {res}")
    assert status == 200 and res.get("message") == "Product deleted successfully"

    # 8. GET /products/{product_id} (non-existent)
    status, res = make_request(f"{BASE_URL}/products/{product_id}")
    print(f"GET /products/{product_id} (deleted) -> Status: {status}, Response: {res}")
    assert status == 200 and res == {"error": "Product not found"}

    print("\nALL ENDPOINT VERIFICATIONS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    main()
