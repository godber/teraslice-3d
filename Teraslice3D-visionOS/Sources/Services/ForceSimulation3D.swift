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

    public var repulsionStrength: Float = 0.04
    public var springStrength: Float = 0.12
    public var idealLinkLength: Float = 0.22
    public var gravityStrength: Float = 0.03
    public var damping: Float = 0.85
    public var boundsHalfWidth: Float = 0.40 // Keeps entities within [-0.4m, 0.4m] inside 1m x 1m x 1m Volume

    public init() {}

    /// Setup simulation with a graph payload, distributing initial node positions evenly on a sphere.
    public func setup(graph: PipelineGraph) {
        nodes.removeAll()
        links = graph.links

        let count = Float(graph.nodes.count)
        for (index, node) in graph.nodes.enumerated() {
            // Fibonacci sphere distribution for uniform initial 3D spacing
            let phi = acos(1.0 - 2.0 * (Float(index) + 0.5) / max(count, 1.0))
            let theta = Float.pi * (1.0 + sqrt(5.0)) * Float(index)
            let radius: Float = 0.20

            let x = radius * sin(phi) * cos(theta)
            let y = radius * sin(phi) * sin(theta)
            let z = radius * cos(phi)

            nodes[node.id] = Node3D(id: node.id, position: SIMD3<Float>(x, y, z))
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

                let forceMagnitude = (repulsionStrength / (dist * dist)) * alpha
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

        // 5. Apply forces to update velocity, position, and enforce volume bounds
        for key in keys {
            guard var node = nodes[key] else { continue }

            node.velocity = (node.velocity + node.force) * damping
            node.position += node.velocity

            // Clamp inside volumetric bounding box [-boundsHalfWidth, boundsHalfWidth]
            node.position.x = simd_clamp(node.position.x, -boundsHalfWidth, boundsHalfWidth)
            node.position.y = simd_clamp(node.position.y, -boundsHalfWidth, boundsHalfWidth)
            node.position.z = simd_clamp(node.position.z, -boundsHalfWidth, boundsHalfWidth)

            nodes[key] = node
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
