class JobInfo:
    def __init__(self, job, logger):
        self.job = job
        self.logger = logger

    def process_source_node(self):
        op = self.job['operations'][0]

        if op['_op'] == 'kafka_reader':
            # souce_node -> kafka_cluster1:topic1
            source_type = 'KAFKA'
            source_node = f"{op['connection']}:{op['topic']}"
        else:
            self.logger.warning('MISSING SOURCE')

        return source_node, source_type

    def process_destination_node(self):
        op = self.job['operations'][-1]

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
            #
            for suffix, connection in op['routing'].items():
                # print(suffix, connection)
                if destination_type == 'ES':
                    destination_nodes.append(f"{connection}:{api['index']}-{suffix}")
                elif destination_type == 'KAFKA':
                    destination_nodes.append(f"{connection}:{api['topic']}-{suffix}")
                else:
                    self.logger.warning('UNKNOWN!!!!')
        elif op['_op'] == 'count_by_field':
            # FIXME: I am not sure how to handle these.
            self.logger.debug(f"\t{op}")
        else:
            self.logger.warning('\tMISSING DESTINATION')
            self.logger.warning(f"\t{op}")
        return destination_nodes, destination_type

    def process_job(self):
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
        source_node, source_type = self.process_source_node()
        destination_nodes, destination_type = self.process_destination_node()

        return (source_node, source_type, destination_nodes, destination_type)
