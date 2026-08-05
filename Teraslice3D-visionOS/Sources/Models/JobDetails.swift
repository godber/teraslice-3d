import Foundation

/// Status of a Teraslice Job execution.
public enum JobStatus: String, Codable, Sendable, CaseIterable {
    case running = "running"
    case starting = "starting"
    case stopped = "stopped"
    case stopping = "stopping"
    case failing = "failing"
    case failed = "failed"
    case completed = "completed"
    case unknown = "unknown"

    public var isFailingOrFailed: Bool {
        self == .failing || self == .failed
    }

    public var statusColorName: String {
        switch self {
        case .running: return "green"
        case .starting: return "blue"
        case .stopped, .stopping: return "orange"
        case .failing, .failed: return "red"
        case .completed: return "purple"
        case .unknown: return "gray"
        }
    }
}

/// Detailed specification of a Teraslice Job from `/api/jobs`.
public struct JobDetails: Identifiable, Codable, Sendable {
    public var id: String { job_id }
    public let job_id: String
    public let name: String
    public let lifecycle: String?
    public let workers: Int
    public let assets: [String]?
    public let created: String?
    public let updated: String?
    public let status: JobStatus

    enum CodingKeys: String, CodingKey {
        case job_id
        case name
        case lifecycle
        case workers
        case assets
        case created = "_created"
        case updated = "_updated"
        case ex
    }

    enum ExKeys: String, CodingKey {
        case status = "_status"
    }

    public init(
        job_id: String,
        name: String,
        lifecycle: String? = "persistent",
        workers: Int = 1,
        assets: [String]? = [],
        created: String? = nil,
        updated: String? = nil,
        status: JobStatus = .running
    ) {
        self.job_id = job_id
        self.name = name
        self.lifecycle = lifecycle
        self.workers = workers
        self.assets = assets
        self.created = created
        self.updated = updated
        self.status = status
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.job_id = try container.decode(String.self, forKey: .job_id)
        self.name = try container.decodeIfPresent(String.self, forKey: .name) ?? "Unnamed Job"
        self.lifecycle = try container.decodeIfPresent(String.self, forKey: .lifecycle)
        self.workers = try container.decodeIfPresent(Int.self, forKey: .workers) ?? 1
        self.assets = try container.decodeIfPresent([String].self, forKey: .assets)
        self.created = try container.decodeIfPresent(String.self, forKey: .created)
        self.updated = try container.decodeIfPresent(String.self, forKey: .updated)

        if let exContainer = try? container.nestedContainer(keyedBy: ExKeys.self, forKey: .ex),
           let rawStatus = try? exContainer.decodeIfPresent(String.self, forKey: .status) {
            self.status = JobStatus(rawValue: rawStatus.lowercased()) ?? .unknown
        } else {
            self.status = .unknown
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(job_id, forKey: .job_id)
        try container.encode(name, forKey: .name)
        try container.encodeIfPresent(lifecycle, forKey: .lifecycle)
        try container.encode(workers, forKey: .workers)
        try container.encodeIfPresent(assets, forKey: .assets)
        try container.encodeIfPresent(created, forKey: .created)
        try container.encodeIfPresent(updated, forKey: .updated)

        var exContainer = container.nestedContainer(keyedBy: ExKeys.self, forKey: .ex)
        try exContainer.encode(status.rawValue, forKey: .status)
    }
}

/// Version response payload from `/api/version`.
public struct ServerVersion: Codable, Sendable {
    public let version: String
}
