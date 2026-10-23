import { describe, it, expect, vi, beforeEach } from "vitest"
import request from "supertest"

const db = vi.hoisted(() => ({
    interview: {
        count: vi.fn(),
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        updateMany: vi.fn(),
        update: vi.fn(),
    },
    message: { count: vi.fn(), create: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn(),
    aiCall : {count : vi.fn()}
}))

const fakes = vi.hoisted(() => ({
    buildGraph: vi.fn(),
    findFacts: vi.fn(),
    neighboursOf: vi.fn(),
    pickScenario: vi.fn(),
    findScenario: vi.fn(),
    askInterviewer: vi.fn(),
    reviewAnswer: vi.fn(),
}))

vi.mock("../db.js", () => ({ default: db }))


vi.mock("../requireAuth.js", () => ({
    requireAuth: (req: any, res: any, next: any) => {
        const user = req.header("x-test-user")
        if (!user) return res.status(401).json({ error: "login required" })
        res.locals.userId = user
        next()
    },
}))

vi.mock("../graph.js", async () => {
    const { z } = await import("zod")
    return {
        diagramInputSchema: z.any(),
        buildGraph: fakes.buildGraph,
        findFacts: fakes.findFacts,
        neighboursOf: fakes.neighboursOf,
    }
})
vi.mock("../pickScenario.js", () => ({ pickScenario: fakes.pickScenario }))
vi.mock("../scenarios.js", () => ({ findScenario: fakes.findScenario }))
vi.mock("../interviewer.js", () => ({ askInterviewer: fakes.askInterviewer }))
vi.mock("../grader.js", () => ({ reviewAnswer: fakes.reviewAnswer }))

import app from "../app.js"

const ID = "11111111-1111-4111-8111-111111111111"
const diagram = { nodes: [], edges: [] }
const asAyesha = { "x-test-user": "ayesha" }

const ungradedInterview = {
    id: ID,
    userId: "ayesha",
    boxId: "box1",
    scenarioId: "s1",
    grade: null,
    messages: [{ author: "interviewer", body: "What happens?", position: 1 }],
}

beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})

    db.interview.count.mockResolvedValue(0)
    db.message.count.mockResolvedValue(0)
    db.aiCall.count.mockResolvedValue(0)
    fakes.buildGraph.mockReturnValue({ nodes: new Map([["box1", { kind: "cache", label: "Redis", note: "" }]]) })
    fakes.findFacts.mockReturnValue({})
    fakes.neighboursOf.mockReturnValue({ incoming: [], outgoing: [] })
    fakes.pickScenario.mockReturnValue({ id: "s1" })
    fakes.findScenario.mockReturnValue({ id: "s1" })
    fakes.askInterviewer.mockResolvedValue("What happens when it fails?")
})


describe("login", () => {
    it("blocks review routes when not logged in", async () => {
        const res = await request(app).get("/review/interviews")
        expect(res.status).toBe(401)
    })

    it("lets /health through without login", async () => {
        const res = await request(app).get("/health")
        expect(res.status).toBe(200)
    })
})

describe("POST /review/question", () => {
    const body = { diagram, boxId: "box1", reviewId: ID, diagramId: "room1" }

    it("returns 400 when the body is invalid", async () => {
        const res = await request(app).post("/review/question").set(asAyesha).send({ boxId: "box1" })
        expect(res.status).toBe(400)
    })

    it("returns 429 after the hourly limit, and never calls the AI", async () => {
        db.interview.count.mockResolvedValue(40)
        db.message.count.mockResolvedValue(20) // 40 + 20 = 60
        const res = await request(app).post("/review/question").set(asAyesha).send(body)
        expect(res.status).toBe(429)
        expect(fakes.askInterviewer).not.toHaveBeenCalled()
    })
    it("returns 429 when the daily limit for all users is reached, and never calls the AI", async () => {
        db.aiCall.count.mockResolvedValue(200)
        const res = await request(app).post("/review/question").set(asAyesha).send(body)
        expect(res.status).toBe(429)
        expect(fakes.askInterviewer).not.toHaveBeenCalled()
    })

    it("returns 404 when the box is not in the diagram", async () => {
        fakes.buildGraph.mockReturnValue({ nodes: new Map() })
        const res = await request(app).post("/review/question").set(asAyesha).send(body)
        expect(res.status).toBe(404)
    })

    it("returns done:true and saves nothing when no scenario is left", async () => {
        fakes.pickScenario.mockReturnValue(null)
        const res = await request(app).post("/review/question").set(asAyesha).send(body)
        expect(res.body).toEqual({ done: true })
        expect(db.interview.create).not.toHaveBeenCalled()
    })

    it("saves the interview for the logged-in user and returns the question", async () => {
        db.interview.create.mockResolvedValue({ id: ID })
        const res = await request(app).post("/review/question").set(asAyesha).send(body)
        expect(res.status).toBe(200)
        expect(res.body.question).toBe("What happens when it fails?")
        expect(db.interview.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ userId: "ayesha", boxId: "box1", diagramId: "room1" }),
            })
        )
    })
})

