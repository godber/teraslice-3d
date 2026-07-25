import SwiftUI
import RealityKit
import simd
import UIKit

/// Custom RealityKit Entity representing a 3D pipeline job connection pipe.
public final class LinkEntity: Entity, HasModel, HasCollision {
    public let linkID: String
    public let jobID: String
    public let sourceID: String
    public let targetID: String

    @MainActor
    public init(link: GraphLink, sourcePos: SIMD3<Float>, targetPos: SIMD3<Float>) {
        self.linkID = link.id
        self.jobID = link.job_id
        self.sourceID = link.source
        self.targetID = link.target
        super.init()

        updateTransformAndMesh(link: link, sourcePos: sourcePos, targetPos: targetPos)

        // Enable spatial interaction
        self.components.set(InputTargetComponent())
        self.components.set(HoverEffectComponent())
    }

    @MainActor
    public required init() {
        self.linkID = ""
        self.jobID = ""
        self.sourceID = ""
        self.targetID = ""
        super.init()
    }

    @MainActor
    public func updateTransformAndMesh(link: GraphLink, sourcePos: SIMD3<Float>, targetPos: SIMD3<Float>) {
        let delta = targetPos - sourcePos
        let distance = simd_length(delta)

        guard distance > 0.001 else { return }

        // Pipe radius scaled proportionally to worker count (1-200 workers -> 0.005m - 0.025m)
        let radius = min(0.025, max(0.005, 0.004 + Float(link.workers) * 0.001))

        let mesh = MeshResource.generateCylinder(height: distance, radius: radius)
        let material = LinkEntity.material(for: link.status)

        self.model = ModelComponent(mesh: mesh, materials: [material])

        // Position at midpoint between source and target
        self.position = (sourcePos + targetPos) * 0.5

        // Orient cylinder (default Y-axis) along vector delta
        let direction = simd_normalize(delta)
        let defaultUp = SIMD3<Float>(0, 1, 0)
        let dot = simd_dot(defaultUp, direction)

        if abs(dot - 1.0) < 0.0001 {
            self.orientation = simd_quatf(angle: 0, axis: SIMD3<Float>(1, 0, 0))
        } else if abs(dot + 1.0) < 0.0001 {
            self.orientation = simd_quatf(angle: .pi, axis: SIMD3<Float>(1, 0, 0))
        } else {
            let axis = simd_cross(defaultUp, direction)
            let angle = acos(simd_clamp(dot, -1.0, 1.0))
            self.orientation = simd_quatf(angle: angle, axis: simd_normalize(axis))
        }

        let shape = ShapeResource.generateBox(size: SIMD3<Float>(radius * 3, max(0.01, distance), radius * 3))
        self.components.set(CollisionComponent(shapes: [shape]))
    }

    @MainActor
    public static func material(for status: String) -> SimpleMaterial {
        let color: UIColor
        let statusEnum = JobStatus(rawValue: status.lowercased()) ?? .unknown

        switch statusEnum {
        case .running:
            color = UIColor.systemGreen
        case .starting:
            color = UIColor.systemBlue
        case .stopped, .stopping:
            color = UIColor.systemOrange
        case .failing, .failed:
            color = UIColor.systemRed
        case .completed:
            color = UIColor.systemPurple
        case .unknown:
            color = UIColor.systemGray
        }

        var mat = SimpleMaterial(color: color, isMetallic: false)
        mat.roughness = 0.2
        return mat
    }
}
