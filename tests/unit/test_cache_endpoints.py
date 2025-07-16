import pytest
from fastapi.testclient import TestClient
from app.main import app, cache


class TestCacheEndpoints:
    def setup_method(self):
        """Setup test client and clear cache before each test."""
        self.client = TestClient(app)
        cache.clear()
    
    def test_cache_status_endpoint(self):
        """Test the /api/cache/status endpoint."""
        response = self.client.get("/api/cache/status")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have expected fields
        assert "cache_size" in data
        assert "active_refresh_tasks" in data
        assert "entries" in data
        
        # Initially empty
        assert data["cache_size"] == 0
        assert data["entries"] == []
    
    def test_cache_clear_endpoint(self):
        """Test the /api/cache/clear endpoint."""
        # Add some test data to cache
        cache.set("test_key1", "test_data1")
        cache.set("test_key2", "test_data2")
        
        # Verify cache has data
        status = cache.get_status()
        assert status["cache_size"] == 2
        
        # Clear cache via API
        response = self.client.post("/api/cache/clear")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have success message and status
        assert "message" in data
        assert "status" in data
        assert data["message"] == "Cache cleared successfully"
        
        # Status should show empty cache
        assert data["status"]["cache_size"] == 0
        assert data["status"]["entries"] == []
        
        # Verify cache is actually cleared
        assert cache.get("test_key1") is None
        assert cache.get("test_key2") is None
    
    def test_cache_clear_endpoint_method_not_allowed(self):
        """Test that cache clear endpoint only accepts POST requests."""
        # GET should not be allowed
        response = self.client.get("/api/cache/clear")
        assert response.status_code in [404, 405]  # FastAPI behavior varies
        
        # PUT should not be allowed
        response = self.client.put("/api/cache/clear")
        assert response.status_code in [404, 405]  # FastAPI behavior varies
        
        # DELETE should not be allowed
        response = self.client.delete("/api/cache/clear")
        assert response.status_code in [404, 405]  # FastAPI behavior varies
    
    def test_cache_status_after_clear(self):
        """Test that cache status is updated after clearing."""
        # Add data
        cache.set("key1", "data1")
        cache.set("key2", "data2")
        
        # Check status before clear
        response = self.client.get("/api/cache/status")
        assert response.json()["cache_size"] == 2
        
        # Clear cache
        self.client.post("/api/cache/clear")
        
        # Check status after clear
        response = self.client.get("/api/cache/status")
        data = response.json()
        assert data["cache_size"] == 0
        assert data["entries"] == []