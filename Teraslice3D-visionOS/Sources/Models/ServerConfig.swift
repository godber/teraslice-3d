import Foundation

/// Represents a Teraslice backend server connection config.
public struct ServerConfig: Identifiable, Codable, Hashable, Sendable {
    public var id: UUID
    public var name: String
    public var baseURLString: String
    public var isMock: Bool

    public var baseURL: URL? {
        URL(string: baseURLString.trimmingCharacters(in: .whitespacesAndNewlines))
    }

    public init(id: UUID = UUID(), name: String, baseURLString: String, isMock: Bool = false) {
        self.id = id
        self.name = name
        self.baseURLString = baseURLString
        self.isMock = isMock
    }

    public static let defaultLocal = ServerConfig(
        name: "Local FastAPI Backend",
        baseURLString: "http://127.0.0.1:8000",
        isMock: false
    )

    public static let mockDataServer = ServerConfig(
        name: "Offline Mock Data",
        baseURLString: "http://mock.internal",
        isMock: true
    )
}
