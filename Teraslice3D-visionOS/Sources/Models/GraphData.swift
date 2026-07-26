import Foundation

/// Types of data storage and processing connectors in Teraslice pipelines.
public enum ConnectorType: String, Codable, Sendable, CaseIterable {
    case kafkaIncoming = "KAFKA_INCOMING"
    case kafkaOther = "KAFKA"
    case elasticsearch = "ES"
    case dataGenerator = "DATA_GENERATOR"
    case noop = "NOOP"
    case unknown = "UNKNOWN"

    public var displayName: String {
        switch self {
        case .kafkaIncoming: return "Kafka (Incoming)"
        case .kafkaOther: return "Kafka (Internal)"
        case .elasticsearch: return "Elasticsearch"
        case .dataGenerator: return "Data Generator"
        case .noop: return "No-Op"
        case .unknown: return "Unknown"
        }
    }
}

/// Node in the 3D pipeline graph representing a connector, topic, or storage index.
public struct GraphNode: Identifiable, Codable, Hashable, Sendable {
    public let id: String
    public let connectorType: ConnectorType

    public var isIncoming: Bool {
        id.lowercased().contains("incoming") || connectorType == .kafkaIncoming
    }

    enum CodingKeys: String, CodingKey {
        case id
        case connectorType = "connector_type"
    }

    public init(id: String, connectorType: ConnectorType) {
        self.id = id
        self.connectorType = connectorType
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = try container.decode(String.self, forKey: .id)
        let rawType = try container.decodeIfPresent(String.self, forKey: .connectorType) ?? ""

        if id.lowercased().contains("incoming") && (rawType == "KAFKA" || rawType.isEmpty) {
            self.connectorType = .kafkaIncoming
        } else {
            self.connectorType = ConnectorType(rawValue: rawType) ?? .unknown
        }
    }
}

/// Link in the 3D pipeline graph representing a Teraslice job connecting two nodes.
public struct GraphLink: Identifiable, Codable, Hashable, Sendable {
    public var id: String { job_id + "_" + source + "_" + target }
    public let source: String
    public let target: String
    public let job_id: String
    public let name: String
    public let url: String?
    public let workers: Int
    public let status: String
    public let grafana_url: String?

    enum CodingKeys: String, CodingKey {
        case source
        case target
        case job_id
        case name
        case url
        case workers
        case status
        case grafana_url
    }

    public init(
        source: String,
        target: String,
        job_id: String,
        name: String,
        url: String? = nil,
        workers: Int = 1,
        status: String = "running",
        grafana_url: String? = nil
    ) {
        self.source = source
        self.target = target
        self.job_id = job_id
        self.name = name
        self.url = url
        self.workers = workers
        self.status = status
        self.grafana_url = grafana_url
    }
}

/// Full network graph payload returned by `/api/pipeline_graph`.
public struct PipelineGraph: Codable, Equatable, Hashable, Sendable {
    public let nodes: [GraphNode]
    public let links: [GraphLink]

    public init(nodes: [GraphNode] = [], links: [GraphLink] = []) {
        self.nodes = nodes
        self.links = links
    }
}
