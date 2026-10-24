import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"
import request from "supertest"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

process.env.JWT_SECRET = "test-secret"
process.env.FRONTEND_URL = "http://front.test"

const db = vi.hoisted(() => ({
    user: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    refreshToken: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    passwordResetToken: { create: vi.fn(), findUnique: vi.fn(), deleteMany: vi.fn() },
}))
const mail = vi.hoisted(() => ({ send: vi.fn() }))
const google = vi.hoisted(() => ({ generateAuthUrl: vi.fn(), getToken: vi.fn(), verifyIdToken: vi.fn() }))

vi.mock("../db.js", () => ({ default: db }))
vi.mock("resend", () => ({
    Resend: class {
        emails = { send: mail.send }
    },
}))
vi.mock("../googleAuth.js", () => ({ googleClient: google }))
// The real limiter has its own test file. Here it would block us after 5 logins.
vi.mock("../middleware/ratelimiter.js", () => ({
    loginLimiter: (_req: any, _res: any, next: any) => next(),
}))

import app from "../app.js"

const user = {
    id: "u1",
    email: "ayesha@example.com",
    name: "Ayesha",
    passwordHash: "",
    failedLoginAttempts: 0,
    lockedUntil: null as Date | null,
    googleId: null as string | null,
    role: "user",
    createdAt: new Date(),
}

const token = jwt.sign({ userId: "u1", name: "Ayesha" }, "test-secret")
const asAyesha = { Authorization: `Bearer ${token}` }
const inFuture = () => new Date(Date.now() + 60 * 60 * 1000)
const inPast = () => new Date(Date.now() - 60 * 1000)
const cookiesOf = (res: { headers: Record<string, any> }) => (res.headers["set-cookie"] ?? []) as string[]

beforeAll(async () => {
    user.passwordHash = await bcrypt.hash("password123", 4)
})

beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, "log").mockImplementation(() => {})
})

describe("sign up", () => {
    const body = { email: "new@example.com", password: "password123", name: "New Person" }

    it("returns 400 for a short password", async () => {
        const res = await request(app).post("/auth/signup").send({ ...body, password: "short" })
        expect(res.status).toBe(400)
    })

    it("returns 400 for a bad email", async () => {
        const res = await request(app).post("/auth/signup").send({ ...body, email: "not-an-email" })
        expect(res.status).toBe(400)
    })

    it("saves a hash, never the password, and does not send the hash back", async () => {
        db.user.create.mockResolvedValue({ id: "u9", email: body.email, name: body.name })
        const res = await request(app).post("/auth/signup").send(body)
        expect(res.status).toBe(201)
        expect(res.body).toEqual({ id: "u9", email: body.email, name: body.name })

        const saved = db.user.create.mock.calls[0][0].data
        expect(saved.passwordHash).not.toBe(body.password)
        expect(saved.passwordHash).toMatch(/^\$2/)
    })

    it("returns 409 when the email is already used", async () => {
        db.user.create.mockRejectedValue({ code: "P2002" })
        const res = await request(app).post("/auth/signup").send(body)
        expect(res.status).toBe(409)
    })
})

