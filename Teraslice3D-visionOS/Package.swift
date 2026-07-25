// swift-tools-version: 6.0
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "Teraslice3D",
    platforms: [
        .visionOS(.v2),
        .macOS(.v15)
    ],
    products: [
        .executable(
            name: "Teraslice3D",
            targets: ["Teraslice3D"]
        ),
    ],
    targets: [
        .executableTarget(
            name: "Teraslice3D",
            dependencies: [],
            path: "Sources"
        ),
        .testTarget(
            name: "Teraslice3DTests",
            dependencies: ["Teraslice3D"],
            path: "Tests"
        )
    ]
)
