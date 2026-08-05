import Foundation
import simd

/// A 3D Node point with position, velocity, and force vectors for RealityKit spatial layout.
public struct Node3D: Identifiable, Sendable {
    public let id: String
    public var position: SIMD3<Float>
    public var velocity: SIMD3<Float>
    public var force: SIMD3<Float>

    public init(id: String, position: SIMD3<Float> = .zero) {
        self.id = id
        self.position = position
        self.velocity = .zero
        self.force = .zero
    }
}

/// Pure Swift 3D Force-Directed Layout Simulation engine for spatial graph rendering in RealityKit.
public final class ForceSimulation3D: @unchecked Sendable {
    public private(set) var nodes: [String: Node3D] = [:]
    public var links: [GraphLink] = []

    public var repulsionStrength: Float = 50.0
    public var springStrength: Float = 0.10
    public var idealLinkLength: Float = 1.50
    public var gravityStrength: Float = 0.05
    public var damping: Float = 0.85
    public var boundsHalfWidth: Float? = nil // Unitless simulation space; volume clipping performed dynamically during spatial projection

    public init() {}

    /// Setup simulation with a graph payload, reconciling existing node positions and zeroing momentum.
    public func setup(graph: PipelineGraph) {
        let previousNodes = nodes
        nodes.removeAll()
        links = graph.links

        let count = Float(graph.nodes.count)
        for (index, node) in graph.nodes.enumerated() {
            if let existingNode = previousNodes[node.id] {
                // Topology reconciliation: preserve existing 3D position and reset velocity to zero
                nodes[node.id] = Node3D(id: node.id, position: existingNode.position)
            } else {
                // Fibonacci sphere distribution for uniform initial 3D spacing in abstract space
                let phi = acos(1.0 - 2.0 * (Float(index) + 0.5) / max(count, 1.0))
                let theta = Float.pi * (1.0 + sqrt(5.0)) * Float(index)
                let radius: Float = 2.0

                let x = radius * sin(phi) * cos(theta)
                let y = radius * sin(phi) * sin(theta)
                let z = radius * cos(phi)

                nodes[node.id] = Node3D(id: node.id, position: SIMD3<Float>(x, y, z))
            }
        }
    }

    /// Single simulation tick updating node forces, velocities, and positions.
    public func tick(alpha: Float = 1.0) {
        let keys = Array(nodes.keys)
        
        // 1. Reset forces
        for key in keys {
            nodes[key]?.force = .zero
        }

        // 2. Coulomb Node Repulsion
        for i in 0..<keys.count {
            for j in (i + 1)..<keys.count {
                let idA = keys[i]
                let idB = keys[j]
                guard let nodeA = nodes[idA], let nodeB = nodes[idB] else { continue }

                var delta = nodeA.position - nodeB.position
                var dist = simd_length(delta)
                if dist < 0.001 {
                    delta = SIMD3<Float>(
                        Float.random(in: -0.01...0.01),
                        Float.random(in: -0.01...0.01),
                        Float.random(in: -0.01...0.01)
                    )
                    dist = simd_length(delta)
                }

                let distSq = max(0.01, dist * dist)
                let forceMagnitude = (repulsionStrength / distSq) * alpha
                let forceVec = simd_normalize(delta) * forceMagnitude

                nodes[idA]?.force += forceVec
                nodes[idB]?.force -= forceVec
            }
        }

        // 3. Hooke Link Attraction
        for link in links {
            guard let nodeSource = nodes[link.source], let nodeTarget = nodes[link.target] else { continue }

            let delta = nodeTarget.position - nodeSource.position
            let dist = simd_length(delta)
            guard dist > 0.0001 else { continue }

            let displacement = dist - idealLinkLength
            let forceMagnitude = springStrength * displacement * alpha
            let forceVec = simd_normalize(delta) * forceMagnitude

            nodes[link.source]?.force += forceVec
            nodes[link.target]?.force -= forceVec
        }

        // 4. Gravity towards Center (0, 0, 0)
        for key in keys {
            guard let node = nodes[key] else { continue }
            let dist = simd_length(node.position)
            if dist > 0.001 {
                let gravityVec = -simd_normalize(node.position) * (gravityStrength * dist) * alpha
                nodes[key]?.force += gravityVec
            }
        }

        // 5. Apply forces to update velocity, position, and optional volume bounds
        for key in keys {
            guard var node = nodes[key] else { continue }

            node.velocity = (node.velocity + node.force) * damping
            node.position += node.velocity

            if let bounds = boundsHalfWidth {
                node.position.x = simd_clamp(node.position.x, -bounds, bounds)
                node.position.y = simd_clamp(node.position.y, -bounds, bounds)
                node.position.z = simd_clamp(node.position.z, -bounds, bounds)
            }

            nodes[key] = node
        }
    }

    /// Dynamically centers graph at origin (0,0,0) and scales node positions to fit within target volumetric bounds.
    public func fitToVolume(targetHalfWidth: Float = 0.25) {
        guard !nodes.isEmpty else { return }

        var minPos = SIMD3<Float>(repeating: Float.greatestFiniteMagnitude)
        var maxPos = SIMD3<Float>(repeating: -Float.greatestFiniteMagnitude)

        for node in nodes.values {
            minPos = simd_min(minPos, node.position)
            maxPos = simd_max(maxPos, node.position)
        }

        let center = (minPos + maxPos) * 0.5
        let extent = maxPos - minPos
        let maxExtent = max(extent.x, max(extent.y, extent.z))

        guard maxExtent > 0.0001 else { return }

        let targetSpan = targetHalfWidth * 2.0
        let scale = targetSpan / maxExtent

        for (id, var node) in nodes {
            node.position = (node.position - center) * scale
            nodes[id] = node
        }
    }

    /// Run full simulation iterations until equilibrium.
    public func runSimulation(iterations: Int = 120) {
        for i in 0..<iterations {
            let alpha = max(0.01, 1.0 - (Float(i) / Float(iterations)))
            tick(alpha: alpha)
        }
    }
}
