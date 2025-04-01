import logging
import os
import json

import httpx

from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request

from pydantic_settings import BaseSettings, SettingsConfigDict


# Get settings from Environment with Pydantic BaseSettings
class Settings(BaseSettings):
    teraslice_url: str = "http://localhost:5678"

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

def process_source_node(op):
    if op['_op'] == 'kafka_reader':
        # souce_node -> kafka_cluster1:topic1
        source_type = 'KAFKA'
        source_node = f"{op['connection']}:{op['topic']}"
    else:
        logger.warning('MISSING SOURCE')

    return source_node, source_type

def process_destination_node(op, job):
    destination_nodes = []
    destination_type = None

    if op['_op'] == 'kafka_sender':
        # destination_node -> kafka_cluster1:topic1
        destination_nodes.append(f"{op['connection']}:{op['topic']}")
        destination_type = 'KAFKA'
    elif op['_op'] == 'elasticsearch_bulk':
        # destination_node -> es_cluster1:index1
        destination_nodes.append(f"{op['connection']}:{op['index']}")
        destination_type = 'ES'
    elif op['_op'] == 'routed_sender':
        routed_sender_api = None

        # loop over all APIs to find the one used by the routed sender
        for api in job['apis']:
            if api['_name'] == op['api_name']:
                routed_sender_api = api

        if 'index' in routed_sender_api:
            destination_type = 'ES'
        elif 'topic' in routed_sender_api:
            destination_type = 'KAFKA'

        # suffix is the last part of the destination topic or index
        # prefix is the beginning part of the destination kafka topic or
        # elasticsearch index, it comes from the matching api's index or
        # topic value
        #
        for suffix, connection in op['routing'].items():
            # print(suffix, connection)
            if destination_type == 'ES':
                destination_nodes.append(f"{connection}:{api['index']}-{suffix}")
            elif destination_type == 'KAFKA':
                destination_nodes.append(f"{connection}:{api['topic']}-{suffix}")
            else:
                logger.warning('UNKNOWN!!!!')
    elif op['_op'] == 'count_by_field':
        # FIXME: I am not sure how to handle these.
        logger.debug(f"\t{op}")
    else:
        logger.warning('\tMISSING DESTINATION')
        logger.warning(f"\t{op}")
    return destination_nodes, destination_type

def process_job(job):
    """
    Given a teraslice job, this function will inspect the first and last
    operators, which are assumed to be the input and outputs of the job
    and return the following in a tuple
    * source_node
      * `<CONNECTOR>:<TOPIC|INDEX>`, e.g. `kafka_cluster1:topic1`
      * TODO: Kafka only at the moment
    * source_type
      * `KAFKA` or `ES`
    * destination_nodes - an array of one or more `destination_node` strings
      * [`kafka_cluster1:topic-a-1`, `kafka_cluster1:topic-a-2`]
    * destination_type
      * `KAFKA` or `ES`
    """
    first_op = job['operations'][0]
    last_op = job['operations'][-1]

    source_node = None
    source_type = None
    destination_nodes = []
    destination_type = None

    source_node, source_type = process_source_node(first_op)
    destination_nodes, destination_type = process_destination_node(last_op, job)

    return (source_node, source_type, destination_nodes, destination_type)

@app.get("/jobs", response_class=JSONResponse)
async def get_jobs(size: None | int = 500, active: None | str = 'true', ex: None | str = '_status'):
    url = settings.teraslice_url

    params = {'size': size, 'active': active, 'ex': ex}
    # FIXME: figure out how to handle custom CA cert
    r = httpx.get(f'{url}/jobs', params=params, verify=False)

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

        source_node, source_type, destination_nodes, destination_type = process_job(job)

        nodes.append(
            {
                'id': source_node,
                'connector_type': source_type
            }
        )

        # print(f"\t{source_type} SOURCE: \t{source_node}")
        for destination_node in destination_nodes:
            nodes.append(
                {
                    'id': destination_node,
                    'connector_type': destination_type
                }
            )
            # print(f"\t{destination_type} DESTINATION: {destination_node}")
            links.append(
                {
                    'source': source_node,
                    'target': destination_node,
                    'job_id': job['job_id'],
                    'name': job['name'],
                    'url': f"{settings.teraslice_url}/jobs/{job['job_id']}",
                }
            )
        # print()

    # remove duplicates from nodes
    unique_nodes = [dict(t) for t in {tuple(sorted(d.items())) for d in nodes}]


    return {
        'nodes': unique_nodes,
        'links': links
    }
