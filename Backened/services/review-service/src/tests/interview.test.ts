import { describe, it, expect, vi, beforeEach } from "vitest"
import { askModel } from "../llm.js"
import { askInterviewer, findProblem } from "../interviewer.js"

// vi( makes fake )
// 


//   askModel                calls the real AI
//  askInterviewer              asks teh AI for a  question 
//  find Problem                  checks the question foollows the rules 


// Swapping the real ai for a pretend  one 
// READ IT AS ANYONE WHO ASKS OF RTHE FILE LLM.JS SHOULD GET A TOY VERSION . IN THE TOY VERSION ASKmODEL IS A VI.FIN() A FAKE FUNCTIONA  PRETEND FUNCTION THAT DOES NOTHINGA ND REMEMBERS EVERY CALL 

// STORY
// the teacher (askInterviewer) will phone the student (askModel) we secretly swapped teh real phone for  a toy phone. The teacher doesnt know .



vi.mock("../llm.js", () => ({ askModel: vi.fn() }))



// A tiny made-up design, just enough for the function to run.
const input = {
    box: { id: "b", kind: "database", label: "Postgres", note: "" },
    scenario: {
        id: "s",
        title: "Primary dies",
        trigger: "The database server goes down.",
        strongAnswerCovers: ["A replica exists"],
    },
    facts: {},
    neighbours: { incoming: ["API"], outgoing: [] },
} as unknown as Parameters<typeof askInterviewer>[0]  // as unknown as part tells typescript "trust me this has the right shape, because we skipped  fields that the test doesnt use "


//    vi.mocked()  only tells typescript this is a pretened function it does nothing when code runs 
const fakeAi = vi.mocked(askModel)

// this runs before each test  
beforeEach(() => {
    fakeAi.mockReset()   // clear the pretend studnets notebook an dthe answers we gave them , so test 2 doesnt see leftovers from test 1 
    vi.spyOn(console, "warn").mockImplementation(() => {}) // when the code\ true sto print a  warning do nothing  Without it your test screen fills with "Interviewer question rejected" messgaes. Its liek putting a tape over  a doorbell 
})



//  TESTS FOR (FINDpROBLEM) RULES  ONLY NO AI AT ALL 

describe("findProblem", () => {
    it("accepts a normal single question", () => {
        expect(findProblem("What happens to the next write?")).toBeNull()  //  RETURNS NULL  WHEN THE TEXT LIKE findProblem(TEXT) OR  AREASON (A SENTENCE) WHEN IT BREAKS A  RULE IT WILL RETURN NULL  TOBENULL() MEANS I EXPECT NO PROBLEM  FOUND 
    })

    it("accepts a question written as a statement (no question mark)", () => {
        expect(findProblem("Say your Redis restarts. What do users see.")).toBeNull()
    })

    it("rejects exam-style wording like walk me through", () => {
        expect(findProblem("Walk me through what happens to the next write.")).toContain("walk me through")
    })

    it("rejects a question that is too long", () => {
        const longQuestion = "What happens " + "to the data ".repeat(20) + "when it fails?"
        expect(findProblem(longQuestion)).toContain("too long")
    })
    
    it("rejects two question marks", () => {
        expect(findProblem("What fails? And what then?")).toContain("2 question marks")
    })

    it("rejects hint phrases", () => {
        expect(findProblem("For example, what if the disk is full?")).toContain("for example")
    })
    it("rejects the words you could", () => {
        const result = findProblem("You could add a cache.What do you think?")
        expect(result).toContain("you could")
    })
})




//  WE TELL THE PRETNED STUDNET (AI MODEL) TO ANSWER LIEK WE MAKE TEH ANSWERS LIEK WHAT HAPPENS WHEN THE CACHE FAILS
describe("askInterviewer", () => {
    it("returns a good first question without asking again", async () => {
        fakeAi.mockResolvedValueOnce("What happens to the next write?")

        const question = await askInterviewer(input)

        expect(question).toBe("What happens to the next write?")
        expect(fakeAi).toHaveBeenCalledTimes(1)
    })

    it("asks again once when the first question breaks a rule, and says why", async () => {
        fakeAi.mockResolvedValueOnce("What fails? And what then?")
        fakeAi.mockResolvedValueOnce("What happens to the next write?")

        const question = await askInterviewer(input)

        expect(question).toBe("What happens to the next write?")
        expect(fakeAi).toHaveBeenCalledTimes(2)
        const secondPrompt = fakeAi.mock.calls[1][1]
        expect(secondPrompt).toContain("rejected because")
    })

    it("gives up after one retry and uses the second question anyway", async () => {
        fakeAi.mockResolvedValueOnce("What fails? And what then?")
        fakeAi.mockResolvedValueOnce("What breaks? And why?")

        const question = await askInterviewer(input)

        expect(question).toBe("What breaks? And why?")
        expect(fakeAi).toHaveBeenCalledTimes(2)
    })

    it("throws when the AI returns nothing", async () => {
        fakeAi.mockResolvedValueOnce("   ")

        await expect(askInterviewer(input)).rejects.toThrow("empty question")
    })
})