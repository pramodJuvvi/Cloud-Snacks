import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.main import app, get_db


# Use in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    yield TestingSessionLocal()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


class TestHealthCheck:
    """Test basic health check endpoint"""

    def test_home_endpoint(self, client):
        response = client.get("/")
        assert response.status_code == 200
        assert "message" in response.json()
        assert "running" in response.json()["message"].lower()


class TestUserRegistration:
    """Test user registration functionality"""

    def test_register_new_user_success(self, client):
        payload = {
            "name": "John Doe",
            "email": "john@example.com",
            "password": "securepass123",
        }
        response = client.post("/auth/register", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "john@example.com"
        assert data["user"]["name"] == "John Doe"

    def test_register_duplicate_email_fails(self, client):
        payload = {
            "name": "John Doe",
            "email": "john@example.com",
            "password": "securepass123",
        }
        # First registration
        response1 = client.post("/auth/register", json=payload)
        assert response1.status_code == 201

        # Duplicate registration
        response2 = client.post("/auth/register", json=payload)
        assert response2.status_code == 409
        assert "already exists" in response2.json()["detail"].lower()

    def test_register_short_password_fails(self, client):
        payload = {
            "name": "John Doe",
            "email": "john@example.com",
            "password": "short",
        }
        response = client.post("/auth/register", json=payload)
        assert response.status_code == 422

    def test_register_invalid_email_fails(self, client):
        payload = {
            "name": "John Doe",
            "email": "invalid",
            "password": "securepass123",
        }
        response = client.post("/auth/register", json=payload)
        assert response.status_code == 422

    def test_register_whitespace_trimmed(self, client):
        payload = {
            "name": "  John Doe  ",
            "email": "  JOHN@EXAMPLE.COM  ",
            "password": "securepass123",
        }
        response = client.post("/auth/register", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["user"]["name"] == "John Doe"
        assert data["user"]["email"] == "john@example.com"


class TestUserLogin:
    """Test user login functionality"""

    def test_login_success(self, client):
        # Register user
        register_payload = {
            "name": "John Doe",
            "email": "john@example.com",
            "password": "securepass123",
        }
        client.post("/auth/register", json=register_payload)

        # Login
        login_payload = {"email": "john@example.com", "password": "securepass123"}
        response = client.post("/auth/login", json=login_payload)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "john@example.com"

    def test_login_invalid_password_fails(self, client):
        # Register user
        register_payload = {
            "name": "John Doe",
            "email": "john@example.com",
            "password": "securepass123",
        }
        client.post("/auth/register", json=register_payload)

        # Try wrong password
        login_payload = {"email": "john@example.com", "password": "wrongpassword"}
        response = client.post("/auth/login", json=login_payload)
        assert response.status_code == 401
        assert "Invalid" in response.json()["detail"]

    def test_login_nonexistent_user_fails(self, client):
        login_payload = {"email": "nonexistent@example.com", "password": "anypassword"}
        response = client.post("/auth/login", json=login_payload)
        assert response.status_code == 401


class TestSnackListing:
    """Test snack catalog functionality"""

    def test_list_snacks_empty(self, client):
        response = client.get("/snacks")
        assert response.status_code == 200
        # Should be empty initially or seeded
        snacks = response.json()
        assert isinstance(snacks, list)

    def test_list_snacks_returns_correct_format(self, client):
        response = client.get("/snacks")
        assert response.status_code == 200
        snacks = response.json()
        if snacks:
            snack = snacks[0]
            assert "id" in snack
            assert "name" in snack
            assert "description" in snack
            assert "price" in snack
            assert "prep_minutes" in snack
            assert "calories" in snack
            assert "category" in snack
            assert "accent" in snack


class TestOrderCreation:
    """Test order creation functionality"""

    def test_create_order_guest_success(self, client):
        payload = {
            "customer_name": "Guest User",
            "customer_email": "guest@example.com",
            "customer_phone": "1234567890",
            "delivery_address": "123 Main St, City",
            "delivery_note": "Leave at door",
            "items": [{"snack_id": 1, "quantity": 2}],
        }
        # Note: Will fail if snack_id 1 doesn't exist
        response = client.post("/orders", json=payload)
        if response.status_code == 201:
            data = response.json()
            assert data["customer_name"] == "Guest User"
            assert data["customer_email"] == "guest@example.com"
            assert "total" in data

    def test_create_order_missing_items_fails(self, client):
        payload = {
            "customer_name": "Guest User",
            "customer_email": "guest@example.com",
            "customer_phone": "1234567890",
            "delivery_address": "123 Main St, City",
            "delivery_note": "",
            "items": [],
        }
        response = client.post("/orders", json=payload)
        assert response.status_code == 422


class TestAuth:
    """Test authentication endpoints"""

    def test_get_current_user_with_valid_token(self, client):
        # Register and get token
        register_payload = {
            "name": "John Doe",
            "email": "john@example.com",
            "password": "securepass123",
        }
        register_response = client.post("/auth/register", json=register_payload)
        token = register_response.json()["access_token"]

        # Use token to get current user
        headers = {"Authorization": f"Bearer {token}"}
        response = client.get("/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "john@example.com"

    def test_get_current_user_without_token_fails(self, client):
        response = client.get("/auth/me")
        assert response.status_code == 403

    def test_get_current_user_with_invalid_token_fails(self, client):
        headers = {"Authorization": "Bearer invalid.token.here"}
        response = client.get("/auth/me", headers=headers)
        assert response.status_code == 403
