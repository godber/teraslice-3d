import XCTest
import simd
@testable import Teraslice3D

final class Teraslice3DTests: XCTestCase {

    func testMockGraphProviderData() {
        let graph = MockGraphProvider.samplePipelineGraph()
        XCTAssertGreaterThan(graph.nodes.count, 0, "Mock graph should contain nodes")
        XCTAssertGreaterThan(graph.links.count, 0, "Mock graph should contain links")

        let kafkaIncoming = graph.nodes.first { $0.isIncoming }
        XCTAssertNotNil(kafkaIncoming, "Should identify incoming Kafka nodes")
    }

    func testAPIClientMockFallback() async {
        let client = TerasliceAPIClient()
        let mockConfig = ServerConfig.mockDataServer

        let result = await client.fetchPipelineGraph(serverConfig: mockConfig)
        switch result {
        case .success(let graph):
            XCTAssertGreaterThan(graph.nodes.count, 0)
        case .failure(let err):
            XCTFail("Fetching mock graph should not fail: \(err)")
        }
    }

    func testJobDetailsStatusParsing() throws {
        let json = """
        {
            "job_id": "test-123",
            "name": "Test Job",
            "workers": 5,
            "ex": {
                "_status": "running"
            }
        }
        """.data(using: .utf8)!

        let job = try JSONDecoder().decode(JobDetails.self, from: json)
        XCTAssertEqual(job.job_id, "test-123")
        XCTAssertEqual(job.workers, 5)
        XCTAssertEqual(job.status, .running)
    }

    func testForceSimulationSetupAndTicks() {
        let graph = MockGraphProvider.samplePipelineGraph()
        let sim = ForceSimulation3D()
        sim.setup(graph: graph)

        XCTAssertEqual(sim.nodes.count, graph.nodes.count, "Simulation should populate node dictionary")
        XCTAssertEqual(sim.links.count, graph.links.count, "Simulation should store link list")

        // Run simulation ticks
        sim.runSimulation(iterations: 120)

        for (id, node) in sim.nodes {
            XCTAssertFalse(node.position.x.isNaN, "Node \(id) position X should be valid number")
            XCTAssertFalse(node.position.y.isNaN, "Node \(id) position Y should be valid number")
            XCTAssertFalse(node.position.z.isNaN, "Node \(id) position Z should be valid number")
        }
    }

    func testForceSimulationBounds() {
        let graph = MockGraphProvider.samplePipelineGraph()
        let sim = ForceSimulation3D()
        sim.boundsHalfWidth = 0.40
        sim.setup(graph: graph)

        sim.runSimulation(iterations: 100)

        for (id, node) in sim.nodes {
            XCTAssertLessThanOrEqual(abs(node.position.x), 0.40 + 0.001, "Node \(id) X out of bounds")
            XCTAssertLessThanOrEqual(abs(node.position.y), 0.40 + 0.001, "Node \(id) Y out of bounds")
            XCTAssertLessThanOrEqual(abs(node.position.z), 0.40 + 0.001, "Node \(id) Z out of bounds")
        }
    }

    func testForceSimulationFitToVolume() {
        let graph = MockGraphProvider.samplePipelineGraph()
        let sim = ForceSimulation3D()
        sim.setup(graph: graph)
        sim.runSimulation(iterations: 120)

        // Verify fitToVolume centers graph at (0,0,0) and limits max node distance to target half-width
        sim.fitToVolume(targetHalfWidth: 0.25)

        var minPos = SIMD3<Float>(repeating: Float.greatestFiniteMagnitude)
        var maxPos = SIMD3<Float>(repeating: -Float.greatestFiniteMagnitude)

        for node in sim.nodes.values {
            minPos = simd_min(minPos, node.position)
            maxPos = simd_max(maxPos, node.position)
        }

        let center = (minPos + maxPos) * 0.5
        XCTAssertLessThan(simd_length(center), 0.001, "Graph center should be at (0,0,0)")

        for (id, node) in sim.nodes {
            XCTAssertLessThanOrEqual(abs(node.position.x), 0.25 + 0.001, "Node \(id) X should fit target half width")
            XCTAssertLessThanOrEqual(abs(node.position.y), 0.25 + 0.001, "Node \(id) Y should fit target half width")
            XCTAssertLessThanOrEqual(abs(node.position.z), 0.25 + 0.001, "Node \(id) Z should fit target half width")
        }
    }

