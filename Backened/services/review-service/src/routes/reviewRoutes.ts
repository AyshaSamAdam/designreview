import { Router, type Request, type Response, type NextFunction } from "express"
import { z } from "zod"
import prisma from "../db.js"
import { diagramInputSchema, buildGraph, findFacts, neighboursOf } from "../graph.js"
import { pickScenario } from "../pickScenario.js"
import { askInterviewer } from "../interviewer.js"
import { findScenario } from "../scenarios.js"
import { reviewAnswer } from "../grader.js"
import { checkDiagram } from "../rediness.js"
import { userContext } from "../requestContext.js"

const router = Router()

const MAX_AI_CALLS_PER_HOUR = 60

// All users together, last 24 hours. Protects the monthly AI budget once the app is public.
// Set MAX_AI_CALLS_PER_DAY in the environment to change it. Bad or missing values fall back to 200.
const MAX_AI_CALLS_PER_DAY = Number(process.env.MAX_AI_CALLS_PER_DAY) || 200

// A review that is not ended and was active in the last 2 hours is "in progress".
const ACTIVE_WINDOW_MS = 2 * 60 * 60 * 1000


const answeringNow = new Set<string>()


function isAlreadyExistsError(error: unknown): boolean {
    return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002"
}


// Every question or answer sent to the AI costs money.
// Count this user's calls from the last hour, and everyone's calls from the last day.
async function limitAiCalls(_req: Request, res: Response, next: NextFunction) {
    const userId = String(res.locals.userId)
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const [questions, answers, callsToday] = await Promise.all([
        prisma.interview.count({ where: { userId, createdAt: { gte: hourAgo } } }),
        prisma.message.count({ where: { author: "you", createdAt: { gte: hourAgo }, interview: { userId } } }),
        prisma.aiCall.count({ where: { createdAt: { gte: dayAgo } } }),
    ])

    if (callsToday >= MAX_AI_CALLS_PER_DAY) {
        return res.status(429).json({ error: "The AI interviewer has reached its daily limit. Please try again tomorrow." })
    }
    if (questions + answers >= MAX_AI_CALLS_PER_HOUR) {
        return res.status(429).json({ error: "You have reached the hourly limit. Please try again in a while." })
    }
    userContext.run({ userId }, next)
}

const roomSchema = z.object({ diagramId: z.string().min(1).max(100) })


const problemSchema = z.object({
    title: z.string().max(120),
    summary: z.string().max(600),
    functionalRequirements: z.array(z.string().max(200)).max(12),
    nonFunctionalRequirements: z.array(z.string().max(200)).max(12),
    scaleHints: z.array(z.string().max(200)).max(12),
})


function listBoxes(graph: ReturnType<typeof buildGraph>): string[] {
    return Array.from(graph.nodes.values()).map((n) => `${n.label || "(no name)"} [${n.kind}]`)
}

const questionRequestSchema = z.object({
    diagram: diagramInputSchema,
    diagramId: z.string().min(1).max(100).optional(),
    boxId: z.string(),
    reviewId: z.uuid(),
    level: z.enum(["foundation", "intermediate", "senior"]).optional(),
    asked: z.array(z.string().max(100)).max(50).optional(),
    problem : problemSchema.optional()
})

router.post("/question", limitAiCalls, async (req, res) => {
    const parsed = questionRequestSchema.safeParse(req.body)

    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request" })
    }
    const { diagram, diagramId, boxId, reviewId, level, asked , problem} = parsed.data

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
 

    // Before the first question: is there enough in the diagram to ask about?
    const readiness = await checkDiagram({
        graph,
        facts,
        box,
        problem,
        isFirstQuestion: (asked?.length ?? 0) === 0,
    })
    if (!readiness.ready) {
        return res.json({ notReady: true, message: readiness.message })
    }
    const neighbours = neighboursOf(graph, boxId)
    const allBoxes = listBoxes(graph)
    const question = await askInterviewer({ box, scenario, facts, neighbours, allBoxes, problem })

    const interview = await prisma.interview.create({
        data: {
            userId: String(res.locals.userId),
            diagramId,
            reviewId,
            boxId,
            boxLabel: box.label || "this box",
            scenarioId: scenario.id,
            messages: { create: { position: 1, author: "interviewer", body: question } },
        },
    })

    return res.json({ done: false, interviewId: interview.id, scenarioId: scenario.id, question, facts })
})

const answerRequestSchema = z.object({
    diagram: diagramInputSchema,
    interviewId: z.uuid(),
    answer: z.string().min(1).max(2000),
    gradeNow: z.boolean().optional(),
    problem : problemSchema.optional()
})

