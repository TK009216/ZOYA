import { Flag } from "@zoya/core/flag/flag"

console.error("=== AUTH HEADER DEBUG ===")
console.error("OPENCODE_SERVER_USERNAME env:", JSON.stringify(process.env["OPENCODE_SERVER_USERNAME"]))
console.error("Flag.OPENCODE_SERVER_USERNAME:", JSON.stringify(Flag.OPENCODE_SERVER_USERNAME))
console.error("OPENCODE_SERVER_PASSWORD env:", JSON.stringify(process.env["OPENCODE_SERVER_PASSWORD"]))
console.error("Flag.OPENCODE_SERVER_PASSWORD:", JSON.stringify(Flag.OPENCODE_SERVER_PASSWORD))

// What header would ServerAuth.headers() produce?
const password = Flag.OPENCODE_SERVER_PASSWORD
const username = Flag.OPENCODE_SERVER_USERNAME ?? "zoya"
if (password) {
  const header = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`
  console.error("Auth header:", header)
  const decoded = Buffer.from(header.replace("Basic ", ""), "base64").toString()
  console.error("Decoded:", decoded)
}
