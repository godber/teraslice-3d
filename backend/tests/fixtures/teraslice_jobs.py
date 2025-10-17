"""
Mock Teraslice job data fixtures for testing
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
                "connection": "kafka_cluster1",
                "topic": "input-topic"
            },
            {
                "_op": "elasticsearch_bulk",
                "connection": "es_cluster1",
                "index": "output-index"
            }
        ],
        "apis": []
    }

def kafka_reader_to_elasticsearch_default_job():
    """Simple kafka_reader -> elasticsearch_bulk job"""
    return {
        "job_id": "kafka-to-es-001",
        "name": "kafka-to-elasticsearch-pipeline",
        "workers": 3,
        "ex": {"_status": "running"},
        "operations": [
            {
                "_op": "kafka_reader",
                "connection": "kafka_cluster1",
                "topic": "input-topic"
            },
            {
                "_op": "elasticsearch_bulk",
                "index": "output-index"
            }
        ],
        "apis": []
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
                "connection": "kafka_cluster1",
                "topic": "raw-data"
            },
            {
                "_op": "kafka_sender",
                "connection": "kafka_cluster2",
                "topic": "processed-data"
            }
        ],
        "apis": []
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
                "connection": "kafka_source",
                "topic": "incoming-data"
            },
            {
                "_op": "routed_sender",
                "api_name": "kafka_router",
                "routing": {
                    "type-a": "kafka_dest1",
                    "type-b": "kafka_dest2"
                }
            }
        ],
        "apis": [
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
                "connection": "kafka_source",
                "topic": "incoming-events"
            },
            {
                "_op": "routed_sender",
                "api_name": "es_router",
                "routing": {
                    "logs": "es_logs_cluster",
                    "metrics": "es_metrics_cluster"
                }
            }
        ],
        "apis": [
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
                "connection": "kafka_cluster1",
                "topic": "events"
            },
            {
                "_op": "count_by_field",
                "field": "user_id"
            }
        ],
        "apis": []
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
                "connection": "es_cluster1",
                "index": "csv-data"
            }
        ],
        "apis": []
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
                "connection": "kafka_cluster1",
                "topic": "input-data"
            },
            {
                "_op": "file_writer",
                "path": "/data/output.json"
            }
        ],
        "apis": []
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
    """kafka_reader with default connection"""
    return {
        "job_id": "kafka-reader-default-001",
        "name": "kafka-reader-default-pipeline",
        "workers": 2,
        "ex": {"_status": "running"},
        "operations": [
            {
                "_op": "kafka_reader",
                "topic": "input-topic"
            },
            {
                "_op": "elasticsearch_bulk",
                "connection": "es_cluster1",
                "index": "output-index"
            }
        ],
        "apis": []
    }


def kafka_sender_default_connection_job():
    """kafka_sender with default connection"""
    return {
        "job_id": "kafka-sender-default-001",
        "name": "kafka-sender-default-pipeline",
        "workers": 2,
        "ex": {"_status": "running"},
        "operations": [
            {
                "_op": "kafka_reader",
                "connection": "kafka_cluster1",
                "topic": "input-topic"
            },
            {
                "_op": "kafka_sender",
                "topic": "output-topic"
            }
        ],
        "apis": []
    }


def all_default_connections_job():
    """Job with all default connections"""
    return {
        "job_id": "all-default-001",
        "name": "all-default-connections-pipeline",
        "workers": 1,
        "ex": {"_status": "running"},
        "operations": [
            {
                "_op": "kafka_reader",
                "topic": "input-topic"
            },
            {
                "_op": "kafka_sender",
                "topic": "output-topic"
            }
        ],
        "apis": []
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
                "topic": "input-data"
            },
            {
                "_op": "routed_sender",
                "api_name": "kafka_router",
                "routing": {
                    "type-a": "default",
                    "type-b": "kafka_cluster2"
                }
            }
        ],
        "apis": [
            {
                "_name": "kafka_router",
                "topic": "processed"
            }
        ]
    }


def kafka_sender_with_api_name_job():
    """kafka_sender using api_name to reference topic from apis array"""
    return {
        "job_id": "kafka-sender-api-001",
        "name": "kafka-sender-api-pipeline",
        "workers": 4,
        "ex": {"_status": "running"},
        "operations": [
            {
                "_op": "kafka_reader",
                "connection": "kafka_cluster1",
                "topic": "input-topic"
            },
            {
                "_op": "kafka_sender",
                "connection": "kafka_incoming",
                "api_name": "kafka_sender_api",
                "size": 20000
            }
        ],
        "apis": [
            {
                "_name": "kafka_sender_api",
                "topic": "my-topic-json-v1",
                "rdkafka_options": {
                    "message.max.bytes": 31457280
                }
            }
        ]
    }


def kafka_reader_with_api_name_job():
    """kafka_reader using api_name to reference topic from apis array"""
    return {
        "job_id": "kafka-reader-api-001",
        "name": "kafka-reader-api-pipeline",
        "workers": 3,
        "ex": {"_status": "running"},
        "operations": [
            {
                "_op": "kafka_reader",
                "connection": "kafka_incoming",
                "api_name": "kafka_reader_api",
                "size": 10000
            },
            {
                "_op": "elasticsearch_bulk",
                "connection": "es_cluster1",
                "index": "output-index"
            }
        ],
        "apis": [
            {
                "_name": "kafka_reader_api",
                "topic": "source-topic-json-v1",
                "rdkafka_options": {
                    "fetch.min.bytes": 1024
                }
            }
        ]
    }