router.post("/answer", limitAiCalls, async (req, res) => {
    const parsed = answerRequestSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request" })
    }
    const { diagram, interviewId, answer, gradeNow, problem} = parsed.data

    // Same interview already being answered? Say so, before anything costs money.
    if (answeringNow.has(interviewId)) {
        return res.status(409).json({ error: "Your answer is already being checked. Please wait a moment." })
    }
    answeringNow.add(interviewId)

    try {
        // Find this chat in the copy. Only the owner's own chats are found.
        const interview = await prisma.interview.findFirst({
            where: { id: interviewId, userId: String(res.locals.userId) },
            include: { messages: { orderBy: { position: "asc" } } },
        })
        if (!interview) {
            return res.status(404).json({ error: "Interview not found" })
        }
        if (interview.grade) {
            return res.status(409).json({ error: "This interview is already graded" })
        }

        const graph = buildGraph(diagram)
        const box = graph.nodes.get(interview.boxId)
        if (!box) {
            return res.status(404).json({ error: "Box not found in diagram" })
        }

        const scenario = findScenario(interview.scenarioId)
        if (!scenario) {
            return res.status(404).json({ error: "Scenario not found" })
        }

        // The earlier lines come from the copy, not from the browser.
        const turns = interview.messages.map((m) => ({ from: m.author, text: m.body }))

        const result = await reviewAnswer({
            box,
            scenario,
            facts: findFacts(graph),
            neighbours: neighboursOf(graph, interview.boxId),
            turns,
            answer,
            gradeNow,
            allBoxes : listBoxes(graph),
            problem,
        })

        // Now write: her answer, and then either the next question or the grade.
        const next = interview.messages.length + 1
        if (result.kind === "follow_up") {
            await prisma.message.createMany({
                data: [
                    { interviewId, position: next, author: "you", body: answer },
                    { interviewId, position: next + 1, author: "interviewer", body: result.question },
                ],
            })
        } else {
            await prisma.$transaction([
                prisma.message.create({ data: { interviewId, position: next, author: "you", body: answer } }),
                prisma.interview.update({
                    where: { id: interviewId },
                    data: {
                        grade: result.grade,
                        feedback: result.feedback,
                        covered: result.covered,
                        missing: result.missing,
                        evidence: result.evidence,
                        finishedAt: new Date(),
                    },
                }),
            ])
        }

        return res.json(result)
    } catch (error) {
        // Saved twice by two requests at once: not a server fault.
        if (isAlreadyExistsError(error)) {
            return res.status(409).json({ error: "This answer was already saved." })
        }
        throw error
    } finally {
        // Always remove the "busy" note, even if something failed.
        answeringNow.delete(interviewId)
    }
})



// The review this person has in progress in this room, if any.
// The page asks this when it loads, so a refresh does not lose the chat.
router.get("/active", async (req, res) => {
    const query = roomSchema.safeParse(req.query)
    if (!query.success) {
        return res.status(400).json({ error: "Invalid request" })
    }
    const userId = String(res.locals.userId)
    const since = new Date(Date.now() - ACTIVE_WINDOW_MS)

    const latest = await prisma.interview.findFirst({
        where: { userId, diagramId: query.data.diagramId, endedAt: null, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        select: { reviewId: true },
    })
    if (!latest) {
        return res.json({ active: false })
    }

    const interviews = await prisma.interview.findMany({
        where: { userId, reviewId: latest.reviewId },
        orderBy: { createdAt: "asc" },
        include: { messages: { orderBy: { position: "asc" } } },
    })

    return res.json({ active: true, reviewId: latest.reviewId, interviews })
})

// The person pressed End review.
const endRequestSchema = z.object({ reviewId: z.uuid() })

router.post("/end", async (req, res) => {
    const parsed = endRequestSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request" })
    }

    await prisma.interview.updateMany({
        where: { reviewId: parsed.data.reviewId, userId: String(res.locals.userId), endedAt: null },
        data: { endedAt: new Date() },
    })

    return res.json({ ok: true })
})

// My past reviews: one entry per review (Start to End), newest first.
// Add ?diagramId=... to see only the reviews of one room.
router.get("/interviews", async (req, res) => {
    const query = roomSchema.partial().safeParse(req.query)
    if (!query.success) {
        return res.status(400).json({ error: "Invalid request" })
    }

    const rows = await prisma.interview.findMany({
        where: {
            userId: String(res.locals.userId),
            ...(query.data.diagramId ? { diagramId: query.data.diagramId } : {}),
            messages : {some : {author : "you"}}
        },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: { id: true, reviewId: true, reviewName : true, boxLabel: true, grade: true, createdAt: true },
    })

  const reviews = new Map<
        string,
        {
            reviewId: string
            at: Date
            name: string | null
            boxes: { interviewId: string; label: string; grade: string | null }[]
        }
    >()
    for (const row of rows) {
        const review = reviews.get(row.reviewId) ?? { reviewId: row.reviewId, at: row.createdAt, name: null, boxes: [] }
        review.name = review.name ?? row.reviewName
        review.boxes.unshift({ interviewId: row.id, label: row.boxLabel, grade: row.grade })
        reviews.set(row.reviewId, review)
    }

    return res.json({ reviews: [...reviews.values()] })
})