describe("log in", () => {
    const good = { email: user.email, password: "password123" }

    it("returns 400 when the password is missing", async () => {
        const res = await request(app).post("/auth/login").send({ email: user.email })
        expect(res.status).toBe(400)
    })

    it("gives the same answer for an unknown email and a wrong password", async () => {
        db.user.findUnique.mockResolvedValueOnce(null)
        const unknown = await request(app).post("/auth/login").send({ email: "nobody@example.com", password: "whatever1" })

        db.user.findUnique.mockResolvedValueOnce({ ...user })
        const wrong = await request(app).post("/auth/login").send({ email: user.email, password: "wrong-password" })

        expect(unknown.status).toBe(401)
        expect(wrong.status).toBe(401)
        expect(unknown.body).toEqual(wrong.body)
    })

    it("counts a wrong password", async () => {
        db.user.findUnique.mockResolvedValue({ ...user })
        await request(app).post("/auth/login").send({ email: user.email, password: "wrong-password" })
        expect(db.user.update).toHaveBeenCalledWith({
            where: { id: "u1" },
            data: { failedLoginAttempts: 1, lockedUntil: null },
        })
    })

    it("locks the account on the 5th wrong password", async () => {
        db.user.findUnique.mockResolvedValue({ ...user, failedLoginAttempts: 4 })
        await request(app).post("/auth/login").send({ email: user.email, password: "wrong-password" })
        expect(db.user.update).toHaveBeenCalledWith({
            where: { id: "u1" },
            data: { failedLoginAttempts: 5, lockedUntil: expect.any(Date) },
        })
    })

    it("returns 423 for a locked account, even with the right password", async () => {
        db.user.findUnique.mockResolvedValue({ ...user, lockedUntil: inFuture() })
        const res = await request(app).post("/auth/login").send(good)
        expect(res.status).toBe(423)
        expect(db.user.update).not.toHaveBeenCalled()
    })

    it("logs in with the right password: resets the counter and sets safe cookies", async () => {
        db.user.findUnique.mockResolvedValue({ ...user, failedLoginAttempts: 3 })
        const res = await request(app).post("/auth/login").send(good)

        expect(res.status).toBe(200)
        expect(res.body).toEqual({ user: { id: "u1", email: user.email, name: "Ayesha" } })
        expect(db.user.update).toHaveBeenCalledWith({
            where: { id: "u1" },
            data: { failedLoginAttempts: 0, lockedUntil: null },
        })
        expect(db.refreshToken.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "u1" }) })

        const access = cookiesOf(res).find((c) => c.startsWith("access_token="))!
        expect(access).toContain("HttpOnly")
        const payload = jwt.verify(access.split(";")[0].split("=")[1], "test-secret") as jwt.JwtPayload
        expect(payload).toMatchObject({ userId: "u1", name: "Ayesha" })
        expect(cookiesOf(res).some((c) => c.startsWith("refresh_token="))).toBe(true)
    })
})

describe("refresh and log out", () => {
    it("returns 401 when there is no refresh token", async () => {
        const res = await request(app).post("/auth/refresh")
        expect(res.status).toBe(401)
    })

    it("returns 401 and clears the cookies for an unknown token", async () => {
        db.refreshToken.findUnique.mockResolvedValue(null)
        const res = await request(app).post("/auth/refresh").set("Cookie", "refresh_token=nope")
        expect(res.status).toBe(401)
        expect(cookiesOf(res).some((c) => c.startsWith("access_token=;"))).toBe(true)
    })

    it("returns 401 for an expired token", async () => {
        db.refreshToken.findUnique.mockResolvedValue({ id: 5, token: "old", userId: "u1", expiresAt: inPast() })
        const res = await request(app).post("/auth/refresh").set("Cookie", "refresh_token=old")
        expect(res.status).toBe(401)
    })

    it("swaps the old refresh token for a new one", async () => {
        db.refreshToken.findUnique.mockResolvedValue({ id: 5, token: "old", userId: "u1", expiresAt: inFuture() })
        db.user.findUnique.mockResolvedValue({ id: "u1", name: "Ayesha" })
        const res = await request(app).post("/auth/refresh").set("Cookie", "refresh_token=old")
        expect(res.status).toBe(200)
        expect(db.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 5 } })
        expect(db.refreshToken.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "u1" }) })
    })

    it("logging out deletes the refresh token and clears the cookies", async () => {
        const res = await request(app).post("/auth/logout").set("Cookie", "refresh_token=abc")
        expect(res.status).toBe(200)
        expect(db.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { token: "abc" } })
        expect(cookiesOf(res).some((c) => c.startsWith("refresh_token=;"))).toBe(true)
    })
})

