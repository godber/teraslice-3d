import SwiftUI

@main
struct Teraslice3DApp: App {
    @State private var appState = AppState()

    var body: some Scene {
        #if os(visionOS)
        // 1. Primary Application Window (matches UIWindowSceneSessionRoleApplication)
        WindowGroup {
            PipelineVolumeView()
                .environment(appState)
        }
        .defaultSize(width: 800, height: 600)

        // 2. 3D Volumetric Window (matches UISceneSessionRoleVolumetricApplication)
        WindowGroup(id: "volumetric-main") {
            PipelineVolumeView()
                .environment(appState)
        }
        .windowStyle(.volumetric)
        .defaultSize(width: 1.0, height: 1.0, depth: 1.0, in: .meters)
        #else
        WindowGroup {
            PipelineVolumeView()
                .environment(appState)
        }
        .defaultSize(width: 800, height: 600)
        #endif
    }
}



