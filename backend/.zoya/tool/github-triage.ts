import { tool } from "@opencode-ai/plugin"

const TEAM = {
  tui: ["zoya-tui"],
  desktop_web: ["zoya-web"],
  core: ["zoya-core"],
  inference: ["zoya-inference"],
  windows: ["zoya-windows"],
} as const

function pick<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)]!
}

function getIssueNumber(): number {
  const issue = parseInt(process.env.ISSUE_NUMBER ?? "", 10)
  if (!issue) throw new Error("ISSUE_NUMBER env var not set")
  return issue
}

async function githubFetch(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...(options.headers instanceof Headers ? Object.fromEntries(options.headers.entries()) : options.headers),
    },
  })
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

export default tool({
  description: `Assign a ZOYA GitHub issue to a team.

Provide the team that should own the issue. This tool picks a random assignee from that team.

Available teams: tui, desktop_web, core, inference, windows`,
  args: {
    team: tool.schema
      .enum(Object.keys(TEAM) as [keyof typeof TEAM, ...(keyof typeof TEAM)[]])
      .describe("The owning team"),
  },
  async execute(args) {
    const issue = getIssueNumber()
    const owner = "TK009216"
    const repo = "ZOYA"
    const assignee = pick(TEAM[args.team])

    await githubFetch(`/repos/${owner}/${repo}/issues/${issue}/assignees`, {
      method: "POST",
      body: JSON.stringify({ assignees: [assignee] }),
    })

    return `Assigned @${assignee} from ${args.team} to issue #${issue}`
  },
})