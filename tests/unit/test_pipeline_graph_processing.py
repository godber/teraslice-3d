import pytest
from app.main import _process_jobs_to_graph
from app.lib.ts import JobInfo


class TestPipelineGraphProcessing:
    def test_process_empty_jobs_list(self):
        """Test processing an empty jobs list."""
        result = _process_jobs_to_graph([])
        
        assert result == {'nodes': [], 'links': []}
    
    def test_process_single_job(self):
        """Test processing a single job into graph format."""
        test_job = {
            'job_id': 'test_job_1',
            'name': 'test_pipeline',
            'workers': 5,
            'ex': {'_status': 'running'},
            'operations': [
                {'_op': 'kafka_reader', 'topic': 'input_topic'},
                {'_op': 'elasticsearch_bulk', 'index': 'output_index'}
            ]
        }
        
        result = _process_jobs_to_graph([test_job])
        
        # Should have nodes and links
        assert 'nodes' in result
        assert 'links' in result
        assert len(result['nodes']) >= 1
        assert len(result['links']) >= 1
        
        # Links should have required fields
        link = result['links'][0]
        assert 'source' in link
        assert 'target' in link
        assert 'job_id' in link
        assert 'name' in link
        assert 'workers' in link
        assert 'status' in link
        assert link['job_id'] == 'test_job_1'
        assert link['name'] == 'test_pipeline'
        assert link['workers'] == 5
        assert link['status'] == 'running'
    
    def test_process_multiple_jobs(self):
        """Test processing multiple jobs into graph format."""
        test_jobs = [
            {
                'job_id': 'job_1',
                'name': 'pipeline_1',
                'workers': 3,
                'ex': {'_status': 'running'},
                'operations': [
                    {'_op': 'kafka_reader', 'topic': 'topic_1'},
                    {'_op': 'elasticsearch_bulk', 'index': 'index_1'}
                ]
            },
            {
                'job_id': 'job_2',
                'name': 'pipeline_2',
                'workers': 2,
                'ex': {'_status': 'stopped'},
                'operations': [
                    {'_op': 'kafka_reader', 'topic': 'topic_2'},
                    {'_op': 'elasticsearch_bulk', 'index': 'index_2'}
                ]
            }
        ]
        
        result = _process_jobs_to_graph(test_jobs)
        
        # Should have nodes and links from both jobs
        assert len(result['links']) >= 2
        
        # Verify both jobs are represented
        job_ids = [link['job_id'] for link in result['links']]
        assert 'job_1' in job_ids
        assert 'job_2' in job_ids
        
        # Verify job details
        job_1_link = next(link for link in result['links'] if link['job_id'] == 'job_1')
        assert job_1_link['name'] == 'pipeline_1'
        assert job_1_link['workers'] == 3
        assert job_1_link['status'] == 'running'
        
        job_2_link = next(link for link in result['links'] if link['job_id'] == 'job_2')
        assert job_2_link['name'] == 'pipeline_2'
        assert job_2_link['workers'] == 2
        assert job_2_link['status'] == 'stopped'
    
    def test_nodes_are_deduplicated(self):
        """Test that duplicate nodes are removed from the result."""
        # Create jobs that might share the same source/destination nodes
        test_jobs = [
            {
                'job_id': 'job_1',
                'name': 'pipeline_1',
                'workers': 1,
                'ex': {'_status': 'running'},
                'operations': [
                    {'_op': 'kafka_reader', 'topic': 'shared_topic'},
                    {'_op': 'elasticsearch_bulk', 'index': 'index_1'}
                ]
            },
            {
                'job_id': 'job_2',
                'name': 'pipeline_2',
                'workers': 1,
                'ex': {'_status': 'running'},
                'operations': [
                    {'_op': 'kafka_reader', 'topic': 'shared_topic'},
                    {'_op': 'elasticsearch_bulk', 'index': 'index_2'}
                ]
            }
        ]
        
        result = _process_jobs_to_graph(test_jobs)
        
        # Nodes should be deduplicated (using set() in the function)
        assert len(result['nodes']) == len(set(result['nodes']))
        
        # But links should not be deduplicated (each job creates its own link)
        assert len(result['links']) == 2