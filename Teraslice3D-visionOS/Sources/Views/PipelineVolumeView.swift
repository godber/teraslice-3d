import SwiftUI
import RealityKit
#if os(visionOS) || canImport(Spatial)
import Spatial
#endif

public struct PipelineVolumeView: View {
    @Environment(AppState.self) private var appState

    @State private var graphEntity = PipelineGraphEntity()
    @State private var rotation: Rotation3D = .identity

    public init() {}

    public var body: some View {
        #if os(visionOS)
        RealityView { content in
            content.add(graphEntity)
            graphEntity.updateGraph(appState.graphData)
        } update: { content in
            // Graph entity automatically updates child transforms
        }
        .onChange(of: appState.graphData) { _, newGraphData in
            graphEntity.updateGraph(newGraphData)
        }
        .ornament(attachmentAnchor: .scene(.bottom)) {
            ControlOrnamentView()
                .environment(appState)
        }
        #else
        VStack(spacing: 20) {
            Image(systemName: "cube.transparent.fill")
                .font(.system(size: 80))
                .foregroundStyle(.blue.gradient)

            Text("Teraslice 3D Volumetric Scene")
                .font(.title)
                .bold()

            Text("Server: \(appState.activeServer.name) (\(appState.serverVersion))")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            HStack(spacing: 16) {
                VStack(alignment: .leading) {
                    Text("Nodes (\(appState.graphData.nodes.count)):")
                        .font(.headline)
                    ForEach(appState.graphData.nodes.prefix(5)) { node in
                        Text("• \(node.id) [\(node.connectorType.displayName)]")
                            .font(.caption)
                    }
                }
                .padding()
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))

                VStack(alignment: .leading) {
                    Text("Links (\(appState.graphData.links.count)):")
                        .font(.headline)
                    ForEach(appState.graphData.links.prefix(5)) { link in
                        Text("• \(link.name) (\(link.workers) workers - \(link.status))")
                            .font(.caption)
                    }
                }
                .padding()
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))
            }
        }
        .padding(30)
        .task {
            appState.start()
        }
        #endif
    }
}
