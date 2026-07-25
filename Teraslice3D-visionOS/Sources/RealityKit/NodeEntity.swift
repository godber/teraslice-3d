import SwiftUI
import RealityKit
import UIKit

/// Custom RealityKit Entity representing a 3D pipeline connector node.
public final class NodeEntity: Entity, HasModel, HasCollision {
    public let nodeID: String
    public let connectorType: ConnectorType

    @MainActor
    public init(node: GraphNode, position: SIMD3<Float> = .zero) {
        self.nodeID = node.id
        self.connectorType = node.connectorType
        super.init()

        let radius: Float = node.isIncoming ? 0.06 : 0.04
        let mesh = MeshResource.generateSphere(radius: radius)
        let material = NodeEntity.material(for: node.connectorType, isIncoming: node.isIncoming)

        self.model = ModelComponent(mesh: mesh, materials: [material])
        self.position = position

        // Enable spatial interaction (gaze + pinch hover)
        let shape = ShapeResource.generateSphere(radius: radius * 1.2)
        self.components.set(CollisionComponent(shapes: [shape]))
        self.components.set(InputTargetComponent())
        self.components.set(HoverEffectComponent())
    }

    @MainActor
    public required init() {
        self.nodeID = "unknown"
        self.connectorType = .unknown
        super.init()
    }

    @MainActor
    public static func material(for connectorType: ConnectorType, isIncoming: Bool) -> SimpleMaterial {
        let color: UIColor
        switch connectorType {
        case .kafkaIncoming:
            color = UIColor.systemYellow
        case .kafkaOther:
            color = isIncoming ? UIColor.systemYellow : UIColor.systemBlue
        case .elasticsearch:
            color = UIColor.systemGreen
        case .dataGenerator:
            color = UIColor.systemPurple
        case .noop:
            color = UIColor.systemGray
        case .unknown:
            color = UIColor.systemGray
        }

        var mat = SimpleMaterial(color: color, isMetallic: false)
        mat.roughness = 0.3
        return mat
    }
}
