"""
Unit tests for StorageNode class
"""
import pytest
from app.lib.ts import StorageNode


class TestStorageNode:
    """Test StorageNode class functionality"""
    
    def test_storage_node_creation_kafka(self):
        """Test creating a Kafka StorageNode"""
        node = StorageNode(id="kafka_cluster1:topic1", connector_type="KAFKA")
        assert node.id == "kafka_cluster1:topic1"
        assert node.connector_type == "KAFKA"
    
    def test_storage_node_creation_elasticsearch(self):
        """Test creating an Elasticsearch StorageNode"""
        node = StorageNode(id="es_cluster1:index1", connector_type="ES")
        assert node.id == "es_cluster1:index1"
        assert node.connector_type == "ES"
    
    def test_storage_node_hash_equality(self):
        """Test that StorageNodes with same id are hashable and equal"""
        node1 = StorageNode(id="kafka_cluster1:topic1", connector_type="KAFKA")
        node2 = StorageNode(id="kafka_cluster1:topic1", connector_type="KAFKA")
        
        # Same ID should have same hash
        assert hash(node1) == hash(node2)
        
        # Should be able to put in set and deduplicate
        node_set = {node1, node2}
        assert len(node_set) == 1
    
    def test_storage_node_hash_different(self):
        """Test that StorageNodes with different ids have different hashes"""
        node1 = StorageNode(id="kafka_cluster1:topic1", connector_type="KAFKA")
        node2 = StorageNode(id="kafka_cluster1:topic2", connector_type="KAFKA")
        
        # Different IDs should have different hashes (usually)
        assert hash(node1) != hash(node2)
        
        # Should create separate entries in set
        node_set = {node1, node2}
        assert len(node_set) == 2
    
    def test_storage_node_deduplication(self):
        """Test deduplication of StorageNode list using set()"""
        nodes = [
            StorageNode(id="kafka_cluster1:topic1", connector_type="KAFKA"),
            StorageNode(id="kafka_cluster1:topic1", connector_type="KAFKA"),  # duplicate
            StorageNode(id="es_cluster1:index1", connector_type="ES"),
            StorageNode(id="kafka_cluster1:topic1", connector_type="KAFKA"),  # duplicate
            StorageNode(id="es_cluster1:index2", connector_type="ES"),
        ]
        
        # Convert to set to deduplicate, then back to list
        unique_nodes = list(set(nodes))
        
        # Should have 3 unique nodes
        assert len(unique_nodes) == 3
        
        # Check that we have the expected unique IDs
        unique_ids = {node.id for node in unique_nodes}
        expected_ids = {
            "kafka_cluster1:topic1",
            "es_cluster1:index1", 
            "es_cluster1:index2"
        }
        assert unique_ids == expected_ids
    
    def test_storage_node_different_connector_types_same_id(self):
        """Test that nodes with same ID but different connector types are NOT treated as equal"""
        # This tests the actual implementation where ID is used for hashing but equality checks all fields
        node1 = StorageNode(id="cluster1:resource1", connector_type="KAFKA")
        node2 = StorageNode(id="cluster1:resource1", connector_type="ES")
        
        # Same ID means same hash (current implementation)
        assert hash(node1) == hash(node2)
        
        # But they are NOT equal due to different connector_type (Pydantic equality)
        assert node1 != node2
        
        # So they will create separate entries in a set despite same hash
        node_set = {node1, node2}
        assert len(node_set) == 2