import { describe, it, expect, vi, beforeEach } from "vitest"
import request from "supertest"
import jwt from "jsonwebtoken"
import crypto from "node:crypto"

process.env.JWT_SECRET = "test-secret"

const db = vi.hoisted(() => ({
    diagram: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    diagramCollaborator: { findUnique: vi.fn(), upsert: vi.fn() },
    diagramInvite: { create: vi.fn(), findFirst: vi.fn() },
}))
const cache = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), del: vi.fn() }))

vi.mock("../db.js", () => ({ default: db }))
vi.mock("../redis.js", () => ({ default: cache }))
vi.mock("@prisma/client", () => ({ Prisma: {} }))
vi.mock("../data/prompts.js", () => ({
    prompts: [{ id: "url-shortener", title: "Design a URL shortener", difficulty: "easy" }],
}))

import app from "../app.js"

const ID = "11111111-1111-4111-8111-111111111111"
const token = jwt.sign({ userId: "ayesha" }, "test-secret")
const asAyesha = { Authorization: `Bearer ${token}` }

const mine = { id: ID, userId: "ayesha", title: "My design", nodes: [], edges: [], isPublic: false, promptId: null }
const bobs = { ...mine, userId: "bob" }

beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})

    cache.get.mockResolvedValue(null)
    cache.set.mockResolvedValue("OK")
    cache.del.mockResolvedValue(1)
    db.diagramCollaborator.findUnique.mockResolvedValue(null)
})

describe("login", () => {
    it("blocks diagram routes when not logged in", async () => {
        const res = await request(app).get("/diagrams")
        expect(res.status).toBe(401)
    })

    it("blocks a token that was not signed with our secret", async () => {
        const fake = jwt.sign({ userId: "ayesha" }, "some-other-secret")
        const res = await request(app).get("/diagrams").set({ Authorization: `Bearer ${fake}` })
        expect(res.status).toBe(401)
    })
})

describe("POST /diagrams", () => {
    const body = { title: "My design", nodes: [], edges: [] }

    it("returns 400 for an empty title", async () => {
        const res = await request(app).post("/diagrams").set(asAyesha).send({ ...body, title: "  " })
        expect(res.status).toBe(400)
    })

    it("returns 400 for a problem that does not exist", async () => {
        const res = await request(app).post("/diagrams").set(asAyesha).send({ ...body, promptId: "nope" })
        expect(res.status).toBe(400)
        expect(db.diagram.create).not.toHaveBeenCalled()
    })

    it("saves the diagram for the logged-in user", async () => {
        db.diagram.create.mockResolvedValue(mine)
        const res = await request(app).post("/diagrams").set(asAyesha).send({ ...body, promptId: "url-shortener" })
        expect(res.status).toBe(201)
        expect(db.diagram.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ userId: "ayesha", promptId: "url-shortener" }),
        })
    })
})

describe("GET /diagrams", () => {
    it("lists only my diagrams and adds the problem's title", async () => {
        db.diagram.findMany.mockResolvedValue([{ id: ID, title: "My design", promptId: "url-shortener" }])
        db.diagram.count.mockResolvedValue(1)
        const res = await request(app).get("/diagrams").set(asAyesha)
        expect(db.diagram.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "ayesha" } }))
        expect(res.body.diagrams[0].prompt).toEqual({ title: "Design a URL shortener", difficulty: "easy" })
    })

    it("never returns more than 50 at a time", async () => {
        db.diagram.findMany.mockResolvedValue([])
        db.diagram.count.mockResolvedValue(0)
        await request(app).get("/diagrams?limit=500").set(asAyesha)
        expect(db.diagram.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 50 }))
    })
})

describe("GET /diagrams/:id", () => {
    it("returns 403 for someone who is neither the owner nor a guest", async () => {
        db.diagram.findUnique.mockResolvedValue(bobs)
        const res = await request(app).get(`/diagrams/${ID}`).set(asAyesha)
        expect(res.status).toBe(403)
        expect(cache.set).not.toHaveBeenCalled()
    })

    it("lets a guest open it", async () => {
        db.diagram.findUnique.mockResolvedValue(bobs)
        db.diagramCollaborator.findUnique.mockResolvedValue({ id: 1 })
        const res = await request(app).get(`/diagrams/${ID}`).set(asAyesha)
        expect(res.status).toBe(200)
    })

    it("keeps a copy in the cache for 5 minutes", async () => {
        db.diagram.findUnique.mockResolvedValue(mine)
        await request(app).get(`/diagrams/${ID}`).set(asAyesha)
        expect(cache.set).toHaveBeenCalledWith(`diagram:${ID}`, expect.any(String), "EX", 300)
    })

    it("uses the cache and does not ask the database", async () => {
        cache.get.mockResolvedValue(JSON.stringify(mine))
        const res = await request(app).get(`/diagrams/${ID}`).set(asAyesha)
        expect(res.status).toBe(200)
        expect(db.diagram.findUnique).not.toHaveBeenCalled()
    })

    it("still checks access when the answer comes from the cache", async () => {
        cache.get.mockResolvedValue(JSON.stringify(bobs))
        const res = await request(app).get(`/diagrams/${ID}`).set(asAyesha)
        expect(res.status).toBe(403)
    })

    it("still works when Redis is down", async () => {
        cache.get.mockRejectedValue(new Error("Redis is down"))
        cache.set.mockRejectedValue(new Error("Redis is down"))
        db.diagram.findUnique.mockResolvedValue(mine)
        const res = await request(app).get(`/diagrams/${ID}`).set(asAyesha)
        expect(res.status).toBe(200)
    })
})