describe("profile", () => {
    it("needs a login", async () => {
        const res = await request(app).get("/auth/me")
        expect(res.status).toBe(401)
    })

    it("rejects a token that is not ours", async () => {
        const res = await request(app).get("/auth/me").set({ Authorization: "Bearer nonsense" })
        expect(res.status).toBe(401)
    })

    it("returns my profile and never asks for the password hash", async () => {
        db.user.findUnique.mockResolvedValue({ id: "u1", email: user.email, name: "Ayesha", createdAt: "x" })
        const res = await request(app).get("/auth/me").set(asAyesha)
        expect(res.status).toBe(200)

        const call = db.user.findUnique.mock.calls[0][0]
        expect(call.where).toEqual({ id: "u1" })
        expect(call.select).not.toHaveProperty("passwordHash")
    })

    it("returns 404 when the user is gone", async () => {
        db.user.findUnique.mockResolvedValue(null)
        const res = await request(app).get("/auth/me").set(asAyesha)
        expect(res.status).toBe(404)
    })

    it("returns 400 for an empty name", async () => {
        const res = await request(app).patch("/auth/me").set(asAyesha).send({ name: "" })
        expect(res.status).toBe(400)
    })

    it("changes only my own name", async () => {
        db.user.update.mockResolvedValue({ id: "u1", email: user.email, name: "New", createdAt: "x" })
        const res = await request(app).patch("/auth/me").set(asAyesha).send({ name: "New" })
        expect(res.status).toBe(200)
        expect(db.user.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: "u1" }, data: { name: "New" } })
        )
    })
})

describe("admin list", () => {
    it("needs a login", async () => {
        const res = await request(app).get("/auth/admin/users")
        expect(res.status).toBe(401)
    })

    it("returns 403 for a normal user", async () => {
        db.user.findUnique.mockResolvedValue({ role: "user" })
        const res = await request(app).get("/auth/admin/users").set(asAyesha)
        expect(res.status).toBe(403)
        expect(db.user.findMany).not.toHaveBeenCalled()
    })

    it("lists users for an admin, without password hashes", async () => {
        db.user.findUnique.mockResolvedValue({ role: "admin" })
        db.user.findMany.mockResolvedValue([])
        const res = await request(app).get("/auth/admin/users").set(asAyesha)
        expect(res.status).toBe(200)
        expect(db.user.findMany.mock.calls[0][0].select).not.toHaveProperty("passwordHash")
    })
})

describe("forgot and reset password", () => {
    it("gives the same answer whether the email exists or not, and only emails real users", async () => {
        db.user.findUnique.mockResolvedValueOnce(null)
        const unknown = await request(app).post("/auth/forgot-password").send({ email: "nobody@example.com" })
        expect(mail.send).not.toHaveBeenCalled()

        db.user.findUnique.mockResolvedValueOnce({ ...user })
        mail.send.mockResolvedValue({})
        const known = await request(app).post("/auth/forgot-password").send({ email: user.email })

        expect(unknown.status).toBe(200)
        expect(known.status).toBe(200)
        expect(unknown.body).toEqual(known.body)
        expect(mail.send).toHaveBeenCalledTimes(1)
    })

    it("replaces old reset tokens and emails the new link to the user", async () => {
        db.user.findUnique.mockResolvedValue({ ...user })
        mail.send.mockResolvedValue({})
        await request(app).post("/auth/forgot-password").send({ email: user.email })

        expect(db.passwordResetToken.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } })
        const saved = db.passwordResetToken.create.mock.calls[0][0].data
        expect(saved.token).toMatch(/^[a-f0-9]{64}$/)

        const email = mail.send.mock.calls[0][0]
        expect(email.to).toBe(user.email)
        expect(email.html).toContain(saved.token)
    })

    const reset = { token: "t", newPassword: "newpassword123" }

    it("returns 400 for a short new password", async () => {
        const res = await request(app).post("/auth/reset-password").send({ ...reset, newPassword: "short" })
        expect(res.status).toBe(400)
    })

    it("returns 400 for an unknown token", async () => {
        db.passwordResetToken.findUnique.mockResolvedValue(null)
        const res = await request(app).post("/auth/reset-password").send(reset)
        expect(res.status).toBe(400)
        expect(db.user.update).not.toHaveBeenCalled()
    })

    it("returns 400 for an expired token", async () => {
        db.passwordResetToken.findUnique.mockResolvedValue({ userId: "u1", expiresAt: inPast() })
        const res = await request(app).post("/auth/reset-password").send(reset)
        expect(res.status).toBe(400)
        expect(db.user.update).not.toHaveBeenCalled()
    })

    it("saves a new hash, uses up the token, and logs the user out everywhere", async () => {
        db.passwordResetToken.findUnique.mockResolvedValue({ userId: "u1", expiresAt: inFuture() })
        const res = await request(app).post("/auth/reset-password").send(reset)
        expect(res.status).toBe(200)

        const saved = db.user.update.mock.calls[0][0].data
        expect(saved.passwordHash).not.toBe(reset.newPassword)
        expect(saved.passwordHash).toMatch(/^\$2/)
        expect(db.passwordResetToken.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } })
        expect(db.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } })
    })
})

