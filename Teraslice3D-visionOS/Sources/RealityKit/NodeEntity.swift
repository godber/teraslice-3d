import SwiftUI
import RealityKit
#if canImport(UIKit)
import UIKit
typealias NodePlatformColor = UIColor
#elseif canImport(AppKit)
import AppKit
typealias NodePlatformColor = NSColor
#endif

/// Custom RealityKit Entity representing a 3D pipeline connector node.
public final class NodeEntity: Entity, HasModel, HasCollision {
    public let nodeID: String
    public let connectorType: ConnectorType
    public private(set) var radius: Float

    @MainActor
    public init(node: GraphNode, position: SIMD3<Float> = .zero, radius: Float = 0.04) {
        self.nodeID = node.id
        self.connectorType = node.connectorType
        self.radius = radius
        super.init()

        updateMeshAndCollision(radius: radius, isIncoming: node.isIncoming)
        self.position = position
    }

    @MainActor
    public required init() {
        self.nodeID = "unknown"
        self.connectorType = .unknown
        self.radius = 0.04
        super.init()
    }

    @MainActor
    public func updateMeshAndCollision(radius: Float, isIncoming: Bool) {
        self.radius = radius
        let mesh = MeshResource.generateSphere(radius: radius)
        let material = NodeEntity.material(for: self.connectorType, isIncoming: isIncoming)

        self.model = ModelComponent(mesh: mesh, materials: [material])

        // Enable spatial interaction (gaze + pinch hover)
        let shape = ShapeResource.generateSphere(radius: radius * 1.2)
        self.components.set(CollisionComponent(shapes: [shape]))
        self.components.set(InputTargetComponent())
        self.components.set(HoverEffectComponent())
    }

    @MainActor
    public static func material(for connectorType: ConnectorType, isIncoming: Bool) -> SimpleMaterial {
        let color: NodePlatformColor
        switch connectorType {
        case .kafkaIncoming:
            color = NodePlatformColor.systemYellow
        case .kafkaOther:
            color = isIncoming ? NodePlatformColor.systemYellow : NodePlatformColor.systemBlue
        case .elasticsearch:
            color = NodePlatformColor.systemGreen
        case .dataGenerator:
            color = NodePlatformColor.systemPurple
        case .noop:
            color = NodePlatformColor.systemGray
        case .unknown:
            color = NodePlatformColor.systemGray
        }

        var mat = SimpleMaterial(color: color, isMetallic: false)
        mat.roughness = 0.3
        return mat
    }
}