// The person gave a review a name (or cleared it with an empty name).
// This uses POST, like the other routes, so no extra browser rules are needed.
const renameRequestSchema = z.object({
    reviewId: z.uuid(),
    name: z.string().trim().max(60).nullable(),
})

router.post("/rename", async (req, res) => {
    const parsed = renameRequestSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request" })
    }
    const name = parsed.data.name === "" ? null : parsed.data.name

    const result = await prisma.interview.updateMany({
        where: { reviewId: parsed.data.reviewId, userId: String(res.locals.userId) },
        data: { reviewName: name },
    })
    if (result.count === 0) {
        return res.status(404).json({ error: "Review not found" })
    }

    return res.json({ ok: true, name })
})














// One past interview with all its lines. Only the owner can open it.
router.get("/interviews/:id", async (req, res) => {
    const id = z.uuid().safeParse(req.params.id)
    if (!id.success) {
        return res.status(400).json({ error: "Invalid request" })
    }

    const interview = await prisma.interview.findFirst({
        where: { id: id.data, userId: String(res.locals.userId) },
        include: { messages: { orderBy: { position: "asc" } } },
    })
    if (!interview) {
        return res.status(404).json({ error: "Interview not found" })
    }

    return res.json(interview)
})


// ---------- AI metrics: totals only, no user names, no text ----------

type KindRow = {
    kind: string
    calls: number
    failed: number
    avgMs: number
    p95Ms: number
    inputTokens: number
    outputTokens: number
}

function priceOf(name: string): number | null {
    const raw = process.env[name]
    if (!raw) return null
    const value = Number(raw)
    return Number.isFinite(value) ? value : null
}

// Dollars per million tokens come from the environment, so we never guess a price.
function costOf(inputTokens: number, outputTokens: number): number | null {
    const inPrice = priceOf("PRICE_INPUT_PER_MTOK")
    const outPrice = priceOf("PRICE_OUTPUT_PER_MTOK")
    if (inPrice === null || outPrice === null) return null
    return (inputTokens * inPrice + outputTokens * outPrice) / 1_000_000
}

router.get("/metrics", async (_req, res) => {
    const adminId = process.env.ADMIN_USER_ID
    if (!adminId || res.locals.userId !== adminId) {
        return res.status(404).json({error : 'Not Found'})

    }
    const days = 7
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [rows, gradeRows] = await Promise.all([
        prisma.$queryRaw<KindRow[]>`
            SELECT kind,
                   COUNT(*)::int AS calls,
                   (COUNT(*) FILTER (WHERE NOT ok))::int AS failed,
                   COALESCE(AVG(ms), 0)::float AS "avgMs",
                   COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY ms), 0)::float AS "p95Ms",
                   COALESCE(SUM("inputTokens"), 0)::float AS "inputTokens",
                   COALESCE(SUM("outputTokens"), 0)::float AS "outputTokens"
            FROM "AiCall"
            WHERE "createdAt" >= ${since}
            GROUP BY kind
            ORDER BY kind`,
        prisma.interview.groupBy({
            by: ["grade"],
            where: { grade: { not: null }, finishedAt: { gte: since } },
            _count: { _all: true },
        }),
    ])

    const byKind = rows.map((r) => ({ ...r, costUsd: costOf(r.inputTokens, r.outputTokens) }))

    const totals = byKind.reduce(
        (sum, r) => ({
            calls: sum.calls + r.calls,
            failed: sum.failed + r.failed,
            inputTokens: sum.inputTokens + r.inputTokens,
            outputTokens: sum.outputTokens + r.outputTokens,
        }),
        { calls: 0, failed: 0, inputTokens: 0, outputTokens: 0 }
    )
    const totalCost = costOf(totals.inputTokens, totals.outputTokens)

    const grades = { missed: 0, partial: 0, solid: 0 }
    for (const row of gradeRows) {
        if (row.grade) grades[row.grade] = row._count._all
    }
    const graded = grades.missed + grades.partial + grades.solid

    return res.json({
        windowDays: days,
        byKind,
        totals: { ...totals, costUsd: totalCost },
        reviews: { graded, grades },
        costPerGradedReviewUsd: totalCost !== null && graded > 0 ? totalCost / graded : null,
    })
})

export default router