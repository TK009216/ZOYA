import { Effect, Context } from "effect"
import { SessionV1 } from "@zoya/core/v1/session"
import { SessionID, MessageID } from "./schema"
import { Session } from "./session"
import { ConfigV1 } from "@zoya/core/v1/config/config"

export interface PriorityContext {
  codeBlocks: string[]
  fileChanges: string[]
  taskProgress: string[]
  userPreferences: string[]
  recentTopics: string[]
  greetings: string[]
}

export interface ContextWindowResult {
  critical: PriorityContext
  keepMessages: SessionV1.WithParts[]
  summarizedOlder: { fromIndex: number; toIndex: number; summary: string }[]
  semanticResults: { sessionID: string; relevance: number; snippet: string }[]
}

export interface Interface {
  readonly analyzeContext: (input: {
    messages: SessionV1.WithParts[]
    sessionID: SessionID
  }) => Effect.Effect<PriorityContext>
  readonly buildWindow: (input: {
    messages: SessionV1.WithParts[]
    sessionID: SessionID
    modelLimit: number
  }) => Effect.Effect<ContextWindowResult>
  readonly queryRelevant: (input: {
    sessionID: SessionID
    query: string
    limit?: number
  }) => Effect.Effect<{ sessionID: string; relevance: number; snippet: string }[]>
  readonly getProjectFiles: (input: {
    sessionID: SessionID
  }) => Effect.Effect<string[]>
}

export class Service extends Context.Service<Service, Interface>()("@zoya/ContextWindow") {}

export const layer = Effect.gen(function* () {
  const sessions = yield* Session.Service

  const analyzeContext = Effect.fn("ContextWindow.analyzeContext")(function* (input: {
    messages: SessionV1.WithParts[]
    sessionID: SessionID
  }) {
    const codeBlocks: string[] = []
    const fileChanges: string[] = []
    const taskProgress: string[] = []
    const userPreferences: string[] = []
    const recentTopics: string[] = []
    const greetings: string[] = []

    for (const msg of input.messages) {
      if (msg.info.summary) continue
      for (const part of msg.parts) {
        if (part.type === "text") {
          const text = part.text
          if (text.includes("```")) codeBlocks.push(text)
          if (text.match(/(created|modified|deleted|renamed)\s+\S+/i)) fileChanges.push(text)
          if (text.match(/(task|step|progress|done|complete)/i)) taskProgress.push(text.substring(0, 200))
          if (text.match(/(prefer|like|dislike|want|need|pattern)/i)) userPreferences.push(text.substring(0, 200))
          if (text.match(/^(hi|hello|hey|salam|good\s+(morning|afternoon|evening))/i)) greetings.push(text)
        }
      }
      if (msg.info.role === "user") {
        const text = msg.parts.filter((p) => p.type === "text").map((p) => (p as SessionV1.TextPart).text).join(" ")
        if (text && text.length > 20) recentTopics.push(text.substring(0, 150))
      }
    }

    return {
      codeBlocks: codeBlocks.slice(-5),
      fileChanges: fileChanges.slice(-3),
      taskProgress: taskProgress.slice(-3),
      userPreferences: userPreferences.slice(-3),
      recentTopics: recentTopics.slice(-5),
      greetings: greetings.slice(-1),
    } satisfies PriorityContext
  })

  const buildWindow = Effect.fn("ContextWindow.buildWindow")(function* (input: {
    messages: SessionV1.WithParts[]
    sessionID: SessionID
    modelLimit: number
  }) {
    const SLIDING_WINDOW = 10
    const summarizedOlder: { fromIndex: number; toIndex: number; summary: string }[] = []
    const MAX_AGE = Math.min(SLIDING_WINDOW, Math.floor(input.modelLimit / 1000))

    let keepMessages: SessionV1.WithParts[]
    if (input.messages.length > MAX_AGE) {
      const compactStart = input.messages.length - MAX_AGE
      const older = input.messages.slice(0, compactStart)
      const totalText = older
        .flatMap((m) => m.parts.filter((p) => p.type === "text"))
        .map((p) => (p as SessionV1.TextPart).text)
        .join(" ")
      const summary = totalText.length > 500 ? totalText.substring(0, 500) + "..." : totalText
      summarizedOlder.push({ fromIndex: 0, toIndex: compactStart, summary })
      keepMessages = input.messages.slice(compactStart)
    } else {
      keepMessages = input.messages
    }

    return {
      critical: yield* analyzeContext({ messages: input.messages, sessionID: input.sessionID }),
      keepMessages,
      summarizedOlder,
      semanticResults: [],
    } satisfies ContextWindowResult
  })

  const queryRelevant = Effect.fn("ContextWindow.queryRelevant")(function* (input: {
    sessionID: SessionID
    query: string
    limit?: number
  }) {
    const LIMIT = input.limit ?? 3
    const messages = yield* sessions.messages({ sessionID: input.sessionID }).pipe(Effect.orDie)
    const results: { sessionID: string; relevance: number; snippet: string }[] = []
    const terms = input.query.toLowerCase().split(/\s+/).filter((t) => t.length > 3)

    for (const msg of messages) {
      const text = msg.parts
        .filter((p): p is SessionV1.TextPart => p.type === "text")
        .map((p) => p.text)
        .join(" ")
      if (!text) continue
      const lower = text.toLowerCase()
      const matches = terms.filter((t) => lower.includes(t)).length
      if (matches > 0) {
        const relevance = matches / terms.length
        results.push({
          sessionID: input.sessionID,
          relevance,
          snippet: text.substring(0, 300),
        })
      }
    }

    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, LIMIT)
  })

  const getProjectFiles = Effect.fn("ContextWindow.getProjectFiles")(function* (input: {
    sessionID: SessionID
  }) {
    const messages = yield* sessions.messages({ sessionID: input.sessionID }).pipe(Effect.orDie)
    const files = new Set<string>()
    for (const msg of messages) {
      for (const part of msg.parts) {
        if (part.type === "text") {
          const matches = part.text.matchAll(/(?:in|at|path|file):?\s*([^\s,;"']+\.[a-zA-Z0-9]+)/g)
          for (const m of matches) files.add(m[1])
        }
      }
    }
    return [...files]
  })

  return Service.of({
    analyzeContext,
    buildWindow,
    queryRelevant,
    getProjectFiles,
  })
})
