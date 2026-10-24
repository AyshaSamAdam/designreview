import { describe, it, expect, vi, beforeEach } from "vitest"

const ai = vi.hoisted(() => ({ ask: vi.fn() }))
vi.mock("../llm.js", () => ({ askModelWithTools: ai.ask }))

import { reviewAnswer, findFeedbackProblem, findFollowUpProblem } from "../grader.js"

const scenario = {
    id: "s1",
    title: "Auth instance crashes",
    type: "system",
    level: "foundation",
    trigger: "One Auth instance crashes during a login.",
    strongAnswerCovers: ["a second instance behind the load balancer", "sessions kept outside the instance"],
    weakSigns: ["one instance, no failover"],
    expectedDiagramChange: "",
    followUps: [],
} as any

const base = {
    box: { id: "b1", kind: "service", label: "Auth service", note: "" },
    scenario,
    facts: { kindCounts: {}, isolated: [], singleInstanceKinds: [], loadBalancers: [] },
    neighbours: { incoming: [], outgoing: [] },
    turns: [],
    answer: "I would add a second instance behind the load balancer",
}

const gradeCall = (feedback: string) => ({
    name: "grade_box",
    input: { grade: "partial", covered: [1], quotes: ["second instance behind the load balancer"], feedback },
})
const followUpCall = (question: string) => ({ name: "ask_follow_up", input: { question } })

beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, "warn").mockImplementation(() => {})
})

describe("findFeedbackProblem", () => {
    it("accepts plain feedback written to the person", () => {
        expect(findFeedbackProblem("You already have a load balancer in front of it.")).toBeNull()
    })

    it("rejects our inside words, in any letter case", () => {
        expect(findFeedbackProblem("The candidate did not explain it.")).not.toBeNull()
        expect(findFeedbackProblem("This is named in the scenario.")).not.toBeNull()
        expect(findFeedbackProblem("That is the Weak Sign here.")).not.toBeNull()
    })
})

describe("findFollowUpProblem", () => {
    it("accepts one short question", () => {
        expect(findFollowUpProblem("What does the user see when it crashes?")).toBeNull()
    })

    it("accepts a short answer sentence followed by one question", () => {
        expect(findFollowUpProblem("You have one copy right now. What happens to a login then?")).toBeNull()
    })

    it("rejects a second request added after the question", () => {
        expect(findFollowUpProblem("What does the user see? Then tell me why you would add more.")).not.toBeNull()
    })

    it("rejects two question marks", () => {
        expect(findFollowUpProblem("What happens? And why?")).not.toBeNull()
    })

    it("rejects a very long question", () => {
        expect(findFollowUpProblem(`${"word ".repeat(50)}happens?`)).not.toBeNull()
    })

    it("rejects our inside words", () => {
        expect(findFollowUpProblem("Does the candidate know?")).not.toBeNull()
    })
})

describe("reviewAnswer writing rules", () => {
    it("asks again when the feedback uses our inside words, and keeps the clean second try", async () => {
        ai.ask
            .mockResolvedValueOnce(gradeCall("The candidate did not explain it."))
            .mockResolvedValueOnce(gradeCall("You added a second instance, but not where sessions live."))

        const result = await reviewAnswer({ ...base, gradeNow: true })

        expect(ai.ask).toHaveBeenCalledTimes(2)
        expect(result.kind).toBe("graded")
        if (result.kind === "graded") expect(result.feedback).toBe("You added a second instance, but not where sessions live.")
    })

    it("uses a plain line when the feedback breaks the rule twice", async () => {
        ai.ask.mockResolvedValue(gradeCall("The candidate did not explain it."))

        const result = await reviewAnswer({ ...base, gradeNow: true })

        expect(ai.ask).toHaveBeenCalledTimes(2)
        expect(result.kind).toBe("graded")
        if (result.kind === "graded") expect(result.feedback).not.toMatch(/candidate/i)
    })

    it("asks again when the follow-up is not one question", async () => {
        ai.ask
            .mockResolvedValueOnce(followUpCall("What happens? Then tell me why."))
            .mockResolvedValueOnce(followUpCall("What does the user see?"))

        const result = await reviewAnswer(base)

        expect(ai.ask).toHaveBeenCalledTimes(2)
        expect(result).toEqual({ kind: "follow_up", question: "What does the user see?" })
    })

    it("does not block the person when the follow-up is still not perfect on the second try", async () => {
        ai.ask.mockResolvedValue(followUpCall("What happens? Then tell me why."))

        const result = await reviewAnswer(base)

        expect(ai.ask).toHaveBeenCalledTimes(2)
        expect(result.kind).toBe("follow_up")
    })

    it("gives the AI the box names and the problem", async () => {
        ai.ask.mockResolvedValue(gradeCall("You added a second instance."))

        await reviewAnswer({
            ...base,
            gradeNow: true,
            allBoxes: ["Redis [cache]"],
            problem: {
                title: "Design a chat app",
                summary: "People send messages.",
                functionalRequirements: [],
                nonFunctionalRequirements: [],
                scaleHints: [],
            },
        })

        const userPrompt = String(ai.ask.mock.calls[0][1])
        expect(userPrompt).toContain("- Redis [cache]")
        expect(userPrompt).toContain("Design a chat app")
    })
})