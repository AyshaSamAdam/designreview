import { describe, it, expect } from "vitest"
import express from "express"
import request from "supertest"
import { loginLimiter } from "../middleware/ratelimiter.js"

describe("login rate limit", () => {
    it("lets 5 tries through, then answers 429", async () => {
        const app = express()
        app.post("/login", loginLimiter, (_req, res) => res.json({ ok: true }))

        for (let i = 0; i < 5; i++) {
            const res = await request(app).post("/login")
            expect(res.status).toBe(200)
        }

        const blocked = await request(app).post("/login")
        expect(blocked.status).toBe(429)
        expect(blocked.body.error).toMatch(/too many/i)
    })
})