import { Effect } from "effect"
import type { Provider } from "@/provider/provider"
import type { Agent } from "@/agent/agent"
import type { SessionV1 } from "@zoya/core/v1/session"
import { LLM } from "./llm"
import { Session } from "./session"
import { Config } from "@/config/config"

export function runPipeline(input: {
  system: string[]
  messages: any[]
  model: Provider.Model
  sessionID: string
  mode: string
  step: number
  lastUser: SessionV1.User
  agent: Agent.Info
  assistantMessage: SessionV1.Assistant
  llm: LLM.Interface
  provider: Provider.Interface
  sessions: Session.Interface
  config: Config.Interface
}) {
  // Pipeline disabled - single model handles all replies
  return Effect.succeed({ finalModel: input.model, finalThinkingFile: undefined as string | undefined })
}

export * as Pipeline from "./pipeline"
