"""
Mock Teraslice job data fixtures for testing.

These fixtures model the Teraslice v3 job structure where operations that use
an API reference it via `_api_name`, and the API-related fields (topic, index,
connection) live on the API definition. The connection field on an API is
`_connection`. A missing/absent connection implies Teraslice's 'default'
connection.
"""

def kafka_reader_to_elasticsearch_job():
    """Simple kafka_reader -> elasticsearch_bulk job"""
    return {
        "job_id": "kafka-to-es-001",
        "name": "kafka-to-elasticsearch-pipeline",
        "workers": 3,
        "ex": {"_status": "running"},
        "operations": [
            {
                "_op": "kafka_reader",
                "_api_name": "kafka_reader_api"
            },
            {
                "_op": "elasticsearch_bulk",
                "_api_name": "elasticsearch_sender_api"
            }
        ],
        "apis": [
            {
                "_name": "kafka_reader_api",
                "_connection": "kafka_cluster1",
                "topic": "input-topic"
            },
            {
                "_name": "elasticsearch_sender_api",
                "_connection": "es_cluster1",
                "index": "output-index"
            }
        ]
    }

def kafka_reader_to_elasticsearch_default_job():
    """kafka_reader -> elasticsearch_bulk where the ES api has no connection
    (defaults to 'default')"""
    return {
        "job_id": "kafka-to-es-001",
        "name": "kafka-to-elasticsearch-pipeline",
        "workers": 3,
        "ex": {"_status": "running"},
        "operations": [
            {
                "_op": "kafka_reader",
                "_api_name": "kafka_reader_api"
            },
            {
                "_op": "elasticsearch_bulk",
                "_api_name": "elasticsearch_sender_api"
            }
        ],
        "apis": [
            {
                "_name": "kafka_reader_api",
                "_connection": "kafka_cluster1",
                "topic": "input-topic"
            },
            {
                "_name": "elasticsearch_sender_api",
                "index": "output-index"
            }
        ]
    }

def kafka_reader_to_kafka_sender_job():
    """Simple kafka_reader -> kafka_sender job"""
    return {
        "job_id": "kafka-to-kafka-001",
        "name": "kafka-transform-pipeline",
        "workers": 5,
        "ex": {"_status": "running"},
        "operations": [
            {
                "_op": "kafka_reader",
                "_api_name": "kafka_reader_api"
            },
            {
                "_op": "kafka_sender",
                "_api_name": "kafka_sender_api"
            }
        ],
        "apis": [
            {
                "_name": "kafka_reader_api",
                "_connection": "kafka_cluster1",
                "topic": "raw-data"
            },
            {
                "_name": "kafka_sender_api",
                "_connection": "kafka_cluster2",
                "topic": "processed-data"
            }
        ]
    }


def routed_sender_kafka_job():
    """Complex job with routed_sender to multiple Kafka topics"""
    return {
        "job_id": "routed-kafka-001",
        "name": "multi-destination-kafka-pipeline",
        "workers": 10,
        "ex": {"_status": "running"},
        "operations": [
            {
                "_op": "kafka_reader",
                "_api_name": "kafka_reader_api"
            },
            {
                "_op": "routed_sender",
                "_api_name": "kafka_router",
                "routing": {
                    "type-a": "kafka_dest1",
                    "type-b": "kafka_dest2"
                }
            }
        ],
        "apis": [
            {
                "_name": "kafka_reader_api",
                "_connection": "kafka_source",
                "topic": "incoming-data"
            },
            {
                "_name": "kafka_router",
                "topic": "processed"
            }
        ]
    }


def routed_sender_elasticsearch_job():
    """Complex job with routed_sender to multiple ES indices"""
    return {
        "job_id": "routed-es-001",
        "name": "multi-destination-es-pipeline",
        "workers": 8,
        "ex": {"_status": "running"},
        "operations": [
            {
                "_op": "kafka_reader",
                "_api_name": "kafka_reader_api"
            },
            {
                "_op": "routed_sender",
                "_api_name": "es_router",
                "routing": {
                    "logs": "es_logs_cluster",
                    "metrics": "es_metrics_cluster"
                }
            }
        ],
        "apis": [
            {
                "_name": "kafka_reader_api",
                "_connection": "kafka_source",
                "topic": "incoming-events"
            },
            {
                "_name": "es_router",
                "index": "events"
            }
        ]
    }


