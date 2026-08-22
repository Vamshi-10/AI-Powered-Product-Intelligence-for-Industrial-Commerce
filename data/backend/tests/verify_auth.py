from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_authentication_system():
    print("--- VERIFYING SUPABASE AUTHENTICATION & AUTHORIZATION SYSTEM ---")

    test_email = "engineer@industrial-corp.com"
    test_password = "SecurePassword123!"

    # 1. Test POST /auth/signup
    print("1. Testing POST /auth/signup...")
    signup_res = client.post(
        "/auth/signup",
        json={"email": test_email, "password": test_password}
    )
    print(f"   Status Code: {signup_res.status_code}")
    print(f"   Response JSON: {signup_res.json()}")
    assert signup_res.status_code == 200
    signup_data = signup_res.json()
    assert "access_token" in signup_data
    assert signup_data["user"]["email"] == test_email

    # 2. Test POST /auth/login
    print("\n2. Testing POST /auth/login...")
    login_res = client.post(
        "/auth/login",
        json={"email": test_email, "password": test_password}
    )
    print(f"   Status Code: {login_res.status_code}")
    print(f"   Response JSON: {login_res.json()}")
    assert login_res.status_code == 200
    login_data = login_res.json()
    token = login_data["access_token"]
    assert token is not None

    # 3. Test GET /auth/me with valid Bearer token
    print("\n3. Testing GET /auth/me with valid Authorization header...")
    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/auth/me", headers=headers)
    print(f"   Status Code: {me_res.status_code}")
    print(f"   Response JSON: {me_res.json()}")
    assert me_res.status_code == 200
    assert me_res.json()["status"] == "authenticated"
    assert me_res.json()["user"]["email"] == test_email

    # 4. Test GET /auth/me without token (Unauthenticated check)
    print("\n4. Testing GET /auth/me without Authorization header (401 expected)...")
    unauth_res = client.get("/auth/me")
    print(f"   Status Code: {unauth_res.status_code}")
    print(f"   Response JSON: {unauth_res.json()}")
    assert unauth_res.status_code == 401

    # 5. Test GET /auth/me with invalid token (401 expected)
    print("\n5. Testing GET /auth/me with invalid token (401 expected)...")
    invalid_res = client.get("/auth/me", headers={"Authorization": "Bearer invalid_garbage_token"})
    print(f"   Status Code: {invalid_res.status_code}")
    print(f"   Response JSON: {invalid_res.json()}")
    assert invalid_res.status_code == 401

    print("\n--- ALL AUTHENTICATION VERIFICATIONS PASSED SUCCESSFULLY ---")


if __name__ == "__main__":
    test_authentication_system()
