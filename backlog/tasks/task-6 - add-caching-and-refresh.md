---
id: task-6
title: add caching and refresh
status: Completed
assignee: []
created_date: '2025-07-16'
completed_date: '2025-07-16'
labels: []
dependencies: []
---

## Description

Implementation Plan for Task 6

Phase 1: Backend Caching Layer

Components to implement:

1. Cache Manager - In-memory cache with TTL (Time To Live)
2. Background Refresh Task - Scheduled job to update cache
3. Cache-aware API endpoints - Serve from cache, fallback to direct fetch

Key features:

- TTL-based cache expiration (configurable, default 30 seconds)
- Background refresh to prevent cache misses
- Graceful degradation if Teraslice server is unavailable

Phase 2: Frontend Auto-refresh

Components to implement:

1. Polling mechanism - Periodically check for updates
2. Change detection - Only update graph when data changes
3. User controls - Enable/disable auto-refresh, adjust intervals

Key features:

- Configurable refresh intervals (default 90 seconds)
- Efficient updates - only re-render when data changes
- Visual indicator of last update time

Phase 3: Advanced Features

These advanced features are out of scope for this task.

1. WebSocket support - Real-time updates when cache changes
2. Redis integration - For production scalability
3. Incremental updates - Only update changed nodes/links

Technical Implementation Details

Backend Changes:

- ✅ Add CacheManager class in app/lib/cache.py
- ✅ Implement BackgroundTasks for cache refresh
- ✅ Modify /api/jobs to use cache-first strategy (CHANGED: cache jobs data instead of processed graph)
- ✅ Update /api/pipeline_graph to process cached jobs data
- ✅ Add cache status endpoint /api/cache/status

Frontend Changes:

- ✅ Add AutoRefresh class in frontend/src/utils/autoRefresh.js
- ✅ Implement change detection in GraphRenderer
- ✅ Add refresh controls to GUI
- ✅ Add connection status indicator

Configuration:

- ✅ Cache TTL: CACHE_TTL environment variable (default: 300 seconds)
- ✅ Refresh interval: REFRESH_INTERVAL environment variable (default: 90 seconds)
- ✅ Auto-refresh enabled: GUI toggle with localStorage persistence

This plan ensures jobs appear/disappear in the graph as they change in the
Teraslice cluster while maintaining good performance through intelligent caching.

## Implementation Results

### Key Architecture Decision: Cache Jobs Data Instead of Processed Graph

**Rationale**: Production Teraslice API calls take 15 seconds. Caching the raw jobs data eliminates user-facing delays while allowing fast graph processing.

**Implementation**

- `/api/jobs` endpoint caches raw jobs data with parameterized keys
- `/api/pipeline_graph` processes cached jobs (fast ~100ms) instead of caching processed graph
- Background refresh handles the 15-second API calls, not user requests

### Files Created/Modified

**Backend**:

- `app/lib/cache.py` - CacheManager class with TTL and background refresh
- `app/main.py` - Refactored to cache jobs data, process cached data for graph
- `tests/unit/test_cache.py` - Cache manager tests
- `tests/unit/test_jobs_caching.py` - Jobs caching behavior tests
- `tests/unit/test_pipeline_graph_processing.py` - Graph processing tests

**Frontend**:

- `frontend/src/utils/autoRefresh.js` - Auto-refresh with change detection
- `frontend/src/graph/GraphRenderer.js` - Added updateData() and change detection
- `frontend/src/controls/GuiControls.js` - Auto-refresh controls and status
- `frontend/src/main.js` - Integrated auto-refresh functionality

### Test Results

- ✅ 46/46 backend tests passing
- ✅ Frontend builds successfully
- ✅ All existing functionality preserved

### Performance Benefits

- ✅ Eliminates 15-second user-facing delays
- ✅ Both `/api/jobs` and `/api/pipeline_graph` benefit from same cache
- ✅ Background refresh prevents cache misses
- ✅ Frontend auto-refresh with intelligent change detection