def count_by_field_job():
    """Job ending with count_by_field operation"""
    return {
        "job_id": "count-job-001",
        "name": "count-aggregation-pipeline",
        "workers": 2,
        "ex": {"_status": "running"},
        "operations": [
            {
                "_op": "kafka_reader",
                "_api_name": "kafka_reader_api"
            },
            {
                "_op": "count_by_field",
                "field": "user_id"
            }
        ],
        "apis": [
            {
                "_name": "kafka_reader_api",
                "_connection": "kafka_cluster1",
                "topic": "events"
            }
        ]
    }


def unknown_source_job():
    """Job with unknown source operation"""
    return {
        "job_id": "unknown-source-001",
        "name": "unknown-source-pipeline",
        "workers": 1,
        "ex": {"_status": "running"},
        "operations": [
            {
                "_op": "file_reader",
                "path": "/data/input.csv"
            },
            {
                "_op": "elasticsearch_bulk",
                "_api_name": "elasticsearch_sender_api"
            }
        ],
        "apis": [
            {
                "_name": "elasticsearch_sender_api",
                "_connection": "es_cluster1",
                "index": "csv-data"
            }
        ]
    }


def unknown_destination_job():
    """Job with unknown destination operation"""
    return {
        "job_id": "unknown-dest-001",
        "name": "unknown-destination-pipeline",
        "workers": 1,
        "ex": {"_status": "running"},
        "operations": [
            {
                "_op": "kafka_reader",
                "_api_name": "kafka_reader_api"
            },
            {
                "_op": "file_writer",
                "path": "/data/output.json"
            }
        ],
        "apis": [
            {
                "_name": "kafka_reader_api",
                "_connection": "kafka_cluster1",
                "topic": "input-data"
            }
        ]
    }


def empty_operations_job():
    """Job with empty operations list"""
    return {
        "job_id": "empty-ops-001",
        "name": "empty-operations-job",
        "workers": 1,
        "ex": {"_status": "stopped"},
        "operations": [],
        "apis": []
    }


def kafka_reader_default_connection_job():
    """kafka_reader with default connection (api omits _connection)"""
    return {
        "job_id": "kafka-reader-default-001",
        "name": "kafka-reader-default-pipeline",
        "workers": 2,
        "ex": {"_status": "running"},
        "operations": [
            {
                "_op": "kafka_reader",
                "_api_name": "kafka_reader_api"
            },
            {
                "_op": "elasticsearch_bulk",
                "_api_name": "elasticsearch_sender_api"
            }
        ],
        "apis": [
            {
                "_name": "kafka_reader_api",
                "topic": "input-topic"
            },
            {
                "_name": "elasticsearch_sender_api",
                "_connection": "es_cluster1",
                "index": "output-index"
            }
        ]
    }


def kafka_sender_default_connection_job():
    """kafka_sender with default connection (api omits _connection)"""
    return {
        "job_id": "kafka-sender-default-001",
        "name": "kafka-sender-default-pipeline",
        "workers": 2,
        "ex": {"_status": "running"},
        "operations": [
            {
                "_op": "kafka_reader",
                "_api_name": "kafka_reader_api"
            },
            {
                "_op": "kafka_sender",
                "_api_name": "kafka_sender_api"
            }
        ],
        "apis": [
            {
                "_name": "kafka_reader_api",
                "_connection": "kafka_cluster1",
                "topic": "input-topic"
            },
            {
                "_name": "kafka_sender_api",
                "topic": "output-topic"
            }
        ]
    }


def all_default_connections_job():
    """Job with all default connections (apis omit _connection)"""
    return {
        "job_id": "all-default-001",
        "name": "all-default-connections-pipeline",
        "workers": 1,
        "ex": {"_status": "running"},
        "operations": [
            {
                "_op": "kafka_reader",
                "_api_name": "kafka_reader_api"
            },
            {
                "_op": "kafka_sender",
                "_api_name": "kafka_sender_api"
            }
        ],
        "apis": [
            {
                "_name": "kafka_reader_api",
                "topic": "input-topic"
            },
            {
                "_name": "kafka_sender_api",
                "topic": "output-topic"
            }
        ]
    }


