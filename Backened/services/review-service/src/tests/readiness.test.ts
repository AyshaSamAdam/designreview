import { describe, it, expect, vi, beforeEach } from "vitest"

const ai = vi.hoisted(() => ({ ask: vi.fn() }))
vi.mock("../llm.js", () => ({ askModelWithTools: ai.ask }))

import { buildGraph, findFacts } from "../graph.js"
import { checkDiagram, findDiagramGap } from "../readiness.js"

type Box = { id: string; kind: string; label: string }

function design(nodes: Box[], edges: [string, string][]) {
    const graph = buildGraph({
        nodes: nodes.map((n) => ({ id: n.id, data: { kind: n.kind, label: n.label } })),
        edges: edges.map(([source, target]) => ({ source, target })),
    })
    return { graph, facts: findFacts(graph) }
}

const goodBoxes: Box[] = [
    { id: "lb", kind: "load_balancer", label: "Load Balancer" },
    { id: "api", kind: "service", label: "Chat API" },
    { id: "db", kind: "database", label: "Postgres" },
]
const goodEdges: [string, string][] = [
    ["lb", "api"],
    ["api", "db"],
]

const problem = {
    title: "Design a chat app",
    summary: "People send messages to each other.",
    functionalRequirements: ["send a message"],
    nonFunctionalRequirements: [],
    scaleHints: [],
}

beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, "warn").mockImplementation(() => {})
})

describe("findDiagramGap (free rules, no AI)", () => {
    it("lets a connected design with different kinds of boxes through", () => {
        const { graph, facts } = design(goodBoxes, goodEdges)
        expect(findDiagramGap(graph, facts)).toBeNull()
    })

    it("stops when no box has a name", () => {
        const { graph, facts } = design(
            goodBoxes.map((b) => ({ ...b, label: "" })),
            goodEdges
        )
        expect(findDiagramGap(graph, facts)).toMatch(/names/i)
    })

    it("stops when the diagram is only one kind of box, like databases", () => {
        const { graph, facts } = design(
            [
                { id: "a", kind: "database", label: "DB 1" },
                { id: "b", kind: "database", label: "DB 2" },
                { id: "c", kind: "database", label: "DB 3" },
            ],
            [
                ["a", "b"],
                ["b", "c"],
            ]
        )
        expect(findDiagramGap(graph, facts)).toMatch(/database/i)
    })

    it("does not stop a diagram that is only services, the AI judges that one", () => {
        const { graph, facts } = design(
            [
                { id: "a", kind: "service", label: "Auth" },
                { id: "b", kind: "service", label: "Orders" },
            ],
            [["a", "b"]]
        )
        expect(findDiagramGap(graph, facts)).toBeNull()
    })

    it("stops when no box is connected to any other", () => {
        const { graph, facts } = design(goodBoxes, [])
        expect(findDiagramGap(graph, facts)).toMatch(/connected/i)
    })
})

describe("checkDiagram", () => {
    const { graph, facts } = design(goodBoxes, goodEdges)
    const box = graph.nodes.get("api")!
    const base = { graph, facts, box, problem, isFirstQuestion: true }

    it("returns the free message and never calls the AI when a rule stops it", async () => {
        const empty = design(goodBoxes, [])
        const result = await checkDiagram({ ...base, graph: empty.graph, facts: empty.facts })
        expect(result.ready).toBe(false)
        expect(ai.ask).not.toHaveBeenCalled()
    })

    it("skips the AI after the first question", async () => {
        const result = await checkDiagram({ ...base, isFirstQuestion: false })
        expect(result).toEqual({ ready: true })
        expect(ai.ask).not.toHaveBeenCalled()
    })

    it("skips the AI when the problem is not known", async () => {
        const result = await checkDiagram({ ...base, problem: undefined })
        expect(result).toEqual({ ready: true })
        expect(ai.ask).not.toHaveBeenCalled()
    })

    it("returns the AI's message when it says the diagram is not ready", async () => {
        ai.ask.mockResolvedValue({
            name: "report_readiness",
            input: { ready: false, message: "I can't see where messages are stored yet." },
        })
        const result = await checkDiagram(base)
        expect(result).toEqual({ ready: false, message: "I can't see where messages are stored yet." })
    })

    it("is ready when the AI says so", async () => {
        ai.ask.mockResolvedValue({ name: "report_readiness", input: { ready: true, message: "" } })
        expect(await checkDiagram(base)).toEqual({ ready: true })
    })

    it("lets the review go on when the AI check breaks", async () => {
        ai.ask.mockRejectedValue(new Error("network down"))
        expect(await checkDiagram(base)).toEqual({ ready: true })
    })

    it("does not show our inside words to the person", async () => {
        ai.ask.mockResolvedValue({
            name: "report_readiness",
            input: { ready: false, message: "The candidate has not drawn the scenario." },
        })
        const result = await checkDiagram(base)
        expect(result.ready).toBe(false)
        if (!result.ready) expect(result.message).not.toMatch(/candidate|scenario/i)
    })
})