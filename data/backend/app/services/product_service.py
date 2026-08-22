from app.schemas.product import Product
from app.db.supabase import get_supabase_client


class ProductService:
    def __init__(self):
        self.products: dict[int, dict] = {}
        self.next_product_id: int = 1

    def create_product(self, product: Product) -> dict:
        supabase = get_supabase_client()
        product_data = product.model_dump()

        if supabase:
            try:
                response = supabase.table("products").insert(product_data).execute()
                if response.data:
                    row = response.data[0]
                    return {
                        "id": row["id"],
                        "name": row["name"],
                        "category": row["category"],
                        "price": float(row["price"]),
                        "competitor_price": float(row["competitor_price"])
                    }
            except Exception as e:
                print(f"Supabase error in create_product: {e}")

        # Fallback to in-memory store
        self.products[self.next_product_id] = product_data
        created_product = {
            "id": self.next_product_id,
            **self.products[self.next_product_id]
        }
        self.next_product_id += 1
        return created_product

    def get_all_products(self) -> dict:
        supabase = get_supabase_client()

        if supabase:
            try:
                response = supabase.table("products").select("*").execute()
                if response.data is not None:
                    products_dict = {}
                    for row in response.data:
                        products_dict[row["id"]] = {
                            "name": row["name"],
                            "category": row["category"],
                            "price": float(row["price"]),
                            "competitor_price": float(row["competitor_price"])
                        }
                    return products_dict
            except Exception as e:
                print(f"Supabase error in get_all_products: {e}")

        # Fallback to in-memory store
        return self.products

    def get_product_by_id(self, product_id: int) -> dict:
        supabase = get_supabase_client()

        if supabase:
            try:
                response = supabase.table("products").select("*").eq("id", product_id).execute()
                if response.data:
                    row = response.data[0]
                    return {
                        "id": row["id"],
                        "name": row["name"],
                        "category": row["category"],
                        "price": float(row["price"]),
                        "competitor_price": float(row["competitor_price"])
                    }
                return {"error": "Product not found"}
            except Exception as e:
                print(f"Supabase error in get_product_by_id: {e}")

        # Fallback to in-memory store
        if product_id not in self.products:
            return {"error": "Product not found"}

        return {
            "id": product_id,
            **self.products[product_id]
        }

    def update_product(self, product_id: int, product: Product) -> dict:
        supabase = get_supabase_client()
        product_data = product.model_dump()

        if supabase:
            try:
                response = supabase.table("products").update(product_data).eq("id", product_id).execute()
                if response.data:
                    row = response.data[0]
                    return {
                        "id": row["id"],
                        "name": row["name"],
                        "category": row["category"],
                        "price": float(row["price"]),
                        "competitor_price": float(row["competitor_price"])
                    }
                return {"error": "Product not found"}
            except Exception as e:
                print(f"Supabase error in update_product: {e}")

        # Fallback to in-memory store
        if product_id not in self.products:
            return {"error": "Product not found"}

        self.products[product_id] = product_data
        return {
            "id": product_id,
            **self.products[product_id]
        }

    def delete_product(self, product_id: int) -> dict:
        supabase = get_supabase_client()

        if supabase:
            try:
                response = supabase.table("products").delete().eq("id", product_id).execute()
                if response.data:
                    row = response.data[0]
                    deleted_product = {
                        "name": row["name"],
                        "category": row["category"],
                        "price": float(row["price"]),
                        "competitor_price": float(row["competitor_price"])
                    }
                    return {
                        "message": "Product deleted successfully",
                        "id": row["id"],
                        "product": deleted_product
                    }
                return {"error": "Product not found"}
            except Exception as e:
                print(f"Supabase error in delete_product: {e}")

        # Fallback to in-memory store
        if product_id not in self.products:
            return {"error": "Product not found"}

        deleted_product = self.products.pop(product_id)
        return {
            "message": "Product deleted successfully",
            "id": product_id,
            "product": deleted_product
        }

    def analyze_product(self, product: Product) -> dict:
        price_difference = product.price - product.competitor_price

        if price_difference < 0:
            price_position = "Cheaper than competitor"
        elif price_difference > 0:
            price_position = "More expensive than competitor"
        else:
            price_position = "Same price as competitor"

        return {
            "product": product.name,
            "category": product.category,
            "price": product.price,
            "competitor_price": product.competitor_price,
            "price_difference": price_difference,
            "price_position": price_position
        }


# Global singleton instance for service persistence
product_service = ProductService()
