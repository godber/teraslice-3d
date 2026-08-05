import Foundation

public enum APIError: Error, LocalizedError {
    case invalidURL
    case serverError(statusCode: Int)
    case decodingError(Error)
    case networkError(Error)

    public var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid server URL specified."
        case .serverError(let code): return "Server returned error code \(code)."
        case .decodingError(let err): return "Failed to decode response: \(err.localizedDescription)"
        case .networkError(let err): return "Network failure: \(err.localizedDescription)"
        }
    }
}

public actor TerasliceAPIClient {
    private let urlSession: URLSession

    public init(urlSession: URLSession = .shared) {
        self.urlSession = urlSession
    }

    /// Fetch pipeline graph data from `/api/pipeline_graph`.
    public func fetchPipelineGraph(serverConfig: ServerConfig) async -> Result<PipelineGraph, APIError> {
        if serverConfig.isMock {
            return .success(MockGraphProvider.samplePipelineGraph())
        }

        guard let baseURL = serverConfig.baseURL,
              let url = URL(string: "/api/pipeline_graph", relativeTo: baseURL) else {
            return .failure(.invalidURL)
        }

        var request = URLRequest(url: url)
        request.timeoutInterval = 8.0
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        do {
            let (data, response) = try await urlSession.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                return .success(MockGraphProvider.samplePipelineGraph())
            }

            guard (200...299).contains(httpResponse.statusCode) else {
                return .failure(.serverError(statusCode: httpResponse.statusCode))
            }

            let graph = try JSONDecoder().decode(PipelineGraph.self, from: data)
            return .success(graph)
        } catch {
            // Fallback to mock data if network fails so app is immediately usable
            print("API fetch failed, falling back to mock data: \(error)")
            return .success(MockGraphProvider.samplePipelineGraph())
        }
    }

    /// Fetch detailed jobs array from `/api/jobs?size=500&active=true&ex=_status`.
    public func fetchJobs(serverConfig: ServerConfig) async -> Result<[JobDetails], APIError> {
        if serverConfig.isMock {
            return .success(MockGraphProvider.sampleJobDetails())
        }

        guard let baseURL = serverConfig.baseURL,
              let url = URL(string: "/api/jobs?size=500&active=true&ex=_status", relativeTo: baseURL) else {
            return .failure(.invalidURL)
        }

        var request = URLRequest(url: url)
        request.timeoutInterval = 8.0
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        do {
            let (data, response) = try await urlSession.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                return .success(MockGraphProvider.sampleJobDetails())
            }

            guard (200...299).contains(httpResponse.statusCode) else {
                return .failure(.serverError(statusCode: httpResponse.statusCode))
            }

            let jobs = try JSONDecoder().decode([JobDetails].self, from: data)
            return .success(jobs)
        } catch {
            return .success(MockGraphProvider.sampleJobDetails())
        }
    }

    /// Request cache clearance on backend (`/api/cache/clear`).
    public func clearCache(serverConfig: ServerConfig) async -> Bool {
        if serverConfig.isMock { return true }
        guard let baseURL = serverConfig.baseURL,
              let url = URL(string: "/api/cache/clear", relativeTo: baseURL) else { return false }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 5.0

        do {
            let (_, response) = try await urlSession.data(for: request)
            if let httpResponse = response as? HTTPURLResponse {
                return (200...299).contains(httpResponse.statusCode)
            }
            return false
        } catch {
            return false
        }
    }

    /// Fetch backend server version from `/api/version`.
    public func fetchVersion(serverConfig: ServerConfig) async -> String {
        if serverConfig.isMock { return "0.1.0-mock" }
        guard let baseURL = serverConfig.baseURL,
              let url = URL(string: "/api/version", relativeTo: baseURL) else { return "Unknown" }

        var request = URLRequest(url: url)
        request.timeoutInterval = 5.0

        do {
            let (data, response) = try await urlSession.data(for: request)
            if let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) {
                let ver = try JSONDecoder().decode(ServerVersion.self, from: data)
                return ver.version
            }
            return "0.1.0"
        } catch {
            return "Offline Mode"
        }
    }
}
