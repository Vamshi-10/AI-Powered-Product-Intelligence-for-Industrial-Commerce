import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.product_service import product_service

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_service_state():
    # Reset in-memory dictionary before each test
    product_service.products = {}
    product_service.next_product_id = 1


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "AI Product Intelligence API is running"}


def test_get_products_empty():
    response = client.get("/products")
    assert response.status_code == 200
    assert response.json() == {}


def test_create_product():
    payload = {
        "name": "Industrial Pump",
        "category": "Machinery",
        "price": 450.0,
        "competitor_price": 500.0
    }
    response = client.post("/products", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data == {
        "id": 1,
        "name": "Industrial Pump",
        "category": "Machinery",
        "price": 450.0,
        "competitor_price": 500.0
    }


def test_get_product_by_id():
    # Create product first
    payload = {
        "name": "Safety Valve",
        "category": "Valves",
        "price": 120.0,
        "competitor_price": 110.0
    }
    created = client.post("/products", json=payload).json()
    product_id = created["id"]

    response = client.get(f"/products/{product_id}")
    assert response.status_code == 200
    assert response.json() == {
        "id": product_id,
        "name": "Safety Valve",
        "category": "Valves",
        "price": 120.0,
        "competitor_price": 110.0
    }


def test_get_nonexistent_product():
    response = client.get("/products/999")
    assert response.status_code == 200
    assert response.json() == {"error": "Product not found"}


def test_update_product():
    payload = {
        "name": "Pressure Gauge",
        "category": "Sensors",
        "price": 80.0,
        "competitor_price": 85.0
    }
    created = client.post("/products", json=payload).json()
    product_id = created["id"]

    update_payload = {
        "name": "Pressure Gauge Pro",
        "category": "Sensors",
        "price": 90.0,
        "competitor_price": 85.0
    }
    response = client.put(f"/products/{product_id}", json=update_payload)
    assert response.status_code == 200
    assert response.json() == {
        "id": product_id,
        "name": "Pressure Gauge Pro",
        "category": "Sensors",
        "price": 90.0,
        "competitor_price": 85.0
    }


def test_update_nonexistent_product():
    payload = {
        "name": "Nonexistent",
        "category": "Test",
        "price": 10.0,
        "competitor_price": 10.0
    }
    response = client.put("/products/999", json=payload)
    assert response.status_code == 200
    assert response.json() == {"error": "Product not found"}


def test_delete_product():
    payload = {
        "name": "Thermal Sensor",
        "category": "Sensors",
        "price": 200.0,
        "competitor_price": 220.0
    }
    created = client.post("/products", json=payload).json()
    product_id = created["id"]

    response = client.delete(f"/products/{product_id}")
    assert response.status_code == 200
    assert response.json() == {
        "message": "Product deleted successfully",
        "id": product_id,
        "product": {
            "name": "Thermal Sensor",
            "category": "Sensors",
            "price": 200.0,
            "competitor_price": 220.0
        }
    }

    # Verify deleted
    get_res = client.get(f"/products/{product_id}")
    assert get_res.json() == {"error": "Product not found"}


def test_delete_nonexistent_product():
    response = client.delete("/products/999")
    assert response.status_code == 200
    assert response.json() == {"error": "Product not found"}


def test_analyze_product_cheaper():
    payload = {
        "name": "Electric Motor",
        "category": "Motors",
        "price": 300.0,
        "competitor_price": 350.0
    }
    response = client.post("/products/analyze", json=payload)
    assert response.status_code == 200
    assert response.json() == {
        "product": "Electric Motor",
        "category": "Motors",
        "price": 300.0,
        "competitor_price": 350.0,
        "price_difference": -50.0,
        "price_position": "Cheaper than competitor"
    }


def test_analyze_product_more_expensive():
    payload = {
        "name": "Electric Motor",
        "category": "Motors",
        "price": 400.0,
        "competitor_price": 350.0
    }
    response = client.post("/products/analyze", json=payload)
    assert response.status_code == 200
    assert response.json() == {
        "product": "Electric Motor",
        "category": "Motors",
        "price": 400.0,
        "competitor_price": 350.0,
        "price_difference": 50.0,
        "price_position": "More expensive than competitor"
    }


def test_analyze_product_same_price():
    payload = {
        "name": "Electric Motor",
        "category": "Motors",
        "price": 350.0,
        "competitor_price": 350.0
    }
    response = client.post("/products/analyze", json=payload)
    assert response.status_code == 200
    assert response.json() == {
        "product": "Electric Motor",
        "category": "Motors",
        "price": 350.0,
        "competitor_price": 350.0,
        "price_difference": 0.0,
        "price_position": "Same price as competitor"
    }
