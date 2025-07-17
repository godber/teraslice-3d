import logging
import os
import pprint
import ssl

import httpx

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

from .lib.ts import JobInfo
from .lib.cache import CacheManager

# Get settings from Environment with Pydantic BaseSettings
class Settings(BaseSettings):
    teraslice_url: str = "http://localhost:5678"
    cacert_file: Path | None = None
    cache_ttl: int = 300    # Default TTL for cache entries in seconds
    refresh_interval: int = 90  # Default interval for refreshing cache entriesin seconds

settings = Settings()

# Setup logging
log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=log_level)
logger = logging.getLogger(__name__)

app = FastAPI()

# Initialize cache manager
cache = CacheManager(default_ttl=settings.cache_ttl)


async def _fetch_jobs_from_api(size: None | int = 500, active: None | str = 'true', ex: None | str = '_status'):
    """Fetch jobs from Teraslice API (internal function).

    Args:
        size (int): Number of jobs to fetch. Defaults to 500.
        active (str): Filter for active jobs. Defaults to 'true'.
        ex (str): Field to request from corresponding Execution. Defaults to '_status'.

    Returns:
        dict: The response from the Teraslice API.
    """
    url = settings.teraslice_url

    params = {'size': size, 'active': active, 'ex': ex}

    # Configure SSL verification - use custom CA cert if provided
    if settings.cacert_file:
        ssl_context = ssl.create_default_context(cafile=str(settings.cacert_file))
        verify_ssl = ssl_context
        logger.info(f"Using custom CA certificate: {settings.cacert_file}")
    else:
        verify_ssl = True

    try:
        r = httpx.get(f'{url}/jobs', params=params, verify=verify_ssl)
        r.raise_for_status()  # Raise exception for HTTP errors
    except httpx.HTTPError as e:
        logger.error(f"HTTP error occurred when connecting to {url}: {e}")
        raise

    return r.json()

@app.get("/api/jobs", response_class=JSONResponse)
async def get_jobs(size: None | int = 500, active: None | str = 'true', ex: None | str = '_status'):
    """Fetch jobs from Teraslice API, using cache when possible.

    Args:
        size (int): Number of jobs to fetch. Defaults to 500.
        active (str): Filter for active jobs. Defaults to 'true'.
        ex (str): Field to request from corresponding Execution. Defaults to '_status'.

    Returns:
        JSONResponse: The response from the Teraslice API.
    """
    # Create cache key based on parameters
    cache_key = f"jobs_{size}_{active}_{ex}"
    
    # Try to get from cache first
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        logger.debug(f"Serving jobs from cache for key: {cache_key}")
        return cached_data
    
    # If not in cache, fetch fresh data
    logger.debug(f"Fetching fresh jobs data for key: {cache_key}")
    try:
        data = await _fetch_jobs_from_api(size, active, ex)
        cache.set(cache_key, data)
        
        # Schedule background refresh
        cache.schedule_refresh(
            cache_key, 
            lambda: _fetch_jobs_from_api(size, active, ex), 
            settings.refresh_interval
        )
        
        logger.debug(f"Jobs data fetched and cached for key: {cache_key}")
        return data
    except Exception as e:
        logger.error(f"Failed to fetch jobs data: {e}")
        raise e

def _process_jobs_to_graph(jobs_data):
    """Process jobs data into graph format (nodes and links).
    
    Args:
        jobs_data: Raw jobs data from Teraslice API
        
    Returns:
        dict: Graph data with nodes and links
    """
    nodes = []
    links = []    # {'source': '', 'target': ''}
    
    for job in jobs_data:
        try:
            logger.debug(f"{job['name']} - {job['ex']['_status']} - {settings.teraslice_url}/jobs/{job['job_id']}",)

            job_info = JobInfo(job, logger)

            nodes.append(job_info.source)

            for destination in job_info.destinations:
                nodes.append(destination)
                links.append(
                    {
                        'source': job_info.source.id,
                        'target': destination.id,
                        'job_id': job['job_id'],
                        'name': job['name'],
                        'url': f"{settings.teraslice_url}/jobs/{job['job_id']}",
                        'workers': job['workers'],
                        'status': job['ex']['_status']
                    }
                )
        except Exception as e:
            logger.error(f"Error processing job: {e}\nJob: {pprint.pformat(job)}")
            raise e

    return {
        'nodes': list(set(nodes)),
        'links': links
    }

@app.get("/api/pipeline_graph", response_class=JSONResponse)
async def get_pipeline_graph():
    """Fetch the pipeline graph data by processing cached jobs data.
    Returns:
        JSONResponse: The pipeline graph data.
    """
    # TODO: The size here is hard coded to an arbitrarily large number to try
    # and get all of the jobs, this is dumb but the Teraslice API doesn't tell
    # us how far to page.
    try:
        # Get jobs data (from cache or fresh fetch)
        jobs_data = await get_jobs(size=500)
        
        # Process jobs into graph format (this is fast)
        graph_data = _process_jobs_to_graph(jobs_data)
        
        logger.debug("Pipeline graph data processed from cached jobs")
        return graph_data
    except Exception as e:
        logger.error(f"Failed to generate pipeline graph data: {e}")
        raise e

@app.get("/api/cache/status", response_class=JSONResponse)
async def get_cache_status():
    return cache.get_status()

@app.post("/api/cache/clear", response_class=JSONResponse)
async def clear_cache():
    """Clear all cached data and return status."""
    cache.clear()
    return {"message": "Cache cleared successfully", "status": cache.get_status()}

app.mount("/", StaticFiles(directory="../frontend/dist", html=True), name="frontend")
