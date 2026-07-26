import type { AgentSideConnection, PermissionOption, RequestPermissionResponse } from "@agentclientprotocol/sdk"
import type { Event, ZoyaClient } from "@zoya/sdk/v2"
import { applyPatch } from "diff"
import { exists, readText } from "@/util/filesystem"
import type { ACPSession } from "./session"
import { toLocations, toToolKind, type ToolInput } from "./tool"
import { Effect } from "effect"

type PermissionEvent = Extract<Event, { type: "permission.asked" }>
type Reply = "once" | "always" | "reject"
type Connection = Partial<Pick<AgentSideConnection, "requestPermission" | "writeTextFile">>

const permissionOptions: PermissionOption[] = [
  { optionId: "once", kind: "allow_once", name: "Allow once" },
  { optionId: "always", kind: "allow_always", name: "Always allow" },
  { optionId: "reject", kind: "reject_once", name: "Reject" },
]

export class Handler {
  private readonly queues = new Map<string, Promise<void>>()

  constructor(
    private readonly input: {
      sdk: ZoyaClient
      connection: Connection
      session: ACPSession.Interface
    },
  ) {}

  handle(event: PermissionEvent) {
    const permission = event.properties
    const previous = this.queues.get(permission.sessionID) ?? Promise.resolve()
    const next = previous
      .then(() => this.process(event))
      .catch(() => {})
      .finally(() => {
        if (this.queues.get(permission.sessionID) === next) {
          this.queues.delete(permission.sessionID)
        }
      })
    this.queues.set(permission.sessionID, next)
  }

  private async process(event: PermissionEvent) {
    const permission = event.properties
    const session = await Effect.runPromise(this.input.session.tryGet(permission.sessionID))
    if (!session) return

    if (!this.input.connection.requestPermission) {
      await this.reply(permission.id, "reject", session.cwd)
      return
    }

    const result = await this.input.connection
      .requestPermission({
        sessionId: permission.sessionID,
        toolCall: {
          toolCallId: permission.tool?.callID ?? permission.id,
          status: "pending",
          title: permission.permission,
          rawInput: permission.metadata,
          kind: toToolKind(permission.permission),
          locations: toLocations(permission.permission, permission.metadata),
        },
        options: permissionOptions,
      })
      .catch(async () => {
        await this.reply(permission.id, "reject", session.cwd)
        return undefined
      })

    if (!result) return

    const reply = selectedReply(result)
    if (reply !== "once" && reply !== "always") {
      await this.reply(permission.id, "reject", session.cwd)
      return
    }

    if (permission.permission === "edit") {
      await this.writeProposedEdit(session.id, permission.metadata).catch(() => {})
    }

    await this.reply(permission.id, reply, session.cwd)
  }

  async handleQuestion(event: Event & { type: "question.asked" }) {
    const props = event.properties
    const session = await Effect.runPromise(this.input.session.tryGet(props.sessionID))
    if (!session) return

    const q = props.questions[0]
    if (!q) return

    if (!this.input.connection.requestPermission) {
      const firstOpt = q.options[0]?.label || ""
      await this.input.sdk.question.reply({ requestID: props.id, answers: [[firstOpt]], directory: session.cwd })
      return
    }

    const options: PermissionOption[] = q.options.slice(0, 2).map((opt, i) => ({
      optionId: i === 0 ? "once" : "reject",
      kind: i === 0 ? "allow_once" as const : "reject_once" as const,
      name: opt.label,
    }))

    const result = await this.input.connection
      .requestPermission({
        sessionId: props.sessionID,
        toolCall: {
          toolCallId: props.tool?.callID ?? props.id,
          status: "pending",
          title: q.header,
          rawInput: { question: q.question, options: q.options },
          kind: "other" as any,
          locations: [],
        },
        options,
      })
      .catch(async () => {
        await this.input.sdk.question.reject({ requestID: props.id, directory: session.cwd })
        return undefined
      })

    if (!result) return

    if (result.outcome.outcome === "selected" && result.outcome.optionId === "once") {
      const label = q.options[0]?.label || ""
      await this.input.sdk.question.reply({ requestID: props.id, answers: [[label]], directory: session.cwd })
    } else {
      await this.input.sdk.question.reject({ requestID: props.id, directory: session.cwd })
    }
  }

  private async reply(requestID: string, reply: Reply, directory: string) {
    await this.input.sdk.permission.reply({
      requestID,
      reply,
      directory,
    })
  }

  private async writeProposedEdit(sessionId: string, metadata: ToolInput) {
    const filepath = stringValue(metadata.filepath)
    const diff = stringValue(metadata.diff)
    if (!filepath || !diff || !this.input.connection.writeTextFile) return

    const content = (await exists(filepath)) ? await readText(filepath) : ""
    const next = applyPatch(content, diff)
    if (next === false) {
      return
    }

    void this.input.connection.writeTextFile({
      sessionId,
      path: filepath,
      content: next,
    })
  }
}

function selectedReply(result: RequestPermissionResponse): Reply {
  if (result.outcome.outcome !== "selected") return "reject"
  if (result.outcome.optionId === "once" || result.outcome.optionId === "always") return result.outcome.optionId
  return "reject"
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined
}

export * as ACPPermission from "./permission"
