import logging
import os
import ssl

import httpx

from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

from .lib.ts import JobInfo

# Get settings from Environment with Pydantic BaseSettings
class Settings(BaseSettings):
    teraslice_url: str = "http://localhost:5678"
    cacert_file: Path | None = None

settings = Settings()

# Setup logging
log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=log_level)
logger = logging.getLogger(__name__)

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def get_graph_page(request: Request):
    return templates.TemplateResponse("graph.html", {"request": request})

@app.get("/jobs", response_class=JSONResponse)
async def get_jobs(size: None | int = 500, active: None | str = 'true', ex: None | str = '_status'):
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
    except httpx.SSLError as e:
        logger.error(f"SSL certificate verification failed: {e}")
        raise
    except httpx.HTTPError as e:
        logger.error(f"HTTP error occurred: {e}")
        raise

    return r.json()

@app.get("/pipeline_graph", response_class=JSONResponse)
async def get_pipeline_graph():
    # TODO: The size here is hard coded to an arbitrarily large number to try
    # and get all of the jobs, this is dumb but the Teraslice API doesn't tell
    # us how far to page.
    r = await get_jobs(size=500)

    nodes = []
    links = []    # {'source': '', 'target': ''}
    for job in r:
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

    return {
        'nodes': list(set(nodes)),
        'links': links
    }
