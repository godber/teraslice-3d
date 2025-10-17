from pydantic import BaseModel
from typing import Literal

class StorageNode(BaseModel):
    id: str
    connector_type: Literal['KAFKA', 'ES', 'DATA_GENERATOR']

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

    def _get_field_from_operation_or_api(self, op, field_name):
        """
        Get a field value from operation or API definition.

        Args:
            op: The operation dictionary
            field_name: The field to look up (e.g., 'topic', 'index')

        Returns:
            The field value if found, None otherwise
        """
        value = None
        if 'api_name' in op:
            # Look up from APIs array
            for api in self.job['apis']:
                if api['_name'] == op['api_name']:
                    value = api.get(field_name)
                    break
        else:
            # Get directly from operation
            value = op.get(field_name)

        return value

    def process_source_node(self):
        source = None
        op = self.job['operations'][0]

        if op['_op'] == 'kafka_reader':
            topic = self._get_field_from_operation_or_api(op, 'topic')

            if topic:
                source = StorageNode(
                    # if connection is not specified, Teraslice assumes 'default'
                    id=f"{op.get('connection', 'default')}:{topic}",
                    connector_type='KAFKA'
                )
            else:
                self.logger.warning(f"kafka_reader missing topic: {op}")
        elif op['_op'] == 'data_generator':
            # source_node -> data_generator
            source = StorageNode(
                id=f"data_generator",
                connector_type='DATA_GENERATOR'
            )
        else:
            self.logger.warning('MISSING SOURCE')

        return source

    def process_destination_nodes(self):
        destinations = []
        op = self.job['operations'][-1]

        if op['_op'] == 'kafka_sender':
            topic = self._get_field_from_operation_or_api(op, 'topic')

            if topic:
                destinations.append(
                    StorageNode(
                        # kafka_cluster1:topic1
                        id=f"{op.get('connection', 'default')}:{topic}",
                        connector_type='KAFKA'
                    )
                )
            else:
                self.logger.warning(f"kafka_sender missing topic: {op}")
        elif op['_op'] == 'elasticsearch_bulk':
            index = self._get_field_from_operation_or_api(op, 'index')

            if index:
                destinations.append(
                    StorageNode(
                        # es_cluster1:index1
                        id=f"{op.get('connection', 'default')}:{index}",
                        connector_type='ES'
                    )
                )
            else:
                self.logger.warning(f"elasticsearch_bulk missing index: {op}")
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
