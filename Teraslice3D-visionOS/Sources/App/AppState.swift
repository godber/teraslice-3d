import Foundation
import SwiftUI
import Observation

public enum FilterMode: String, CaseIterable, Identifiable, Codable, Sendable {
    case highlight = "Highlight"
    case remove = "Remove Unmatched"

    public var id: String { rawValue }
}

@Observable
public final class AppState: @unchecked Sendable {
    public var activeServer: ServerConfig = .defaultLocal
    public var serverList: [ServerConfig] = [.defaultLocal, .mockDataServer]

    public var graphData: PipelineGraph = MockGraphProvider.samplePipelineGraph()
    public var jobs: [JobDetails] = MockGraphProvider.sampleJobDetails()
    public var serverVersion: String = "Connecting..."

    public var selectedNodeID: String? = nil
    public var selectedLinkID: String? = nil

    public var searchText: String = ""
    public var filterMode: FilterMode = .highlight

    public var isAutoRefreshEnabled: Bool = true
    public var autoRefreshInterval: TimeInterval = 30.0
    public var isRefreshing: Bool = false
    public var lastRefreshedAt: Date? = nil

    private let apiClient = TerasliceAPIClient()
    private var refreshTask: Task<Void, Never>? = nil

    public init() {
        Task { @MainActor in
            await refreshData()
            startAutoRefreshTask()
        }
    }

    @MainActor
    public func start() {
        Task {
            await refreshData()
            startAutoRefreshTask()
        }
    }

    @MainActor
    public func refreshData() async {
        isRefreshing = true
        defer { isRefreshing = false }

        let graphResult = await apiClient.fetchPipelineGraph(serverConfig: activeServer)
        switch graphResult {
        case .success(let graph):
            self.graphData = graph
        case .failure:
            self.graphData = MockGraphProvider.samplePipelineGraph()
        }

        let jobsResult = await apiClient.fetchJobs(serverConfig: activeServer)
        switch jobsResult {
        case .success(let jobs):
            self.jobs = jobs
        case .failure:
            self.jobs = MockGraphProvider.sampleJobDetails()
        }

        self.serverVersion = await apiClient.fetchVersion(serverConfig: activeServer)
        self.lastRefreshedAt = Date()
    }

    @MainActor
    public func clearServerCache() async -> Bool {
        return await apiClient.clearCache(serverConfig: activeServer)
    }

    @MainActor
    public func switchServer(_ server: ServerConfig) {
        self.activeServer = server
        Task {
            await refreshData()
        }
    }

    private func startAutoRefreshTask() {
        refreshTask?.cancel()
        refreshTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: UInt64((self?.autoRefreshInterval ?? 30.0) * 1_000_000_000))
                if Task.isCancelled { break }
                if self?.isAutoRefreshEnabled == true {
                    await self?.refreshData()
                }
            }
        }
    }

    deinit {
        refreshTask?.cancel()
    }

    public func matchesSearch(_ text: String) -> Bool {
        guard !searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return true }
        return text.localizedCaseInsensitiveContains(searchText)
    }
}
