"""
Unit tests for JobInfo class
"""
import pytest
import logging
from unittest.mock import Mock

from app.lib.ts import JobInfo, StorageNode
from tests.fixtures.teraslice_jobs import (
    kafka_reader_to_elasticsearch_job,
    kafka_reader_to_elasticsearch_default_job,
    kafka_reader_to_kafka_sender_job,
    routed_sender_kafka_job,
    routed_sender_elasticsearch_job,
    count_by_field_job,
    unknown_source_job,
    unknown_destination_job,
    empty_operations_job,
    kafka_reader_default_connection_job,
    kafka_sender_default_connection_job,
    all_default_connections_job,
    routed_sender_default_connections_job
)


class TestJobInfoSourceNode:
    """Test JobInfo.process_source_node() method"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.logger = Mock(spec=logging.Logger)
    
    def test_process_source_node_kafka_reader(self):
        """Test source node processing for kafka_reader operation"""
        job_data = kafka_reader_to_elasticsearch_job()
        job_info = JobInfo(job_data, self.logger)
        
        assert job_info.source is not None
        assert job_info.source.id == "kafka_cluster1:input-topic"
        assert job_info.source.connector_type == "KAFKA"
    
    def test_process_source_node_unknown_operation(self):
        """Test source node processing for unknown operation type"""
        job_data = unknown_source_job()
        job_info = JobInfo(job_data, self.logger)
        
        # Should return None for unknown operation
        assert job_info.source is None
        
        # Should log a warning
        self.logger.warning.assert_called_once_with('MISSING SOURCE')
    
    def test_process_source_node_empty_operations(self):
        """Test source node processing when operations list is empty"""
        job_data = empty_operations_job()
        
        # This should raise an IndexError when trying to access operations[0]
        with pytest.raises(IndexError):
            JobInfo(job_data, self.logger)
    
    def test_process_source_node_kafka_reader_default_connection(self):
        """Test source node processing for kafka_reader with default connection"""
        job_data = kafka_reader_default_connection_job()
        job_info = JobInfo(job_data, self.logger)
        
        assert job_info.source is not None
        assert job_info.source.id == "default:input-topic"
        assert job_info.source.connector_type == "KAFKA"


class TestJobInfoDestinationNodes:
    """Test JobInfo.process_destination_nodes() method"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.logger = Mock(spec=logging.Logger)
    
    def test_process_destination_nodes_kafka_sender(self):
        """Test destination node processing for kafka_sender operation"""
        job_data = kafka_reader_to_kafka_sender_job()
        job_info = JobInfo(job_data, self.logger)
        
        assert len(job_info.destinations) == 1
        dest = job_info.destinations[0]
        assert dest.id == "kafka_cluster2:processed-data"
        assert dest.connector_type == "KAFKA"
    
    def test_process_destination_nodes_elasticsearch_bulk(self):
        """Test destination node processing for elasticsearch_bulk operation"""
        job_data = kafka_reader_to_elasticsearch_job()
        job_info = JobInfo(job_data, self.logger)
        
        assert len(job_info.destinations) == 1
        dest = job_info.destinations[0]
        assert dest.id == "es_cluster1:output-index"
        assert dest.connector_type == "ES"
    
    def test_process_destination_nodes_elasticsearch_bulk_default(self):
        """Test destination node processing for elasticsearch_bulk operation"""
        job_data = kafka_reader_to_elasticsearch_default_job()
        job_info = JobInfo(job_data, self.logger)
        
        assert len(job_info.destinations) == 1
        dest = job_info.destinations[0]
        assert dest.id == "default:output-index"
        assert dest.connector_type == "ES"


    def test_process_destination_nodes_routed_sender_kafka(self):
        """Test destination node processing for routed_sender with Kafka destinations"""
        job_data = routed_sender_kafka_job()
        job_info = JobInfo(job_data, self.logger)
        
        assert len(job_info.destinations) == 2
        
        # Check that both destinations are created correctly
        dest_ids = {dest.id for dest in job_info.destinations}
        expected_ids = {
            "kafka_dest1:processed-type-a",
            "kafka_dest2:processed-type-b"
        }
        assert dest_ids == expected_ids
    
    def test_complete_job_processing_all_default_connections(self):
        """Test complete job processing with all default connections"""
        job_data = all_default_connections_job()
        job_info = JobInfo(job_data, self.logger)
        
        # Verify source
        assert job_info.source is not None
        assert job_info.source.id == "default:input-topic"
        assert job_info.source.connector_type == "KAFKA"
        
        # Verify destinations
        assert len(job_info.destinations) == 1
        dest = job_info.destinations[0]
        assert dest.id == "default:output-topic"
        assert dest.connector_type == "KAFKA"
    
    def test_complete_job_processing_kafka_reader_default_connection(self):
        """Test complete job processing with kafka_reader default connection"""
        job_data = kafka_reader_default_connection_job()
        job_info = JobInfo(job_data, self.logger)
        
        # Verify source with default connection
        assert job_info.source is not None
        assert job_info.source.id == "default:input-topic"
        assert job_info.source.connector_type == "KAFKA"
        
        # Verify destination with explicit connection
        assert len(job_info.destinations) == 1
        dest = job_info.destinations[0]
        assert dest.id == "es_cluster1:output-index"
        assert dest.connector_type == "ES"
    
    def test_complete_job_processing_kafka_sender_default_connection(self):
        """Test complete job processing with kafka_sender default connection"""
        job_data = kafka_sender_default_connection_job()
        job_info = JobInfo(job_data, self.logger)
        
        # Verify source with explicit connection
        assert job_info.source is not None
        assert job_info.source.id == "kafka_cluster1:input-topic"
        assert job_info.source.connector_type == "KAFKA"
        
        # Verify destination with default connection
        assert len(job_info.destinations) == 1
        dest = job_info.destinations[0]
        assert dest.id == "default:output-topic"
        assert dest.connector_type == "KAFKA"
        
        # Check that all destinations have correct connector type
        for dest in job_info.destinations:
            assert dest.connector_type == "KAFKA"
    
    def test_process_destination_nodes_routed_sender_elasticsearch(self):
        """Test destination node processing for routed_sender with ES destinations"""
        job_data = routed_sender_elasticsearch_job()
        job_info = JobInfo(job_data, self.logger)
        
        assert len(job_info.destinations) == 2
        
        # Check that both destinations are created correctly
        dest_ids = {dest.id for dest in job_info.destinations}
        expected_ids = {
            "es_logs_cluster:events-logs",
            "es_metrics_cluster:events-metrics"
        }
        assert dest_ids == expected_ids
        
        # Check that all destinations have correct connector type
        for dest in job_info.destinations:
            assert dest.connector_type == "ES"
    
    def test_process_destination_nodes_count_by_field(self):
        """Test destination node processing for count_by_field operation"""
        job_data = count_by_field_job()
        job_info = JobInfo(job_data, self.logger)
        
        # Should return empty list for count_by_field
        assert len(job_info.destinations) == 0
        
        # Should log a debug message
        self.logger.debug.assert_called_once()
    
    def test_process_destination_nodes_unknown_operation(self):
        """Test destination node processing for unknown operation type"""
        job_data = unknown_destination_job()
        job_info = JobInfo(job_data, self.logger)
        
        # Should return empty list for unknown operation
        assert len(job_info.destinations) == 0
        
        # Should log warnings
        assert self.logger.warning.call_count == 2
        warning_calls = [call.args[0] for call in self.logger.warning.call_args_list]
        assert '\tMISSING DESTINATION' in warning_calls
    
    def test_process_destination_nodes_empty_operations(self):
        """Test destination node processing when operations list is empty"""
        job_data = empty_operations_job()
        
        # This should raise an IndexError when trying to access operations[-1]
        with pytest.raises(IndexError):
            JobInfo(job_data, self.logger)
    
    def test_process_destination_nodes_kafka_sender_default_connection(self):
        """Test destination node processing for kafka_sender with default connection"""
        job_data = kafka_sender_default_connection_job()
        job_info = JobInfo(job_data, self.logger)
        
        assert len(job_info.destinations) == 1
        dest = job_info.destinations[0]
        assert dest.id == "default:output-topic"
        assert dest.connector_type == "KAFKA"
    
    def test_process_destination_nodes_routed_sender_default_connections(self):
        """Test destination node processing for routed_sender with default connections"""
        job_data = routed_sender_default_connections_job()
        job_info = JobInfo(job_data, self.logger)
        
        assert len(job_info.destinations) == 2
        
        # Check that both destinations are created correctly
        dest_ids = {dest.id for dest in job_info.destinations}
        expected_ids = {
            "default:processed-type-a",
            "kafka_cluster2:processed-type-b"
        }
        assert dest_ids == expected_ids
        
        # Check that all destinations have correct connector type
        for dest in job_info.destinations:
            assert dest.connector_type == "KAFKA"