def routed_sender_default_connections_job():
    """routed_sender with default connections in routing"""
    return {
        "job_id": "routed-default-001",
        "name": "routed-sender-default-pipeline",
        "workers": 3,
        "ex": {"_status": "running"},
        "operations": [
            {
                "_op": "kafka_reader",
                "_api_name": "kafka_reader_api"
            },
            {
                "_op": "routed_sender",
                "_api_name": "kafka_router",
                "routing": {
                    "type-a": "default",
                    "type-b": "kafka_cluster2"
                }
            }
        ],
        "apis": [
            {
                "_name": "kafka_reader_api",
                "topic": "input-data"
            },
            {
                "_name": "kafka_router",
                "topic": "processed"
            }
        ]
    }


def kafka_sender_with_api_name_job():
    """kafka_sender using _api_name to reference topic and connection from the
    apis array"""
    return {
        "job_id": "kafka-sender-api-001",
        "name": "kafka-sender-api-pipeline",
        "workers": 4,
        "ex": {"_status": "running"},
        "operations": [
            {
                "_op": "kafka_reader",
                "_api_name": "kafka_reader_api"
            },
            {
                "_op": "kafka_sender",
                "_api_name": "kafka_sender_api"
            }
        ],
        "apis": [
            {
                "_name": "kafka_reader_api",
                "_connection": "kafka_cluster1",
                "topic": "input-topic"
            },
            {
                "_name": "kafka_sender_api",
                "_connection": "kafka_incoming",
                "topic": "my-topic-json-v1",
                "size": 20000,
                "rdkafka_options": {
                    "message.max.bytes": 31457280
                }
            }
        ]
    }


def kafka_reader_with_api_name_job():
    """kafka_reader using _api_name to reference topic and connection from the
    apis array"""
    return {
        "job_id": "kafka-reader-api-001",
        "name": "kafka-reader-api-pipeline",
        "workers": 3,
        "ex": {"_status": "running"},
        "operations": [
            {
                "_op": "kafka_reader",
                "_api_name": "kafka_reader_api"
            },
            {
                "_op": "elasticsearch_bulk",
                "_api_name": "elasticsearch_sender_api"
            }
        ],
        "apis": [
            {
                "_name": "kafka_reader_api",
                "_connection": "kafka_incoming",
                "topic": "source-topic-json-v1",
                "size": 10000,
                "rdkafka_options": {
                    "fetch.min.bytes": 1024
                }
            },
            {
                "_name": "elasticsearch_sender_api",
                "_connection": "es_cluster1",
                "index": "output-index"
            }
        ]
    }


def op_fields_ignored_when_api_declared_job():
    """v3 behavior: when an op declares _api_name, topic/connection set
    directly on the op are ignored in favor of the api definition."""
    return {
        "job_id": "op-ignored-001",
        "name": "op-fields-ignored-pipeline",
        "workers": 2,
        "ex": {"_status": "running"},
        "operations": [
            {
                "_op": "kafka_reader",
                "_api_name": "kafka_reader_api",
                # these stale op-level fields must be ignored
                "connection": "stale_connection",
                "topic": "stale-topic"
            },
            {
                "_op": "kafka_sender",
                "_api_name": "kafka_sender_api"
            }
        ],
        "apis": [
            {
                "_name": "kafka_reader_api",
                "_connection": "kafka_real",
                "topic": "real-topic"
            },
            {
                "_name": "kafka_sender_api",
                "_connection": "kafka_out",
                "topic": "out-topic"
            }
        ]
    }


def bare_operation_job():
    """An operation without an _api_name still carries its fields directly.
    The processor falls back to reading topic/connection from the op."""
    return {
        "job_id": "bare-op-001",
        "name": "bare-operation-pipeline",
        "workers": 1,
        "ex": {"_status": "running"},
        "operations": [
            {
                "_op": "kafka_reader",
                "connection": "kafka_bare",
                "topic": "bare-topic"
            },
            {
                "_op": "elasticsearch_bulk",
                "index": "bare-index"
            }
        ],
        "apis": []
    }
