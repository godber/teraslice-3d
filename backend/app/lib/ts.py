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

    def _get_api_for_operation(self, op):
        """
        Find the API definition referenced by an operation.

        In Teraslice v3, an operation that uses an API references it via the
        `_api_name` field (renamed from `api_name` in v2).

        Args:
            op: The operation dictionary

        Returns:
            The matching API dictionary if found, None otherwise
        """
        api_name = op.get('_api_name')
        if api_name is None:
            return None

        for api in self.job.get('apis', []):
            if api.get('_name') == api_name:
                return api

        return None

    def _get_field_from_operation_or_api(self, op, op_field, api_field=None):
        """
        Get a field value from an operation's API definition or the operation.

        In Teraslice v3, operations that use an API must declare it via
        `_api_name`, and the API-related fields (e.g. topic, index, connection)
        live on the API definition. Fields set directly on the operation are
        ignored when an API is declared. Operations without an API still carry
        these fields directly.

        Note that some fields are named differently on the API vs the
        operation (e.g. the connection is `_connection` on an API but
        `connection` on a bare operation), so `api_field` can be supplied
        separately from `op_field`.

        Args:
            op: The operation dictionary
            op_field: The field name to read from the operation directly
            api_field: The field name to read from the API definition
                (defaults to op_field when not supplied)

        Returns:
            The field value if found, None otherwise
        """
        if api_field is None:
            api_field = op_field

        api = self._get_api_for_operation(op)
        if api is not None:
            return api.get(api_field)

        # No API declared - read directly from the operation (v3 still allows
        # bare operations, and this keeps default-connection handling working).
        if '_api_name' in op:
            # An API was referenced but not found; do not fall back to the op.
            return None

        return op.get(op_field)

    def _get_connection(self, op):
        """Resolve the connection name for an operation, defaulting to
        'default' when unspecified (Teraslice's implicit connection name)."""
        connection = self._get_field_from_operation_or_api(
            op, 'connection', '_connection'
        )
        return connection if connection else 'default'

    def process_source_node(self):
        source = None
        op = self.job['operations'][0]

        if op['_op'] == 'kafka_reader':
            topic = self._get_field_from_operation_or_api(op, 'topic')

            if topic:
                source = StorageNode(
                    # if connection is not specified, Teraslice assumes 'default'
                    id=f"{self._get_connection(op)}:{topic}",
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
                        id=f"{self._get_connection(op)}:{topic}",
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
                        id=f"{self._get_connection(op)}:{index}",
                        connector_type='ES'
                    )
                )
            else:
                self.logger.warning(f"elasticsearch_bulk missing index: {op}")
        elif op['_op'] == 'routed_sender':
            destination_type = None

            # find the API used by the routed sender (referenced via _api_name
            # in Teraslice v3)
            routed_sender_api = self._get_api_for_operation(op)

            if routed_sender_api is None:
                self.logger.warning(f"routed_sender missing api: {op}")
                return destinations

            if 'index' in routed_sender_api:
                destination_type = 'ES'
            elif 'topic' in routed_sender_api:
                destination_type = 'KAFKA'

            # suffix is the last part of the destination topic or index
            # prefix is the beginning part of the destination kafka topic or
            # elasticsearch index, it comes from the matching api's index or
            # topic value. For routed_sender the connection is supplied by the
            # routing map values rather than the api's _connection.
            for suffix, connection in op['routing'].items():
                if destination_type == 'ES':
                    destinations.append(
                        StorageNode(
                            # es_cluster1:index1-**
                            id=f"{connection}:{routed_sender_api['index']}-{suffix}",
                            connector_type=destination_type
                        )
                    )
                elif destination_type == 'KAFKA':
                    destinations.append(
                        StorageNode(
                            # kafka_cluster1:topic1-**
                            id=f"{connection}:{routed_sender_api['topic']}-{suffix}",
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
