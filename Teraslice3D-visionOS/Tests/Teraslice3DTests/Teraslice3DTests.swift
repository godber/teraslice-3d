import XCTest
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
        sim.runSimulation(iterations: 50)

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
}