    func testVolumetricProjectionCenteringAndScaling() {
        let graph = MockGraphProvider.samplePipelineGraph()
        let sim = ForceSimulation3D()
        sim.setup(graph: graph)
        sim.runSimulation(iterations: 120)

        let projection = VolumetricProjection(nodes: Array(sim.nodes.values), targetVolumeSpan: 0.70)

        var projectedMin = SIMD3<Float>(repeating: Float.greatestFiniteMagnitude)
        var projectedMax = SIMD3<Float>(repeating: -Float.greatestFiniteMagnitude)

        for simNode in sim.nodes.values {
            let p = projection.project(simNode.position)
            projectedMin = simd_min(projectedMin, p)
            projectedMax = simd_max(projectedMax, p)

            XCTAssertLessThanOrEqual(abs(p.x), 0.35 + 0.001, "Projected X must fit within [-0.35m, +0.35m]")
            XCTAssertLessThanOrEqual(abs(p.y), 0.35 + 0.001, "Projected Y must fit within [-0.35m, +0.35m]")
            XCTAssertLessThanOrEqual(abs(p.z), 0.35 + 0.001, "Projected Z must fit within [-0.35m, +0.35m]")
        }

        let projectedCenter = (projectedMin + projectedMax) * 0.5
        XCTAssertLessThan(simd_length(projectedCenter), 0.001, "Projected graph centroid should be centered at (0,0,0)")
    }

    func testForceSimulationReconciliationPreservesPositions() {
        let graph1 = MockGraphProvider.samplePipelineGraph()
        let sim = ForceSimulation3D()
        sim.setup(graph: graph1)
        sim.runSimulation(iterations: 50)

        guard let initialNode1Pos = sim.nodes["data_generator"]?.position else {
            XCTFail("Node data_generator missing")
            return
        }

        // Re-setup simulation with updated graph (topology refresh)
        let graph2 = MockGraphProvider.samplePipelineGraph()
        sim.setup(graph: graph2)

        let reconciledPos = sim.nodes["data_generator"]?.position
        let reconciledVel = sim.nodes["data_generator"]?.velocity

        XCTAssertEqual(initialNode1Pos, reconciledPos, "Reconciliation must preserve existing node position")
        XCTAssertEqual(reconciledVel, SIMD3<Float>.zero, "Reconciliation must zero velocity momentum")
    }

    func testAdaptiveGeometryScaling() {
        let projection = VolumetricProjection(nodes: [
            Node3D(id: "1", position: SIMD3<Float>(-5, 0, 0)),
            Node3D(id: "2", position: SIMD3<Float>(5, 0, 0))
        ], targetVolumeSpan: 0.70)

        let linkSmall = GraphLink(source: "1", target: "2", job_id: "j1", name: "Job 1", workers: 1, status: "running")
        let linkLarge = GraphLink(source: "1", target: "2", job_id: "j2", name: "Job 2", workers: 200, status: "running")

        let wSmall = Float(linkSmall.workers)
        let wLarge = Float(linkLarge.workers)

        let wScaleSmall: Float = ((wSmall - 1.0) / 199.0) * 19.0 + 1.0
        let wScaleLarge: Float = ((wLarge - 1.0) / 199.0) * 19.0 + 1.0

        let basePipe: Float = 0.005
        let radiusSmall = simd_clamp(basePipe * wScaleSmall * projection.scale, 0.002, 0.015)
        let radiusLarge = simd_clamp(basePipe * wScaleLarge * projection.scale, 0.002, 0.015)

        XCTAssertGreaterThan(radiusLarge, radiusSmall, "Higher worker count must produce thicker pipe radius")
        XCTAssertGreaterThanOrEqual(radiusSmall, 0.002)
        XCTAssertLessThanOrEqual(radiusLarge, 0.015)
    }
}