describe("PATCH /diagrams/:id", () => {
    it("lets a guest change the boxes but not the name", async () => {
        db.diagram.findUnique.mockResolvedValue(bobs)
        db.diagramCollaborator.findUnique.mockResolvedValue({ id: 1 })
        const res = await request(app).patch(`/diagrams/${ID}`).set(asAyesha).send({ title: "New name" })
        expect(res.status).toBe(403)
        expect(db.diagram.update).not.toHaveBeenCalled()
    })

    it("saves the change and clears the cache", async () => {
        db.diagram.findUnique.mockResolvedValue(mine)
        db.diagram.update.mockResolvedValue(mine)
        const res = await request(app).patch(`/diagrams/${ID}`).set(asAyesha).send({ nodes: [] })
        expect(res.status).toBe(200)
        expect(cache.del).toHaveBeenCalledWith(`diagram:${ID}`)
    })
})

describe("publish, public link and delete", () => {
    it("only the owner can make a diagram public", async () => {
        db.diagram.findUnique.mockResolvedValue(bobs)
        const res = await request(app).patch(`/diagrams/${ID}/publish`).set(asAyesha)
        expect(res.status).toBe(403)
        expect(db.diagram.update).not.toHaveBeenCalled()
    })

    it("shows a public diagram without login, and hides the isPublic flag", async () => {
        db.diagram.findUnique.mockResolvedValue({ id: ID, title: "Hi", nodes: [], edges: [], isPublic: true, createdAt: "x" })
        const res = await request(app).get(`/diagrams/public/${ID}`)
        expect(res.status).toBe(200)
        expect(res.body).not.toHaveProperty("isPublic")
    })

    it("returns 404 for a diagram that is not public", async () => {
        db.diagram.findUnique.mockResolvedValue({ id: ID, title: "Hi", nodes: [], edges: [], isPublic: false, createdAt: "x" })
        const res = await request(app).get(`/diagrams/public/${ID}`)
        expect(res.status).toBe(404)
    })

    it("only the owner can delete, and nothing is deleted for others", async () => {
        db.diagram.findUnique.mockResolvedValue(bobs)
        const res = await request(app).delete(`/diagrams/${ID}`).set(asAyesha)
        expect(res.status).toBe(403)
        expect(db.diagram.delete).not.toHaveBeenCalled()
    })

    it("deletes my diagram and clears the cache", async () => {
        db.diagram.findUnique.mockResolvedValue(mine)
        const res = await request(app).delete(`/diagrams/${ID}`).set(asAyesha)
        expect(res.status).toBe(204)
        expect(db.diagram.delete).toHaveBeenCalledWith({ where: { id: ID } })
        expect(cache.del).toHaveBeenCalledWith(`diagram:${ID}`)
    })
})

describe("invites", () => {
    it("only the owner can make an invite", async () => {
        db.diagram.findFirst.mockResolvedValue(null)
        const res = await request(app).post(`/diagrams/${ID}/invites`).set(asAyesha)
        expect(res.status).toBe(404)
        expect(db.diagram.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: ID, userId: "ayesha" } }))
    })

    it("gives the person the token but stores only its hash", async () => {
        db.diagram.findFirst.mockResolvedValue({ id: ID })
        db.diagramInvite.create.mockResolvedValue({})
        const res = await request(app).post(`/diagrams/${ID}/invites`).set(asAyesha)
        expect(res.status).toBe(201)
        expect(res.body.token).toMatch(/^[a-f0-9]{64}$/)

        const saved = db.diagramInvite.create.mock.calls[0][0].data
        expect(saved.tokenHash).toBe(crypto.createHash("sha256").update(res.body.token).digest("hex"))
        expect(saved.tokenHash).not.toBe(res.body.token)
    })

    it("returns 404 for a token in the wrong shape, without asking the database", async () => {
        const res = await request(app).post("/diagrams/invites/accept").set(asAyesha).send({ token: "abc" })
        expect(res.status).toBe(404)
        expect(db.diagramInvite.findFirst).not.toHaveBeenCalled()
    })

    it("returns 404 for an invite that is unknown or expired", async () => {
        db.diagramInvite.findFirst.mockResolvedValue(null)
        const res = await request(app).post("/diagrams/invites/accept").set(asAyesha).send({ token: "a".repeat(64) })
        expect(res.status).toBe(404)
    })

    it("adds me as a guest when the invite is good", async () => {
        db.diagramInvite.findFirst.mockResolvedValue({ diagramId: ID, diagram: { userId: "bob" } })
        const res = await request(app).post("/diagrams/invites/accept").set(asAyesha).send({ token: "a".repeat(64) })
        expect(res.status).toBe(200)
        expect(res.body).toEqual({ diagramId: ID })
        expect(db.diagramCollaborator.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ where: { diagramId_userId: { diagramId: ID, userId: "ayesha" } } })
        )
    })

    it("does not add the owner as a guest of their own diagram", async () => {
        db.diagramInvite.findFirst.mockResolvedValue({ diagramId: ID, diagram: { userId: "ayesha" } })
        const res = await request(app).post("/diagrams/invites/accept").set(asAyesha).send({ token: "a".repeat(64) })
        expect(res.status).toBe(200)
        expect(db.diagramCollaborator.upsert).not.toHaveBeenCalled()
    })
})

describe("GET /diagrams/shared", () => {
    it("lists diagrams where I am a guest", async () => {
        db.diagram.findMany.mockResolvedValue([])
        db.diagram.count.mockResolvedValue(0)
        const res = await request(app).get("/diagrams/shared").set(asAyesha)
        expect(res.status).toBe(200)
        expect(db.diagram.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { collaborators: { some: { userId: "ayesha" } } } })
        )
    })
})