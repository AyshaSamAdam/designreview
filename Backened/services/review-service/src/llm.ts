import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const model = process.env.AI_MODEL || "claude-haiku-5-5"

export async function askModel(system: string, user: string, maxTokens = 400): Promise<string> {
    const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
    })

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