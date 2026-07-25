import SwiftUI
import RealityKit
import simd

/// Root RealityKit Spatial Entity containing full 3D pipeline graph scene graph.
public final class PipelineGraphEntity: Entity {
    public private(set) var nodeEntities: [String: NodeEntity] = [:]
    public private(set) var linkEntities: [String: LinkEntity] = [:]

    public private(set) var simulation = ForceSimulation3D()

    @MainActor
    public required init() {
        super.init()
    }

    /// Build only 3D node spheres for Step 3A.
    @MainActor
    public func updateNodesOnly(_ graph: PipelineGraph) {
        simulation.setup(graph: graph)
        simulation.runSimulation(iterations: 120)

        for (_, entity) in nodeEntities { entity.removeFromParent() }
        for (_, entity) in linkEntities { entity.removeFromParent() }
        nodeEntities.removeAll()
        linkEntities.removeAll()

        for node in graph.nodes {
            let pos = simulation.nodes[node.id]?.position ?? .zero
            let nodeEntity = NodeEntity(node: node, position: pos)
            self.addChild(nodeEntity)
            nodeEntities[node.id] = nodeEntity
        }
    }

    /// Tick simulation step and update RealityKit 3D transforms.
    @MainActor
    public func stepSimulation() {
        simulation.tick(alpha: 0.1)

        // Update node positions
        for (id, nodeEntity) in nodeEntities {
            if let simNode = simulation.nodes[id] {
                nodeEntity.position = simNode.position
            }
        }

        // Update link cylinder transforms
        for link in simulation.links {
            guard let linkEntity = linkEntities[link.id],
                  let sourcePos = simulation.nodes[link.source]?.position,
                  let targetPos = simulation.nodes[link.target]?.position else { continue }

            linkEntity.updateTransformAndMesh(link: link, sourcePos: sourcePos, targetPos: targetPos)
        }
    }
}
