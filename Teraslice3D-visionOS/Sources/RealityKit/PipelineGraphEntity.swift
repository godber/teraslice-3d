import SwiftUI
import RealityKit
import simd

/// Dynamic 3D Volumetric Projection parameters for centering and scale-fitting within visionOS volumetric window.
public struct VolumetricProjection {
    public let centroid: SIMD3<Float>
    public let scale: Float
    public let targetVolumeSpan: Float

    public init(nodes: [Node3D], targetVolumeSpan: Float = 0.40) {
        self.targetVolumeSpan = targetVolumeSpan
        guard !nodes.isEmpty else {
            self.centroid = .zero
            self.scale = 1.0
            return
        }

        var minPos = SIMD3<Float>(repeating: Float.greatestFiniteMagnitude)
        var maxPos = SIMD3<Float>(repeating: -Float.greatestFiniteMagnitude)

        for node in nodes {
            minPos = simd_min(minPos, node.position)
            maxPos = simd_max(maxPos, node.position)
        }

        self.centroid = (minPos + maxPos) * 0.5
        let extent = maxPos - minPos
        let maxExtent = max(extent.x, max(extent.y, extent.z))

        self.scale = targetVolumeSpan / max(maxExtent, 0.001)
    }

    public func project(_ position: SIMD3<Float>) -> SIMD3<Float> {
        return (position - centroid) * scale
    }
}

/// Root RealityKit Spatial Entity containing full 3D pipeline graph scene graph.
public final class PipelineGraphEntity: Entity {
    public private(set) var nodeEntities: [String: NodeEntity] = [:]
    public private(set) var linkEntities: [String: LinkEntity] = [:]

    public private(set) var simulation = ForceSimulation3D()

    @MainActor
    public required init() {
        super.init()
    }

    @MainActor
    private func computeNodeRadius(for node: GraphNode, projection: VolumetricProjection, totalNodeCount: Int) -> Float {
        let densityFactor = 1.0 / sqrt(max(Float(totalNodeCount) / 10.0, 1.0))
        let baseRadius: Float = node.isIncoming ? 0.18 : 0.12
        return simd_clamp(baseRadius * projection.scale * densityFactor, 0.008, 0.035)
    }

    /// Build and render 3D node spheres and link pipe meshes for the given pipeline graph.
    @MainActor
    public func updateGraph(_ graph: PipelineGraph) {
        simulation.setup(graph: graph)
        simulation.runSimulation(iterations: 120)

        for (_, entity) in nodeEntities { entity.removeFromParent() }
        for (_, entity) in linkEntities { entity.removeFromParent() }
        nodeEntities.removeAll()
        linkEntities.removeAll()

        let projection = VolumetricProjection(nodes: Array(simulation.nodes.values), targetVolumeSpan: 0.40)
        let totalCount = graph.nodes.count

        for node in graph.nodes {
            let simPos = simulation.nodes[node.id]?.position ?? .zero
            let renderedPos = projection.project(simPos)
            let radius = computeNodeRadius(for: node, projection: projection, totalNodeCount: totalCount)
            let nodeEntity = NodeEntity(node: node, position: renderedPos, radius: radius)
            self.addChild(nodeEntity)
            nodeEntities[node.id] = nodeEntity
        }

        for link in graph.links {
            guard let simSourcePos = simulation.nodes[link.source]?.position,
                  let simTargetPos = simulation.nodes[link.target]?.position else { continue }
            let renderedSourcePos = projection.project(simSourcePos)
            let renderedTargetPos = projection.project(simTargetPos)
            let linkEntity = LinkEntity(link: link, sourcePos: renderedSourcePos, targetPos: renderedTargetPos, scale: projection.scale)
            self.addChild(linkEntity)
            linkEntities[link.id] = linkEntity
        }
    }

    /// Tick simulation step and update RealityKit 3D transforms.
    @MainActor
    public func stepSimulation() {
        simulation.tick(alpha: 0.1)

        let projection = VolumetricProjection(nodes: Array(simulation.nodes.values), targetVolumeSpan: 0.40)

        // Update node positions
        for (id, nodeEntity) in nodeEntities {
            if let simNode = simulation.nodes[id] {
                nodeEntity.position = projection.project(simNode.position)
            }
        }

        // Update link cylinder transforms
        for link in simulation.links {
            guard let linkEntity = linkEntities[link.id],
                  let simSourcePos = simulation.nodes[link.source]?.position,
                  let simTargetPos = simulation.nodes[link.target]?.position else { continue }

            let renderedSourcePos = projection.project(simSourcePos)
            let renderedTargetPos = projection.project(simTargetPos)
            linkEntity.updateTransformAndMesh(link: link, sourcePos: renderedSourcePos, targetPos: renderedTargetPos, scale: projection.scale)
        }
    }
}
