import { AsyncLocalStorage } from "node:async_hooks"

// A small backpack that travels with one request.
// The route puts the user's id in it, and llm.ts reads it later.
export const userContext = new AsyncLocalStorage<{ userId: string }>()