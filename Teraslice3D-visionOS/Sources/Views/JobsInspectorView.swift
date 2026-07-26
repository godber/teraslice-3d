import SwiftUI

public struct JobsInspectorView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss

    public init() {}

    public var body: some View {
        NavigationStack {
            List {
                Section("Jobs (\(appState.jobs.count))") {
                    ForEach(appState.jobs) { job in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(job.name)
                                    .font(.headline)
                                Spacer()
                                Text(job.status.rawValue.capitalized)
                                    .font(.caption)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 3)
                                    .background(statusColor(job.status).opacity(0.2), in: Capsule())
                                    .foregroundStyle(statusColor(job.status))
                            }

                            HStack {
                                Label("\(job.workers) Workers", systemImage: "cpu")
                                Spacer()
                                Text("ID: \(job.job_id.prefix(8))...")
                                    .font(.caption2)
                                    .monospaced()
                                    .foregroundStyle(.secondary)
                            }
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .navigationTitle("Jobs & Connectors")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
        .frame(minWidth: 500, minHeight: 600)
    }

    private func statusColor(_ status: JobStatus) -> Color {
        switch status {
        case .running: return .green
        case .starting: return .blue
        case .stopped, .stopping: return .orange
        case .failing, .failed: return .red
        case .completed: return .purple
        case .unknown: return .gray
        }
    }
}
