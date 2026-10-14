import { z } from "zod"
import { library } from "./scenarios.js"

const nodeSchema = z.object({
    id: z.string(),
    data: z
        .object({
            kind: z.string().max(40).optional(),
            label: z.string().max(100).optional(),
            note: z.string().max(300).optional(),
        })
        .optional(),
})

const edgeSchema = z.object({
    source: z.string(),
    target: z.string(),
})

export const diagramInputSchema = z.object({
    nodes: z.array(nodeSchema).max(300),
    edges: z.array(edgeSchema).max(1000),
})

export type DiagramInput = z.infer<typeof diagramInputSchema>

export type GraphNode = { id: string; kind: string; label: string; note: string }

export type Graph = {
    // these make three empty tables 
   //  keys are sring and vlaues are graph Nodes 
    nodes: Map<string, GraphNode>
    outgoing: Map<string, string[]>
    incoming: Map<string, string[]>
}

export function buildGraph(diagram: DiagramInput): Graph {
    const nodes = new Map<string, GraphNode>()
    const outgoing = new Map<string, string[]>()
    const incoming = new Map<string, string[]>()

    for (const node of diagram.nodes) {
        const rawKind = node.data?.kind
        const kind =
            typeof rawKind === "string" &&
            Object.prototype.hasOwnProperty.call(library.roles, rawKind)
                ? rawKind
                : "unknown"

        nodes.set(node.id, {
            id: node.id,
            kind,
            label: node.data?.label ?? "",
            note: node.data?.note ?? "",
        })
        outgoing.set(node.id, [])
        incoming.set(node.id, [])
    }

    for (const edge of diagram.edges) {
        if (!nodes.has(edge.source) || !nodes.has(edge.target)) continue  // this line means if either end of the arrow points at a box taht doesnt exist skip this arrow and go to the next one A broken diagram cant crash us 
        outgoing.get(edge.source)?.push(edge.target)
        incoming.get(edge.target)?.push(edge.source)
    }

    return { nodes, outgoing, incoming }
}
    

export type Facts = {
    kindCounts: Record<string, number>
    isolated: string[]
    singleInstanceKinds: string[]
    loadBalancers: { label: string; downstream: number }[]
}

const CRITICAL_KINDS = ["service", "database", "cache", "queue", "load_balancer"]

export function findFacts(graph: Graph): Facts {
    const kindCounts: Record<string, number> = {}
    const isolated: string[] = []
    const loadBalancers: { label: string; downstream: number }[] = []

    for (const node of graph.nodes.values()) {
        kindCounts[node.kind] = (kindCounts[node.kind] ?? 0) + 1

        const outCount = graph.outgoing.get(node.id)?.length ?? 0
        const inCount = graph.incoming.get(node.id)?.length ?? 0
        const name = node.label || node.id

        if (outCount + inCount === 0) isolated.push(name)
        if (node.kind === "load_balancer") loadBalancers.push({ label: name, downstream: outCount })
    }

    const singleInstanceKinds = CRITICAL_KINDS.filter((kind) => kindCounts[kind] === 1)

    return { kindCounts, isolated, singleInstanceKinds, loadBalancers }
}


export function neighboursOf(graph: Graph, id: string) {
    const toLabels = (ids: string[] | undefined) =>
        (ids ?? []).map((otherId) => graph.nodes.get(otherId)?.label || otherId)

    return {
        incoming: toLabels(graph.incoming.get(id)),
        outgoing: toLabels(graph.outgoing.get(id)),
    }
}