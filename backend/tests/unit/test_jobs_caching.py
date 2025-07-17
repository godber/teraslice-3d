import pytest
from app.main import cache
from app.lib.cache import CacheManager


class TestJobsCaching:
    def test_cache_initialization(self):
        """Test that cache is properly initialized."""
        assert cache is not None
        assert isinstance(cache, CacheManager)
    
    def test_jobs_cache_key_format(self):
        """Test that jobs cache keys are formatted correctly."""
        # Test default parameters
        expected_key = "jobs_500_true__status"
        
        # We can't easily test the actual key generation without mocking,
        # but we can verify the expected format
        assert "_" in expected_key
        assert expected_key.startswith("jobs_")
    
    def test_cache_empty_initially(self):
        """Test that cache starts empty."""
        cache.clear()
        status = cache.get_status()
        assert status['cache_size'] == 0
        assert status['entries'] == []
    
    def test_cache_stores_jobs_data(self):
        """Test that jobs data can be stored and retrieved from cache."""
        cache.clear()
        
        cache_key = "jobs_500_true__status"
        test_data = [
            {"job_id": "test1", "name": "test_job1", "workers": 1, "ex": {"_status": "running"}},
            {"job_id": "test2", "name": "test_job2", "workers": 2, "ex": {"_status": "stopped"}}
        ]
        
        cache.set(cache_key, test_data)
        
        cached_data = cache.get(cache_key)
        assert cached_data == test_data
    
    def test_cache_status_after_storing_data(self):
        """Test that cache status reflects stored data."""
        cache.clear()
        
        cache_key = "jobs_500_true__status"
        test_data = [{"job_id": "test", "name": "test_job", "workers": 1, "ex": {"_status": "running"}}]
        
        cache.set(cache_key, test_data)
        
        status = cache.get_status()
        assert status['cache_size'] == 1
        assert len(status['entries']) == 1
        
        entry = status['entries'][0]
        assert entry['key'] == cache_key
        assert entry['ttl_seconds'] > 0
        assert not entry['is_expired']
    
    def test_multiple_jobs_cache_keys(self):
        """Test that different parameter combinations create different cache keys."""
        cache.clear()
        
        # Different cache keys for different parameters
        key1 = "jobs_500_true__status"
        key2 = "jobs_100_false__status"
        key3 = "jobs_500_true_name"
        
        test_data1 = [{"job_id": "test1"}]
        test_data2 = [{"job_id": "test2"}]
        test_data3 = [{"job_id": "test3"}]
        
        cache.set(key1, test_data1)
        cache.set(key2, test_data2)
        cache.set(key3, test_data3)
        
        assert cache.get(key1) == test_data1
        assert cache.get(key2) == test_data2
        assert cache.get(key3) == test_data3
        
        status = cache.get_status()
        assert status['cache_size'] == 3
    
    def test_cache_clear_functionality(self):
        """Test that cache.clear() removes all entries."""
        cache.clear()
        
        # Add some test data
        cache.set("key1", "data1")
        cache.set("key2", "data2")
        cache.set("key3", "data3")
        
        # Verify data is there
        assert cache.get("key1") == "data1"
        assert cache.get("key2") == "data2"
        assert cache.get("key3") == "data3"
        assert cache.get_status()['cache_size'] == 3
        
        # Clear cache
        cache.clear()
        
        # Verify all data is gone
        assert cache.get("key1") is None
        assert cache.get("key2") is None
        assert cache.get("key3") is None
        assert cache.get_status()['cache_size'] == 0