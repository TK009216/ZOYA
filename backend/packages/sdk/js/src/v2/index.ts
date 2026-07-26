export * from "./client.js"
export * from "./server.js"

import { createZoyaClient } from "./client.js"
import { createZoyaServer } from "./server.js"
import type { ServerOptions } from "./server.js"

export * as data from "./data.js"

export async function createZoya(options?: ServerOptions) {
  const server = await createZoyaServer({
    ...options,
  })

  const client = createZoyaClient({
    baseUrl: server.url,
  })

  return {
    client,
    server,
  }
}
