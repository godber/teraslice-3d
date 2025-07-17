import asyncio
import time
from typing import Dict, Any, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    data: Any
    timestamp: float
    ttl: int
    
    def is_expired(self) -> bool:
        return time.time() - self.timestamp > self.ttl


class CacheManager:
    def __init__(self, default_ttl: int = 30):
        self.cache: Dict[str, CacheEntry] = {}
        self.default_ttl = default_ttl
        self._refresh_tasks: Dict[str, asyncio.Task] = {}
        
    def get(self, key: str) -> Optional[Any]:
        entry = self.cache.get(key)
        if entry is None:
            return None
        
        if entry.is_expired():
            self._remove_entry(key)
            return None
        
        return entry.data
    
    def set(self, key: str, data: Any, ttl: Optional[int] = None) -> None:
        if ttl is None:
            ttl = self.default_ttl
        
        entry = CacheEntry(data=data, timestamp=time.time(), ttl=ttl)
        self.cache[key] = entry
        logger.debug(f"Cache set for key '{key}' with TTL {ttl}s")
    
    def has(self, key: str) -> bool:
        return self.get(key) is not None
    
    def invalidate(self, key: str) -> None:
        self._remove_entry(key)
        logger.debug(f"Cache invalidated for key '{key}'")
    
    def clear(self) -> None:
        for key in list(self._refresh_tasks.keys()):
            self._cancel_refresh_task(key)
        self.cache.clear()
        logger.debug("Cache cleared")
    
    def _remove_entry(self, key: str) -> None:
        if key in self.cache:
            del self.cache[key]
        self._cancel_refresh_task(key)
    
    def _cancel_refresh_task(self, key: str) -> None:
        if key in self._refresh_tasks:
            task = self._refresh_tasks[key]
            if not task.done():
                task.cancel()
            del self._refresh_tasks[key]
    
    def get_status(self) -> Dict[str, Any]:
        now = time.time()
        status = {
            'cache_size': len(self.cache),
            'active_refresh_tasks': len(self._refresh_tasks),
            'entries': []
        }
        
        for key, entry in self.cache.items():
            age = now - entry.timestamp
            time_left = entry.ttl - age
            
            status['entries'].append({
                'key': key,
                'age_seconds': round(age, 2),
                'ttl_seconds': entry.ttl,
                'time_left_seconds': round(time_left, 2),
                'is_expired': entry.is_expired()
            })
        
        return status
    
    def schedule_refresh(self, key: str, refresh_func, refresh_interval: int) -> None:
        self._cancel_refresh_task(key)
        
        async def refresh_task():
            try:
                while True:
                    await asyncio.sleep(refresh_interval)
                    try:
                        data = await refresh_func()
                        self.set(key, data)
                        logger.debug(f"Background refresh completed for key '{key}'")
                    except Exception as e:
                        logger.error(f"Background refresh failed for key '{key}': {e}")
            except asyncio.CancelledError:
                logger.debug(f"Background refresh task cancelled for key '{key}'")
                raise
        
        task = asyncio.create_task(refresh_task())
        self._refresh_tasks[key] = task
        logger.debug(f"Background refresh scheduled for key '{key}' with interval {refresh_interval}s")