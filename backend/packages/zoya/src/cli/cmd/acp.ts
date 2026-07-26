import { Effect } from "effect"
import { effectCmd } from "../effect-cmd"
import { AgentSideConnection, ndJsonStream } from "@agentclientprotocol/sdk"
import { ServerAuth } from "@/server/auth"
import { createZoyaClient } from "@zoya/sdk/v2"
import { withNetworkOptions, resolveNetworkOptions } from "../network"
import { ACPProfile } from "@/acp/profile"

export const AcpCommand = effectCmd({
  command: "acp",
  describe: "start ACP (Agent Client Protocol) server",
  builder: (yargs) => {
    return withNetworkOptions(yargs).option("cwd", {
      describe: "working directory",
      type: "string",
      default: process.cwd(),
    })
  },
  handler: Effect.fn("Cli.acp")(function* (args) {
    const { Server } = yield* Effect.promise(() => import("@/server/server"))
    const { ACP } = yield* Effect.promise(() => import("@/acp/agent"))
    ACPProfile.mark("cli.acp.handler")
    process.env.OPENCODE_CLIENT = "acp"
    const opts = yield* resolveNetworkOptions(args)
    const server = yield* Effect.promise(() => ACPProfile.measure("cli.acp.server.listen", () => Server.listen(opts)))

    const sdk = createZoyaClient({
      baseUrl: `http://${server.hostname}:${server.port}`,
      headers: ServerAuth.headers(),
    })

    // Wait for backing server to be fully initialized before accepting ACP requests
    yield* Effect.promise(
      () =>
        new Promise<void>((resolve, reject) => {
          const maxAttempts = 60
          let attempts = 0
          const poll = () => {
            attempts++
            const authHeaders = ServerAuth.headers();
            fetch(`http://${server.hostname}:${server.port}/api/health`, {
              headers: authHeaders,
            })
              .then((res) => {
                if (res.status === 401) {
                  // Auth required but server is alive — that is fine
                  return resolve()
                }
                if (!res.ok) return res.text().then(t => { throw new Error(`Health check failed (${res.status}): ${t}`) })
                return res.json() as Promise<{ healthy: boolean }>
              })
              .then((body) => {
                if (body === undefined || body.healthy === true) return resolve()
                if (attempts >= maxAttempts) return reject(new Error("Backing server health check timed out"))
                setTimeout(poll, 200)
              })
              .catch((e) => {
                console.error(`Health check attempt ${attempts}/${maxAttempts} failed:`, e.message);
                if (attempts >= maxAttempts) return reject(new Error("Backing server health check timed out"))
                setTimeout(poll, 200)
              })
          }
          poll()
        }),
    )

    // Pre-warm provider cache in background (non-blocking) so ACP handshake
    // starts immediately. If pre-warm fails, providers load on first request.
    sdk.config.providers({ directory: process.cwd() }).then(() => {
      console.error("[ACP] provider cache pre-warmed")
    }).catch((e: unknown) => {
      console.error("[ACP] provider pre-warm failed, will load on first ACP request:", String(e))
    })

    const input = new WritableStream<Uint8Array>({
      write(chunk) {
        return new Promise<void>((resolve, reject) => {
          process.stdout.write(chunk, (err) => {
            if (err) {
              reject(err)
            } else {
              resolve()
            }
          })
        })
      },
    })
    const output = new ReadableStream<Uint8Array>({
      start(controller) {
        process.stdin.on("data", (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk))
        })
        process.stdin.on("end", () => controller.close())
        process.stdin.on("error", (err) => controller.error(err))
      },
    })

    const stream = ndJsonStream(input, output)
    const agent = ACP.init({ sdk })

    new AgentSideConnection((conn) => {
      ACPProfile.mark("cli.acp.connection.create")
      return agent.create(conn)
    }, stream)

    yield* Effect.logInfo("setup connection")
    process.stdin.resume()
    yield* Effect.promise(
      () =>
        new Promise<void>((resolve, reject) => {
          process.stdin.on("end", () => resolve())
          process.stdin.on("error", reject)
        }),
    )
  }),
})
