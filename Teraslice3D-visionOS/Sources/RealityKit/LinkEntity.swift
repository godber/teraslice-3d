import SwiftUI
import RealityKit
import simd
#if canImport(UIKit)
import UIKit
typealias LinkPlatformColor = UIColor
#elseif canImport(AppKit)
import AppKit
typealias LinkPlatformColor = NSColor
#endif

/// Custom RealityKit Entity representing a 3D pipeline job connection pipe.
public final class LinkEntity: Entity, HasModel, HasCollision {
    public let linkID: String
    public let jobID: String
    public let sourceID: String
    public let targetID: String

    @MainActor
    public init(link: GraphLink, sourcePos: SIMD3<Float>, targetPos: SIMD3<Float>, scale: Float = 1.0) {
        self.linkID = link.id
        self.jobID = link.job_id
        self.sourceID = link.source
        self.targetID = link.target
        super.init()

        updateTransformAndMesh(link: link, sourcePos: sourcePos, targetPos: targetPos, scale: scale)

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
    public func updateTransformAndMesh(link: GraphLink, sourcePos: SIMD3<Float>, targetPos: SIMD3<Float>, scale: Float = 1.0) {
        let delta = targetPos - sourcePos
        let distance = simd_length(delta)

        guard distance > 0.001, !distance.isNaN else { return }

        // Worker scale matching web frontend: ((workers - 1) / (200 - 1)) * (20 - 1) + 1
        let workersClamped = Float(max(1, min(200, link.workers)))
        let workerScale = ((workersClamped - 1.0) / 199.0) * 19.0 + 1.0
        let basePipeRadius: Float = 0.005
        let rawRadius = basePipeRadius * workerScale * scale
        let radius = simd_clamp(rawRadius, 0.002, 0.015)

        let mesh = MeshResource.generateCylinder(height: distance, radius: radius)
        let material = LinkEntity.material(for: link.status)

        self.model = ModelComponent(mesh: mesh, materials: [material])

        // Position at midpoint between source and target
        self.position = (sourcePos + targetPos) * 0.5

        // Orient cylinder (default Y-axis) along vector delta with NaN safeguards
        let direction = simd_normalize(delta)
        let defaultUp = SIMD3<Float>(0, 1, 0)
        let dot = simd_clamp(simd_dot(defaultUp, direction), -1.0, 1.0)

        if dot > 0.9999 {
            self.orientation = simd_quatf(angle: 0, axis: SIMD3<Float>(1, 0, 0))
        } else if dot < -0.9999 {
            self.orientation = simd_quatf(angle: .pi, axis: SIMD3<Float>(1, 0, 0))
        } else {
            let axis = simd_cross(defaultUp, direction)
            let axisLen = simd_length(axis)
            if axisLen > 0.0001 {
                let angle = acos(dot)
                self.orientation = simd_quatf(angle: angle, axis: axis / axisLen)
            } else {
                self.orientation = simd_quatf(angle: 0, axis: SIMD3<Float>(1, 0, 0))
            }
        }

        let shape = ShapeResource.generateBox(size: SIMD3<Float>(radius * 3, max(0.01, distance), radius * 3))
        self.components.set(CollisionComponent(shapes: [shape]))
    }

    @MainActor
    public static func material(for status: String) -> SimpleMaterial {
        let color: LinkPlatformColor
        let statusEnum = JobStatus(rawValue: status.lowercased()) ?? .unknown

        switch statusEnum {
        case .running:
            color = LinkPlatformColor.systemGreen
        case .starting:
            color = LinkPlatformColor.systemBlue
        case .stopped, .stopping:
            color = LinkPlatformColor.systemOrange
        case .failing, .failed:
            color = LinkPlatformColor.systemRed
        case .completed:
            color = LinkPlatformColor.systemPurple
        case .unknown:
            color = LinkPlatformColor.systemGray
        }

        var mat = SimpleMaterial(color: color, isMetallic: false)
        mat.roughness = 0.2
        return mat
    }
}
