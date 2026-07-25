import SwiftUI

@main
struct Teraslice3DApp: App {
    @State private var appState = AppState()

    var body: some Scene {
        #if os(visionOS)
        WindowGroup(id: "volumetric-main") {
            PipelineVolumeView()
                .environment(appState)
                .ornament(attachmentAnchor: .scene(.bottom)) {
                    ControlOrnamentView()
                        .environment(appState)
                }
        }
        .windowStyle(.volumetric)
        .defaultSize(width: 1.0, height: 1.0, depth: 1.0, in: .meters)

        WindowGroup {
            PipelineVolumeView()
                .environment(appState)
                .ornament(attachmentAnchor: .scene(.bottom)) {
                    ControlOrnamentView()
                        .environment(appState)
                }
        }
        .defaultSize(width: 800, height: 600)
        #else
        WindowGroup {
            PipelineVolumeView()
                .environment(appState)
        }
        .defaultSize(width: 800, height: 600)
        #endif
    }
}



