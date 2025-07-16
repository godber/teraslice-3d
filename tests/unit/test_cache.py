import pytest
import asyncio
import time
from app.lib.cache import CacheManager, CacheEntry


class TestCacheEntry:
    def test_cache_entry_creation(self):
        entry = CacheEntry(data="test_data", timestamp=time.time(), ttl=30)
        assert entry.data == "test_data"
        assert entry.ttl == 30
        assert not entry.is_expired()
    
    def test_cache_entry_expiration(self):
        # Create an entry that is already expired
        old_timestamp = time.time() - 60  # 60 seconds ago
        entry = CacheEntry(data="test_data", timestamp=old_timestamp, ttl=30)
        assert entry.is_expired()


class TestCacheManager:
    def test_cache_manager_initialization(self):
        cache = CacheManager(default_ttl=60)
        assert cache.default_ttl == 60
        assert len(cache.cache) == 0
    
    def test_cache_set_and_get(self):
        cache = CacheManager()
        cache.set("test_key", "test_value")
        
        assert cache.get("test_key") == "test_value"
        assert cache.has("test_key")
    
    def test_cache_get_nonexistent(self):
        cache = CacheManager()
        assert cache.get("nonexistent") is None
        assert not cache.has("nonexistent")
    
    def test_cache_expiration(self):
        cache = CacheManager()
        cache.set("test_key", "test_value", ttl=1)
        
        # Should exist immediately
        assert cache.get("test_key") == "test_value"
        
        # Wait for expiration
        time.sleep(1.1)
        
        # Should be expired and return None
        assert cache.get("test_key") is None
        assert not cache.has("test_key")
    
    def test_cache_invalidate(self):
        cache = CacheManager()
        cache.set("test_key", "test_value")
        
        assert cache.get("test_key") == "test_value"
        
        cache.invalidate("test_key")
        
        assert cache.get("test_key") is None
        assert not cache.has("test_key")
    
    def test_cache_clear(self):
        cache = CacheManager()
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        
        assert len(cache.cache) == 2
        
        cache.clear()
        
        assert len(cache.cache) == 0
        assert cache.get("key1") is None
        assert cache.get("key2") is None
    
    def test_cache_status(self):
        cache = CacheManager()
        cache.set("test_key", "test_value", ttl=60)
        
        status = cache.get_status()
        
        assert status["cache_size"] == 1
        assert status["active_refresh_tasks"] == 0
        assert len(status["entries"]) == 1
        
        entry = status["entries"][0]
        assert entry["key"] == "test_key"
        assert entry["ttl_seconds"] == 60
        assert entry["age_seconds"] >= 0
        assert entry["time_left_seconds"] > 0
        assert not entry["is_expired"]
    
    @pytest.mark.asyncio
    async def test_cache_refresh_task(self):
        cache = CacheManager()
        
        # Counter to track refresh calls
        refresh_count = 0
        
        async def mock_refresh():
            nonlocal refresh_count
            refresh_count += 1
            return f"refreshed_data_{refresh_count}"
        
        # Schedule a refresh with very short interval for testing
        cache.schedule_refresh("test_key", mock_refresh, 0.1)
        
        # Wait for a few refresh cycles
        await asyncio.sleep(0.35)
        
        # Should have been called multiple times
        assert refresh_count >= 3
        
        # Should have cached data
        cached_data = cache.get("test_key")
        assert cached_data.startswith("refreshed_data_")
        
        # Clean up
        cache.clear()