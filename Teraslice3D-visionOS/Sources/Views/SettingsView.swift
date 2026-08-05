import SwiftUI

public struct SettingsView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss

    @State private var newServerName = ""
    @State private var newServerURL = ""
    @State private var cacheClearedMessage: String? = nil

    public init() {}

    public var body: some View {
        NavigationStack {
            Form {
                Section("Backend Servers") {
                    ForEach(appState.serverList) { server in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(server.name).font(.headline)
                                Text(server.baseURLString).font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            if server.id == appState.activeServer.id {
                                Text("Active")
                                    .font(.caption)
                                    .bold()
                                    .foregroundStyle(.blue)
                            }
                        }
                    }
                }

                Section("Add Custom Server") {
                    TextField("Server Name (e.g. Production Cluster)", text: $newServerName)
                    TextField("Base URL (e.g. http://192.168.1.50:8000)", text: $newServerURL)
                    Button("Add Server") {
                        guard !newServerName.isEmpty, !newServerURL.isEmpty else { return }
                        let newConfig = ServerConfig(name: newServerName, baseURLString: newServerURL, isMock: false)
                        appState.serverList.append(newConfig)
                        appState.switchServer(newConfig)
                        newServerName = ""
                        newServerURL = ""
                    }
                    .disabled(newServerName.isEmpty || newServerURL.isEmpty)
                }

                Section("Cache Controls") {
                    Button(role: .destructive, action: {
                        Task {
                            let success = await appState.clearServerCache()
                            cacheClearedMessage = success ? "Cache cleared successfully!" : "Failed to clear cache."
                        }
                    }) {
                        Label("Clear Teraslice Backend Cache", systemImage: "trash")
                    }

                    if let msg = cacheClearedMessage {
                        Text(msg)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
