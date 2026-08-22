import unittest
from starlette.testclient import TestClient
from app.main import app
from app.services.product_service import product_service


class TestProductAPI(unittest.TestCase):

    def setUp(self):
        # Reset state before each test method
        product_service.products = {}
        product_service.next_product_id = 1
        self.client = TestClient(app)

    def test_root_endpoint(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"message": "AI Product Intelligence API is running"})

    def test_get_products_empty(self):
        response = self.client.get("/products")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {})

    def test_create_product(self):
        payload = {
            "name": "Industrial Pump",
            "category": "Machinery",
            "price": 450.0,
            "competitor_price": 500.0
        }
        response = self.client.post("/products", json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {
            "id": 1,
            "name": "Industrial Pump",
            "category": "Machinery",
            "price": 450.0,
            "competitor_price": 500.0
        })

    def test_get_product_by_id(self):
        payload = {
            "name": "Safety Valve",
            "category": "Valves",
            "price": 120.0,
            "competitor_price": 110.0
        }
        created = self.client.post("/products", json=payload).json()
        product_id = created["id"]

        response = self.client.get(f"/products/{product_id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {
            "id": product_id,
            "name": "Safety Valve",
            "category": "Valves",
            "price": 120.0,
            "competitor_price": 110.0
        })

    def test_get_nonexistent_product(self):
        response = self.client.get("/products/999")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"error": "Product not found"})

    def test_update_product(self):
        payload = {
            "name": "Pressure Gauge",
            "category": "Sensors",
            "price": 80.0,
            "competitor_price": 85.0
        }
        created = self.client.post("/products", json=payload).json()
        product_id = created["id"]

        update_payload = {
            "name": "Pressure Gauge Pro",
            "category": "Sensors",
            "price": 90.0,
            "competitor_price": 85.0
        }
        response = self.client.put(f"/products/{product_id}", json=update_payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {
            "id": product_id,
            "name": "Pressure Gauge Pro",
            "category": "Sensors",
            "price": 90.0,
            "competitor_price": 85.0
        })

    def test_update_nonexistent_product(self):
        payload = {
            "name": "Nonexistent",
            "category": "Test",
            "price": 10.0,
            "competitor_price": 10.0
        }
        response = self.client.put("/products/999", json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"error": "Product not found"})

    def test_delete_product(self):
        payload = {
            "name": "Thermal Sensor",
            "category": "Sensors",
            "price": 200.0,
            "competitor_price": 220.0
        }
        created = self.client.post("/products", json=payload).json()
        product_id = created["id"]

        response = self.client.delete(f"/products/{product_id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {
            "message": "Product deleted successfully",
            "id": product_id,
            "product": {
                "name": "Thermal Sensor",
                "category": "Sensors",
                "price": 200.0,
                "competitor_price": 220.0
            }
        })

        get_res = self.client.get(f"/products/{product_id}")
        self.assertEqual(get_res.json(), {"error": "Product not found"})

    def test_delete_nonexistent_product(self):
        response = self.client.delete("/products/999")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"error": "Product not found"})

    def test_analyze_product_cheaper(self):
        payload = {
            "name": "Electric Motor",
            "category": "Motors",
            "price": 300.0,
            "competitor_price": 350.0
        }
        response = self.client.post("/products/analyze", json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {
            "product": "Electric Motor",
            "category": "Motors",
            "price": 300.0,
            "competitor_price": 350.0,
            "price_difference": -50.0,
            "price_position": "Cheaper than competitor"
        })

    def test_analyze_product_more_expensive(self):
        payload = {
            "name": "Electric Motor",
            "category": "Motors",
            "price": 400.0,
            "competitor_price": 350.0
        }
        response = self.client.post("/products/analyze", json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {
            "product": "Electric Motor",
            "category": "Motors",
            "price": 400.0,
            "competitor_price": 350.0,
            "price_difference": 50.0,
            "price_position": "More expensive than competitor"
        })

    def test_analyze_product_same_price(self):
        payload = {
            "name": "Electric Motor",
            "category": "Motors",
            "price": 350.0,
            "competitor_price": 350.0
        }
        response = self.client.post("/products/analyze", json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {
            "product": "Electric Motor",
            "category": "Motors",
            "price": 350.0,
            "competitor_price": 350.0,
            "price_difference": 0.0,
            "price_position": "Same price as competitor"
        })


if __name__ == "__main__":
    unittest.main()