class TestJobInfoIntegration:
    """Integration tests for complete JobInfo functionality"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.logger = Mock(spec=logging.Logger)
    
    def test_complete_job_processing_kafka_to_es(self):
        """Test complete job processing from Kafka to Elasticsearch"""
        job_data = kafka_reader_to_elasticsearch_job()
        job_info = JobInfo(job_data, self.logger)
        
        # Verify source
        assert job_info.source is not None
        assert job_info.source.id == "kafka_cluster1:input-topic"
        assert job_info.source.connector_type == "KAFKA"
        
        # Verify destinations
        assert len(job_info.destinations) == 1
        dest = job_info.destinations[0]
        assert dest.id == "es_cluster1:output-index"
        assert dest.connector_type == "ES"
    
    def test_complete_job_processing_kafka_to_kafka(self):
        """Test complete job processing from Kafka to Kafka"""
        job_data = kafka_reader_to_kafka_sender_job()
        job_info = JobInfo(job_data, self.logger)
        
        # Verify source
        assert job_info.source is not None
        assert job_info.source.id == "kafka_cluster1:raw-data"
        assert job_info.source.connector_type == "KAFKA"
        
        # Verify destinations
        assert len(job_info.destinations) == 1
        dest = job_info.destinations[0]
        assert dest.id == "kafka_cluster2:processed-data"
        assert dest.connector_type == "KAFKA"
    
    def test_complete_job_processing_routed_sender(self):
        """Test complete job processing with routed_sender"""
        job_data = routed_sender_kafka_job()
        job_info = JobInfo(job_data, self.logger)
        
        # Verify source
        assert job_info.source is not None
        assert job_info.source.id == "kafka_source:incoming-data"
        assert job_info.source.connector_type == "KAFKA"
        
        # Verify destinations
        assert len(job_info.destinations) == 2
        dest_ids = {dest.id for dest in job_info.destinations}
        expected_ids = {
            "kafka_dest1:processed-type-a",
            "kafka_dest2:processed-type-b"
        }
        assert dest_ids == expected_ids