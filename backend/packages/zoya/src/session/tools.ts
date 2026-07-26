import { type Tool as AITool } from "ai"
import { Effect } from "effect"

export const resolve = Effect.fn("SessionTools.resolve")(function* () {
  return {} as Record<string, AITool>
})

export * as SessionTools from "./tools"
