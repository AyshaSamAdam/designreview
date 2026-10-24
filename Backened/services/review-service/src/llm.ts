import Anthropic from "@anthropic-ai/sdk"
import prisma from "./db.js"
import { userContext } from "./requestContext.js"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const model = process.env.AI_MODEL || "claude-haiku-5-5"

// Writes one row about an AI call. It runs in the background, so it never slows
// the user down, and if saving fails we only print a warning.
function record(data: {
    kind: string
    ms: number
    inputTokens: number
    outputTokens: number
    ok: boolean
    error?: string
}) {
    if (process.env.SKIP_AI_TRACING === "1") return 
    prisma.aiCall.create({ data: { model, userId : userContext.getStore()?.userId, ...data } }).catch((err) => {
        console.warn("Could not save AiCall:", err.message)
    })
}

// Runs one AI call, measures how long it took, and records the result.
async function tracked(fallbackKind: string, call: () => Promise<Anthropic.Message>) {
    const started = Date.now()
    try {
        const response = await call()
        const tool = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
        record({
            kind: tool ? tool.name : fallbackKind,
            ms: Date.now() - started,
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            ok: true,
        })
        return response
    } catch (err) {
        record({
            kind: fallbackKind,
            ms: Date.now() - started,
            inputTokens: 0,
            outputTokens: 0,
            ok: false,
            error: (err instanceof Error ? err.message : String(err)).slice(0, 300),
        })
        throw err
    }
}

export async function askModel(system: string, user: string, maxTokens = 400): Promise<string> {
    const response = await tracked("text", () =>
        client.messages.create({
            model,
            max_tokens: maxTokens,
            system,
            thinking : {type : "disabled"},
            messages: [{ role: "user", content: user }],
        })
    )

    const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim()

    if (!text) {
        const types = response.content.map((block) => block.type).join(", ") || "none"
        throw new Error(`Model returned no text (stop_reason: ${response.stop_reason}, blocks: ${types})`)
    }

    return text
}

export type Tool = Anthropic.Tool

export async function askModelWithTools(
    system: string,
    user: string,
    tools: Tool[],
    forceTool: string | null,
    maxTokens = 800
): Promise<{ name: string; input: unknown }> {
    const response = await tracked("tools", () =>
        client.messages.create({
            model,
            max_tokens: maxTokens,
            system,
            messages: [{ role: "user", content: user }],
            tools,
            tool_choice: forceTool ? { type: "tool", name: forceTool } : { type: "any" },
        })
    )

    const block = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
    if (!block) {
        throw new Error(`Model used no tool (stop_reason: ${response.stop_reason})`)
    }
    return { name: block.name, input: block.input }
}