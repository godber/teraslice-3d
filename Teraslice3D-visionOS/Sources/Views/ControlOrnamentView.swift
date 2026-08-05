import SwiftUI

public struct ControlOrnamentView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.openWindow) private var openWindow
    @State private var showSettings = false
    @State private var showInspector = false

    public init() {}

    public var body: some View {
        HStack(spacing: 16) {
            // Server Selector
            Menu {
                ForEach(appState.serverList) { server in
                    Button(action: { appState.switchServer(server) }) {
                        HStack {
                            Text(server.name)
                            if server.id == appState.activeServer.id {
                                Image(systemName: "checkmark")
                            }
                        }
                    }
                }
            } label: {
                Label(appState.activeServer.name, systemImage: "server.rack")
                    .font(.subheadline)
            }
            .buttonStyle(.bordered)

            Divider()
                .frame(height: 20)

            // Search Bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)
                TextField("Search nodes or jobs...", text: Bindable(appState).searchText)
                    .textFieldStyle(.plain)
                    .frame(width: 180)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(.ultraThinMaterial, in: Capsule())

            // Filter Mode Toggle
            Picker("Filter Mode", selection: Bindable(appState).filterMode) {
                ForEach(FilterMode.allCases) { mode in
                    Text(mode.rawValue).tag(mode)
                }
            }
            .pickerStyle(.segmented)
            .frame(width: 180)

            Divider()
                .frame(height: 20)

            // Refresh Button
            Button(action: {
                Task {
                    await appState.refreshData()
                }
            }) {
                Image(systemName: "arrow.clockwise")
                    .rotationEffect(.degrees(appState.isRefreshing ? 360 : 0))
                    .animation(appState.isRefreshing ? .linear(duration: 1).repeatForever(autoreverses: false) : .default, value: appState.isRefreshing)
            }
            .help("Refresh Pipeline Data")

            // Settings Button
            Button(action: { showSettings.toggle() }) {
                Image(systemName: "gear")
            }
            .sheet(isPresented: $showSettings) {
                SettingsView()
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.regularMaterial, in: Capsule())
    }
}
