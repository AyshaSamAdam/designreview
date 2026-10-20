import { describe, it, expect, vi, beforeEach } from "vitest"
import { askModelWithTools } from "../llm.js"
import { reviewAnswer, MAX_FOLLOW_UPS } from "../grader.js"

// Asli AI ki jagah nakli AI (jaise pehle askModel ke saath kiya tha)
vi.mock("../llm.js", () => ({ askModelWithTools: vi.fn() }))

const fakeAi = vi.mocked(askModelWithTools)

// Banawati scenario, box aur facts. Sirf wohi cheezein jo grader parhta hai.
const scenario = {
    title: "Cache goes down",
    trigger: "The cache stops responding.",
    strongAnswerCovers: ["Falls back to the database", "Protects the database from overload", "Alerts the team"],
    weakSigns: ["Says nothing would happen"],
    followUps: ["What happens to the database?"],
}
const box = { kind: "cache", label: "Redis", note: "" }
const baseInput = {
    box,
    scenario,
    facts: {},
    neighbours: { incoming: ["API"], outgoing: ["Database"] },
    turns: [],
    answer: "I put Redis in front of the database to cache popular links",
}

// Helper: chalao grader, kuch cheezein badal kar
const run = (overrides: Record<string, unknown> = {}) =>
    reviewAnswer({ ...baseInput, ...overrides } as unknown as Parameters<typeof reviewAnswer>[0])

// Helper: nakli AI ka "grade_box" form
const gradeForm = (form: Record<string, unknown>) => ({ name: "grade_box", input: form })

beforeEach(() => {
    fakeAi.mockReset()
    vi.spyOn(console, "warn").mockImplementation(() => {})
})

describe("reviewAnswer: grading", () => {
    it("keeps solid when the quote really is in the answer", async () => {
        fakeAi.mockResolvedValueOnce(
            gradeForm({ grade: "solid", covered: [1, 2], quotes: ["Redis in front of the database"], feedback: "Good detail." })
        )
        const result = await run()
        expect(result).toMatchObject({ kind: "graded", grade: "solid" })
        expect(result.kind === "graded" && result.evidence).toEqual(["Redis in front of the database"])
    })

    it("changes solid to partial when there is no quote", async () => {
        fakeAi.mockResolvedValueOnce(gradeForm({ grade: "solid", covered: [1], quotes: [], feedback: "Fine." }))
        const result = await run()
        expect(result).toMatchObject({ kind: "graded", grade: "partial" })
    })

    it("drops an invented quote, and then solid becomes partial", async () => {
        fakeAi.mockResolvedValueOnce(
            gradeForm({ grade: "solid", covered: [1], quotes: ["I use Kafka for everything"], feedback: "Fine." })
        )
        const result = await run()
        expect(result).toMatchObject({ kind: "graded", grade: "partial" })
        expect(result.kind === "graded" && result.evidence).toEqual([])
    })

    it("matches quotes even if capital letters or spaces are different", async () => {
        fakeAi.mockResolvedValueOnce(
            gradeForm({ grade: "solid", covered: [1], quotes: ["REDIS  in front of the DATABASE"], feedback: "Fine." })
        )
        const result = await run()
        expect(result.kind === "graded" && result.evidence.length).toBe(1)
    })

    it("ignores wrong or repeated covered numbers and lists what is missing", async () => {
        fakeAi.mockResolvedValueOnce(
            gradeForm({ grade: "partial", covered: [1, 1, 99, 0], quotes: [], feedback: "Some." })
        )
        const result = await run()
        expect(result.kind === "graded" && result.covered).toEqual(["Falls back to the database"])
        expect(result.kind === "graded" && result.missing).toEqual([
            "Protects the database from overload",
            "Alerts the team",
        ])
    })
})

describe("reviewAnswer: follow-ups", () => {
    it("returns a follow-up question when the AI asks one", async () => {
        fakeAi.mockResolvedValueOnce({ name: "ask_follow_up", input: { question: "  What happens to the database?  " } })
        const result = await run()
        expect(result).toEqual({ kind: "follow_up", question: "What happens to the database?" })
    })

    it("forces grading after the follow-up limit", async () => {
        // MAX_FOLLOW_UPS pichle jawab + ye naya jawab = limit se zyada
        const turns = Array.from({ length: MAX_FOLLOW_UPS }, () => ({ from: "you" as const, text: "some answer" }))
        fakeAi.mockResolvedValueOnce(gradeForm({ grade: "partial", covered: [], quotes: [], feedback: "Ok." }))
        await run({ turns })

        const toolsGiven = fakeAi.mock.calls[0][2]
        const forcedTool = fakeAi.mock.calls[0][3]
        expect(toolsGiven).toHaveLength(1) // sirf grade_box
        expect(forcedTool).toBe("grade_box")
    })

    it("fails if the AI asks a follow-up when it had to grade", async () => {
        fakeAi.mockResolvedValueOnce({ name: "ask_follow_up", input: { question: "One more?" } })
        await expect(run({ gradeNow: true })).rejects.toThrow("had to grade")
    })
})

describe("reviewAnswer: bad form from the AI", () => {
    it("tries once more when the form is invalid, then succeeds", async () => {
        fakeAi.mockResolvedValueOnce(gradeForm({ grade: "great", covered: [], quotes: [], feedback: "x" })) // ghalat
        fakeAi.mockResolvedValueOnce(gradeForm({ grade: "partial", covered: [], quotes: [], feedback: "Ok." })) // sahi
        const result = await run()
        expect(fakeAi).toHaveBeenCalledTimes(2)
        expect(result).toMatchObject({ kind: "graded", grade: "partial" })
    })

    it("gives up if the form is invalid twice", async () => {
        fakeAi.mockResolvedValue(gradeForm({ grade: "great", covered: [], quotes: [], feedback: "x" }))
        await expect(run()).rejects.toThrow()
        expect(fakeAi).toHaveBeenCalledTimes(2)
    })
})