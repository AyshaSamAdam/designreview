import { Router } from "express"
import { z } from "zod"
import { diagramInputSchema, buildGraph, findFacts, neighboursOf } from "../graph.js"
import { pickScenario } from "../pickScenario.js"
import { askInterviewer } from "../interviewer.js"

const router = Router()

const questionRequestSchema = z.object({
    diagram: diagramInputSchema,
    boxId: z.string(),
    level: z.enum(["foundation", "intermediate", "senior"]).optional(),
    asked: z.array(z.string().max(100)).max(50).optional(),
})

router.post("/question", async (req, res) => {
    const parsed = questionRequestSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request" })
    }
    const { diagram, boxId, level, asked } = parsed.data

    const graph = buildGraph(diagram)
    const box = graph.nodes.get(boxId)
    if (!box) {
        return res.status(404).json({ error: "Box not found in diagram" })
    }

    const scenario = pickScenario(box, { level, asked })
    if (!scenario) {
        return res.json({ done: true })
    }

    const facts = findFacts(graph)
    const neighbours = neighboursOf(graph, boxId)
    const question = await askInterviewer({ box, scenario, facts, neighbours })

    return res.json({ done: false, scenarioId: scenario.id, question, facts })
})

export default router