// ---------- POST /review/answer ----------
describe("POST /review/answer", () => {
    const body = { diagram, interviewId: ID, answer: "I would add a cache." }

    it("returns 400 for an empty answer", async () => {
        const res = await request(app).post("/review/answer").set(asAyesha).send({ ...body, answer: "" })
        expect(res.status).toBe(400)
    })

    it("returns 404 for someone else's interview, because we only search the owner's", async () => {
        db.interview.findFirst.mockResolvedValue(null)
        const res = await request(app).post("/review/answer").set(asAyesha).send(body)
        expect(res.status).toBe(404)
        expect(db.interview.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: ID, userId: "ayesha" } })
        )
    })

    it("returns 409 when the interview is already graded, and never calls the grader", async () => {
        db.interview.findFirst.mockResolvedValue({ ...ungradedInterview, grade: "solid" })
        const res = await request(app).post("/review/answer").set(asAyesha).send(body)
        expect(res.status).toBe(409)
        expect(fakes.reviewAnswer).not.toHaveBeenCalled()
    })

    it("returns 409 (not 500) when the database says this answer was already saved", async () => {
        db.interview.findFirst.mockResolvedValue(ungradedInterview)
        fakes.reviewAnswer.mockResolvedValue({ kind: "follow_up", question: "And then?" })
        // This is what Prisma throws when two requests save the same line.
        db.message.createMany.mockRejectedValue({ code: "P2002" })

        const res = await request(app).post("/review/answer").set(asAyesha).send(body)

        expect(res.status).toBe(409)
    })

    it("returns 409 for a second answer while the first is still being checked, and calls the AI only once", async () => {
        db.interview.findFirst.mockResolvedValue(ungradedInterview)

       
        let finishThinking: (value: unknown) => void = () => {}
        fakes.reviewAnswer.mockImplementation(
            () => new Promise((resolve) => { finishThinking = resolve })
        )

        
        const first = request(app).post("/review/answer").set(asAyesha).send(body).then((r) => r)
        await vi.waitFor(() => expect(fakes.reviewAnswer).toHaveBeenCalledTimes(1))

        const second = await request(app).post("/review/answer").set(asAyesha).send(body)
        expect(second.status).toBe(409)
        expect(fakes.reviewAnswer).toHaveBeenCalledTimes(1)

        // Let the first one finish. It should still work normally.
        finishThinking({ kind: "follow_up", question: "And then?" })
        const firstResult = await first
        expect(firstResult.status).toBe(200)
    })

    it("saves the answer and the next question on a follow-up", async () => {
        db.interview.findFirst.mockResolvedValue(ungradedInterview)
        fakes.reviewAnswer.mockResolvedValue({ kind: "follow_up", question: "And then?" })
        const res = await request(app).post("/review/answer").set(asAyesha).send(body)
        expect(res.body).toEqual({ kind: "follow_up", question: "And then?" })
        expect(db.message.createMany).toHaveBeenCalledTimes(1)
        expect(db.$transaction).not.toHaveBeenCalled()
    })

    it("saves the grade in one transaction when graded", async () => {
        db.interview.findFirst.mockResolvedValue(ungradedInterview)
        db.$transaction.mockResolvedValue([])
        fakes.reviewAnswer.mockResolvedValue({
            kind: "graded",
            grade: "partial",
            feedback: "Ok.",
            evidence: [],
            covered: [],
            missing: [],
        })
        const res = await request(app).post("/review/answer").set(asAyesha).send(body)
        expect(res.body.grade).toBe("partial")
        expect(db.$transaction).toHaveBeenCalledTimes(1)
        expect(db.message.createMany).not.toHaveBeenCalled()
    })
})
describe("other review routes", () => {
    it("GET /active says active:false when there is no review in progress", async () => {
        db.interview.findFirst.mockResolvedValue(null)
        const res = await request(app).get("/review/active?diagramId=room1").set(asAyesha)
        expect(res.body).toEqual({ active: false })
    })

    it("GET /active returns 400 without a diagramId", async () => {
        const res = await request(app).get("/review/active").set(asAyesha)
        expect(res.status).toBe(400)
    })

    it("POST /end only touches the logged-in user's review", async () => {
        db.interview.updateMany.mockResolvedValue({ count: 1 })
        const res = await request(app).post("/review/end").set(asAyesha).send({ reviewId: ID })
        expect(res.body).toEqual({ ok: true })
        expect(db.interview.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ reviewId: ID, userId: "ayesha" }) })
        )
    })

    it("POST /rename returns 404 when nothing matched (not your review)", async () => {
        db.interview.updateMany.mockResolvedValue({ count: 0 })
        const res = await request(app).post("/review/rename").set(asAyesha).send({ reviewId: ID, name: "My review" })
        expect(res.status).toBe(404)
    })

    it("POST /rename turns an empty name into null", async () => {
        db.interview.updateMany.mockResolvedValue({ count: 2 })
        const res = await request(app).post("/review/rename").set(asAyesha).send({ reviewId: ID, name: "   " })
        expect(res.body).toEqual({ ok: true, name: null })
    })

    it("GET /interviews/:id returns 400 for a bad id and 404 for someone else's", async () => {
        const bad = await request(app).get("/review/interviews/not-an-id").set(asAyesha)
        expect(bad.status).toBe(400)

        db.interview.findFirst.mockResolvedValue(null)
        const other = await request(app).get(`/review/interviews/${ID}`).set(asAyesha)
        expect(other.status).toBe(404)
    })
})