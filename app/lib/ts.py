class JobInfo:
    def __init__(self, job, logger):
        """
        Given a teraslice job, this class will inspect the first and last
        operators, which are assumed to be the source and destination nodes of
        the job, and determine the source and destination clusters and their
        types.

        The class has the following public properties:
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
        self.job = job
        self.logger = logger
        self.source_node = None
        self.source_type = None
        self.destination_nodes = []
        self.destination_type = None

        self.process_source_node()
        self.process_destination_node()

    def process_source_node(self):
        op = self.job['operations'][0]

        if op['_op'] == 'kafka_reader':
            # souce_node -> kafka_cluster1:topic1
            self.source_type = 'KAFKA'
            self.source_node = f"{op['connection']}:{op['topic']}"
        else:
            self.logger.warning('MISSING SOURCE')

    def process_destination_node(self):
        op = self.job['operations'][-1]

        if op['_op'] == 'kafka_sender':
            # destination_node -> kafka_cluster1:topic1
            self.destination_nodes.append(f"{op['connection']}:{op['topic']}")
            self.destination_type = 'KAFKA'
        elif op['_op'] == 'elasticsearch_bulk':
            # destination_node -> es_cluster1:index1
            self.destination_nodes.append(f"{op['connection']}:{op['index']}")
            self.destination_type = 'ES'
        elif op['_op'] == 'routed_sender':
            routed_sender_api = None

            # loop over all APIs to find the one used by the routed sender
            for api in self.job['apis']:
                if api['_name'] == op['api_name']:
                    routed_sender_api = api

            if 'index' in routed_sender_api:
                self.destination_type = 'ES'
            elif 'topic' in routed_sender_api:
                self.destination_type = 'KAFKA'

            # suffix is the last part of the destination topic or index
            # prefix is the beginning part of the destination kafka topic or
            # elasticsearch index, it comes from the matching api's index or
            # topic value
            #
            for suffix, connection in op['routing'].items():
                # print(suffix, connection)
                if self.destination_type == 'ES':
                    self.destination_nodes.append(f"{connection}:{api['index']}-{suffix}")
                elif self.destination_type == 'KAFKA':
                    self.destination_nodes.append(f"{connection}:{api['topic']}-{suffix}")
                else:
                    self.logger.warning('UNKNOWN!!!!')
        elif op['_op'] == 'count_by_field':
            # FIXME: I am not sure how to handle these.
            self.logger.debug(f"\t{op}")
        else:
            self.logger.warning('\tMISSING DESTINATION')
            self.logger.warning(f"\t{op}")
