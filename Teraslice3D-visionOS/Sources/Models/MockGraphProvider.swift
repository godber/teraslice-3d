import Foundation

/// Provides realistic, scrubbed offline mock data for testing visionOS UI & RealityKit renderer.
public struct MockGraphProvider {
    
    /// Returns realistic pipeline graph data matching Teraslice architecture.
    public static func samplePipelineGraph() -> PipelineGraph {
        let nodes = [
            GraphNode(id: "data_generator", connectorType: .dataGenerator),
            GraphNode(id: "noop", connectorType: .noop),
            GraphNode(id: "kafka_data3:incoming-noaa-isd-csv-v1", connectorType: .kafkaIncoming),
            GraphNode(id: "kafka_data3:prepared-noaa-isd-json-v1", connectorType: .kafkaOther),
            GraphNode(id: "es_data3:noaa-isd-v5-**", connectorType: .elasticsearch),
            GraphNode(id: "es_data2:noaa-isd-v5-**", connectorType: .elasticsearch),
            GraphNode(id: "es_data_os3:noaa-isd-v5-**", connectorType: .elasticsearch),
            GraphNode(id: "kafka_telemetry:incoming-logs-v2", connectorType: .kafkaIncoming),
            GraphNode(id: "es_analytics:logs-processed-v2", connectorType: .elasticsearch)
        ]

        let links = [
            GraphLink(
                source: "data_generator",
                target: "noop",
                job_id: "da8677ce-1c30-462c-b4f5-b985bb31f9bc",
                name: "datagen-to-noop-pipeline",
                url: "http://127.0.0.1:8000/jobs/da8677ce-1c30-462c-b4f5-b985bb31f9bc",
                workers: 2,
                status: "stopped"
            ),
            GraphLink(
                source: "kafka_data3:incoming-noaa-isd-csv-v1",
                target: "kafka_data3:prepared-noaa-isd-json-v1",
                job_id: "71e871d4-ad09-4012-8d60-8b0f288e5575",
                name: "noaa-isd-prepared-store-kafka",
                url: "http://127.0.0.1:8000/jobs/71e871d4-ad09-4012-8d60-8b0f288e5575",
                workers: 12,
                status: "running"
            ),
            GraphLink(
                source: "kafka_data3:prepared-noaa-isd-json-v1",
                target: "es_data3:noaa-isd-v5-**",
                job_id: "b9300ed8-b21d-4cc9-8c97-86a125abd110",
                name: "noaa-isd-store-es-data3",
                url: "http://127.0.0.1:8000/jobs/b9300ed8-b21d-4cc9-8c97-86a125abd110",
                workers: 8,
                status: "running"
            ),
            GraphLink(
                source: "kafka_data3:prepared-noaa-isd-json-v1",
                target: "es_data2:noaa-isd-v5-**",
                job_id: "269d0b92-72e8-4fac-b7c6-b116a584910b",
                name: "noaa-isd-store-es-data2",
                url: "http://127.0.0.1:8000/jobs/269d0b92-72e8-4fac-b7c6-b116a584910b",
                workers: 4,
                status: "running"
            ),
            GraphLink(
                source: "kafka_data3:prepared-noaa-isd-json-v1",
                target: "es_data_os3:noaa-isd-v5-**",
                job_id: "d0734b75-f36d-4f3b-a034-64d7423feb53",
                name: "noaa-isd-store-es-data-os3",
                url: "http://127.0.0.1:8000/jobs/d0734b75-f36d-4f3b-a034-64d7423feb53",
                workers: 16,
                status: "running"
            ),
            GraphLink(
                source: "kafka_telemetry:incoming-logs-v2",
                target: "es_analytics:logs-processed-v2",
                job_id: "f83a2190-711a-4d44-90a2-aa99821ef102",
                name: "telemetry-indexer-failing",
                url: "http://127.0.0.1:8000/jobs/f83a2190-711a-4d44-90a2-aa99821ef102",
                workers: 5,
                status: "failing"
            )
        ]

        return PipelineGraph(nodes: nodes, links: links)
    }

    /// Returns realistic job details for inspector view.
    public static func sampleJobDetails() -> [JobDetails] {
        return [
            JobDetails(
                job_id: "da8677ce-1c30-462c-b4f5-b985bb31f9bc",
                name: "datagen-to-noop-pipeline",
                lifecycle: "persistent",
                workers: 2,
                assets: ["standard"],
                status: .stopped
            ),
            JobDetails(
                job_id: "71e871d4-ad09-4012-8d60-8b0f288e5575",
                name: "noaa-isd-prepared-store-kafka",
                lifecycle: "persistent",
                workers: 12,
                assets: ["kafka", "standard"],
                status: .running
            ),
            JobDetails(
                job_id: "b9300ed8-b21d-4cc9-8c97-86a125abd110",
                name: "noaa-isd-store-es-data3",
                lifecycle: "persistent",
                workers: 8,
                assets: ["kafka", "elasticsearch"],
                status: .running
            ),
            JobDetails(
                job_id: "269d0b92-72e8-4fac-b7c6-b116a584910b",
                name: "noaa-isd-store-es-data2",
                lifecycle: "persistent",
                workers: 4,
                assets: ["kafka", "elasticsearch"],
                status: .running
            ),
            JobDetails(
                job_id: "d0734b75-f36d-4f3b-a034-64d7423feb53",
                name: "noaa-isd-store-es-data-os3",
                lifecycle: "persistent",
                workers: 16,
                assets: ["kafka", "elasticsearch"],
                status: .running
            ),
            JobDetails(
                job_id: "f83a2190-711a-4d44-90a2-aa99821ef102",
                name: "telemetry-indexer-failing",
                lifecycle: "persistent",
                workers: 5,
                assets: ["kafka", "elasticsearch"],
                status: .failing
            )
        ]
    }
}
