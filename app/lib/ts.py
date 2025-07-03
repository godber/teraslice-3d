from pydantic import BaseModel
from typing import Literal

class StorageNode(BaseModel):
    id: str
    connector_type: Literal['KAFKA', 'ES']

    # we make this object hashable so that we can deduplicate a list of them later
    def __hash__(self):
        return hash(self.id)


class JobInfo:
    """ Given a Teraslice job, this class will inspect the first and last
    operators, which are assumed to be the source and destination nodes
    of the job, and determine the source and destination clusters and
    their types.

    Args:
        job (dictionary): Python dictionary of Teraslice Job
        logger (Logging): Logger to be used

    Properties:
    * `source_node` - `<CONNECTOR>:<TOPIC|INDEX>`
       * e.g. `kafka_cluster1:topic1`
       * TODO: Kafka only at the moment
    * `source_type` -  `KAFKA|ES`
    * `destination_nodes` - an array of one or more `destination_node` strings
        * [`kafka_cluster1:topic-a-1`, `kafka_cluster1:topic-a-2`]
    * `destination_type` - `KAFKA|ES`
    """
    def __init__(self, job, logger):
        self.job = job
        self.logger = logger
        self.source = self.process_source_node()
        self.destinations = self.process_destination_nodes()

    def process_source_node(self):
        source = None
        op = self.job['operations'][0]

        if op['_op'] == 'kafka_reader':
            # souce_node -> kafka_cluster1:topic1
            source = StorageNode(
                # if connection is not specified, Teraslice assumes 'default'
                id=f"{op.get('connection', 'default')}:{op['topic']}",
                connector_type='KAFKA'
            )
        else:
            self.logger.warning('MISSING SOURCE')

        return source

    def process_destination_nodes(self):
        destinations = []
        op = self.job['operations'][-1]

        if op['_op'] == 'kafka_sender':
            destinations.append(
                StorageNode(
                    # kafka_cluster1:topic1
                    id=f"{op.get('connection', 'default')}:{op['topic']}",
                    connector_type='KAFKA'
                )
            )
        elif op['_op'] == 'elasticsearch_bulk':
            destinations.append(
                StorageNode(
                    # es_cluster1:index1
                    id = f"{op.get('connection', 'default')}:{op['index']}",
                    connector_type = 'ES'
                )
            )
        elif op['_op'] == 'routed_sender':
            routed_sender_api = None
            destination_type = None

            # loop over all APIs to find the one used by the routed sender
            for api in self.job['apis']:
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
            for suffix, connection in op['routing'].items():
                if destination_type == 'ES':
                    destinations.append(
                        StorageNode(
                            # es_cluster1:index1-**
                            id = f"{connection}:{api['index']}-{suffix}",
                            connector_type=destination_type
                        )
                    )
                elif destination_type == 'KAFKA':
                    destinations.append(
                        StorageNode(
                            # kafka_cluster1:topic1-**
                            id=f"{connection}:{api['topic']}-{suffix}",
                            connector_type=destination_type
                        )
                    )
                else:
                    self.logger.warning('UNKNOWN!!!!')
        elif op['_op'] == 'count_by_field':
            # FIXME: I am not sure how to handle these.
            self.logger.debug(f"\t{op}")
        else:
            self.logger.warning('\tMISSING DESTINATION')
            self.logger.warning(f"\t{op}")

        return destinations