describe("Google login", () => {
    const failed = "http://front.test/sign-in?error=google_failed"

    function googleSays(payload: Record<string, unknown>) {
        google.getToken.mockResolvedValue({ tokens: { id_token: "idtoken" } })
        google.verifyIdToken.mockResolvedValue({ getPayload: () => payload })
    }

    it("sends the person to Google with a secret state saved in a cookie", async () => {
        google.generateAuthUrl.mockReturnValue("https://accounts.example/login")
        const res = await request(app).get("/auth/google")
        expect(res.status).toBe(302)
        expect(res.headers.location).toBe("https://accounts.example/login")

        const state = google.generateAuthUrl.mock.calls[0][0].state
        expect(state).toMatch(/^[a-f0-9]{64}$/)
        expect(cookiesOf(res).join(";")).toContain(`oauth_state=${state}`)
    })

    it("sends the person back with an error when the state does not match", async () => {
        const res = await request(app)
            .get("/auth/google/callback")
            .set("Cookie", "oauth_state=saved")
            .query({ code: "c", state: "other" })
        expect(res.headers.location).toBe(failed)
        expect(google.getToken).not.toHaveBeenCalled()
    })

    it("refuses a Google email that is not verified", async () => {
        googleSays({ email: "a@example.com", email_verified: false, name: "A", sub: "g1" })
        const res = await request(app)
            .get("/auth/google/callback")
            .set("Cookie", "oauth_state=s")
            .query({ code: "c", state: "s" })
        expect(res.headers.location).toBe(failed)
        expect(db.user.create).not.toHaveBeenCalled()
    })

    it("creates a new user, logs them in and sends them to the dashboard", async () => {
        googleSays({ email: "new@example.com", email_verified: true, name: "New Person", sub: "g-123" })
        db.user.findUnique.mockResolvedValue(null)
        db.user.create.mockResolvedValue({ id: "u2", name: "New Person" })

        const res = await request(app)
            .get("/auth/google/callback")
            .set("Cookie", "oauth_state=s")
            .query({ code: "c", state: "s" })

        expect(res.headers.location).toBe("http://front.test/dashboard")
        expect(db.user.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ email: "new@example.com", googleId: "g-123" }),
        })
        expect(cookiesOf(res).some((c) => c.startsWith("access_token="))).toBe(true)
    })

    it("links Google to an existing account instead of making a second one", async () => {
        googleSays({ email: user.email, email_verified: true, name: "Ayesha", sub: "g-123" })
        db.user.findUnique.mockResolvedValue({ ...user })
        db.user.update.mockResolvedValue({ ...user, googleId: "g-123" })

        const res = await request(app)
            .get("/auth/google/callback")
            .set("Cookie", "oauth_state=s")
            .query({ code: "c", state: "s" })

        expect(res.headers.location).toBe("http://front.test/dashboard")
        expect(db.user.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { googleId: "g-123" } })
        expect(db.user.create).not.toHaveBeenCalled()
    })
})