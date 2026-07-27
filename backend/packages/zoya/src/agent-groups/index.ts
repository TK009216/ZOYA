import { LayerNode } from "@zoya/core/effect/layer-node"
import { Effect, Context, Layer } from "effect"
import { FSUtil } from "@zoya/core/fs-util"
import { Permission } from "@/permission"
import type { Agent } from "@/agent/agent"

import PROMPT_RESEARCHER from "@/session/prompt/agents/researcher/main.txt"
import PROMPT_RESEARCHER_FAST from "@/session/prompt/agents/researcher/fast.txt"
import PROMPT_RESEARCHER_PRO from "@/session/prompt/agents/researcher/pro.txt"
import PROMPT_RESEARCHER_EXPERT from "@/session/prompt/agents/researcher/expert.txt"
import PROMPT_RESEARCHER_EXPERT2 from "@/session/prompt/agents/researcher/expert-2.txt"

import PROMPT_PLANNER from "@/session/prompt/agents/planner/main.txt"
import PROMPT_PLANNER_FAST from "@/session/prompt/agents/planner/fast.txt"
import PROMPT_PLANNER_PRO from "@/session/prompt/agents/planner/pro.txt"
import PROMPT_PLANNER_EXPERT from "@/session/prompt/agents/planner/expert.txt"
import PROMPT_PLANNER_EXPERT2 from "@/session/prompt/agents/planner/expert-2.txt"

import PROMPT_PC from "@/session/prompt/agents/pc-control/main.txt"
import PROMPT_PC_FAST from "@/session/prompt/agents/pc-control/fast.txt"
import PROMPT_PC_PRO from "@/session/prompt/agents/pc-control/pro.txt"
import PROMPT_PC_EXPERT from "@/session/prompt/agents/pc-control/expert.txt"
import PROMPT_PC_EXPERT2 from "@/session/prompt/agents/pc-control/expert-2.txt"

import PROMPT_DB from "@/session/prompt/agents/database-agent/main.txt"
import PROMPT_DB_FAST from "@/session/prompt/agents/database-agent/fast.txt"
import PROMPT_DB_PRO from "@/session/prompt/agents/database-agent/pro.txt"
import PROMPT_DB_EXPERT from "@/session/prompt/agents/database-agent/expert.txt"
import PROMPT_DB_EXPERT2 from "@/session/prompt/agents/database-agent/expert-2.txt"

import PROMPT_SELF_BUILDER from "@/session/prompt/agents/self-builder/main.txt"
import PROMPT_SELF_BUILDER_FAST from "@/session/prompt/agents/self-builder/fast.txt"
import PROMPT_SELF_BUILDER_PRO from "@/session/prompt/agents/self-builder/pro.txt"
import PROMPT_SELF_BUILDER_EXPERT from "@/session/prompt/agents/self-builder/expert.txt"
import PROMPT_SELF_BUILDER_EXPERT2 from "@/session/prompt/agents/self-builder/expert-2.txt"

// --- Agent Group Definitions ---

export interface GroupAgentDef {
  name: string
  description: string
  mode: "fast" | "pro" | "expert" | "expert-2"
  hidden?: boolean
  systemPrompt: string
}

export interface AgentGroupDef {
  name: string
  description: string
  agents: GroupAgentDef[]
}

// --- Service Interface ---

export interface Interface {
  readonly load: () => Effect.Effect<{
    groups: AgentGroupDef[]
    currentMode: string
  }>
  readonly getCurrentMode: () => Effect.Effect<string>
  readonly getAgentsForMode: (mode: string) => Effect.Effect<GroupAgentDef[]>
  readonly registerGroupAgents: (existing: Record<string, Agent.Info>) => Effect.Effect<Record<string, Agent.Info>>
}

export class Service extends Context.Service<Service, Interface>()("@zoya/AgentGroups") {}

export function makeService(_fsys: FSUtil.Service, _cfgPath: string): Interface {
  return {
    load: Effect.fn("AgentGroups.load")(function* () {
      const groups = buildGroups()
      return { groups, currentMode: "pro" }
    }),

    getCurrentMode: Effect.fn("AgentGroups.getCurrentMode")(function* () {
      return "pro"
    }),

    getAgentsForMode: Effect.fn("AgentGroups.getAgentsForMode")(function* (mode: string) {
      const all = buildGroups().flatMap((g) => g.agents)
      return all.filter((a) => a.mode === mode || mode === "all")
    }),

    registerGroupAgents: Effect.fn("AgentGroups.registerGroupAgents")(function* (existing: Record<string, Agent.Info>) {
      const groups = buildGroups()
      for (const group of groups) {
        for (const agent of group.agents) {
          if (existing[agent.name]) continue // don't overwrite custom agents

          const perms = getPermissionsForGroup(group.name)
          existing[agent.name] = {
            name: agent.name,
            description: agent.description,
            mode: agent.hidden ? "primary" : "subagent",
            hidden: agent.hidden ?? false,
            native: true,
            permission: perms,
            prompt: agent.systemPrompt,
            options: {},
          } satisfies Agent.Info
        }
      }
      return existing
    }),
  }
}

// --- Default Layer ---

export const defaultLayer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const fsys = yield* FSUtil.Service
    const cfgPath = "" // will be set from config
    const svc = makeService(fsys, cfgPath)
    return Service.of(svc)
  }),
)

export const node = LayerNode.make(defaultLayer, [FSUtil.node])

// --- Permission Builder ---

function getPermissionsForGroup(groupName: string): any {
  const common = { question: "allow" as const }

  switch (groupName) {
    case "researcher":
      return Permission.fromConfig({
        webSearch: "allow",
        webFetch: "allow",
        read: "allow",
        write: "allow",
        task: "allow",
      })
    case "planner":
      return Permission.fromConfig({
        read: "allow",
        glob: "allow",
        grep: "allow",
        write: "allow",
        bash: "allow",
        task: "allow",
      })
    case "pc-control":
      return Permission.fromConfig({
        ...common,
        bash: "allow",
        shell: "allow",
        read: "allow",
        write: "allow",
        edit: "allow",
        glob: "allow",
        grep: "allow",
        task: "allow",
        create: "allow",
        rename: "allow",
        delete: "allow",
        copy: "allow",
        folder: "allow",
      })
    case "database-agent":
      return Permission.fromConfig({
        read: "allow",
        write: "allow",
        glob: "allow",
        grep: "allow",
        bash: "allow",
        show: "allow",
      })
    case "self-builder":
      return Permission.fromConfig({
        read: "allow",
        write: "allow",
        glob: "allow",
        grep: "allow",
        bash: "allow",
        webSearch: "allow",
        webFetch: "allow",
        task: "allow",
      })
    default:
      return Permission.fromConfig(common)
  }
}

// --- Group Builder ---

function buildGroups(): AgentGroupDef[] {
  return [
    {
      name: "researcher",
      description: "Web search and information gathering",
      agents: [
        {
          name: "fast-researcher",
          description: "Quick web searches, fast fact checking",
          mode: "fast",
          systemPrompt: PROMPT_RESEARCHER + "\n\n" + PROMPT_RESEARCHER_FAST,
        },
        {
          name: "pro-researcher",
          description: "Deep research with multiple sources and analysis",
          mode: "pro",
          systemPrompt: PROMPT_RESEARCHER + "\n\n" + PROMPT_RESEARCHER_PRO,
        },
        {
          name: "expert-researcher",
          description: "Exhaustive enterprise-grade research",
          mode: "expert",
          systemPrompt: PROMPT_RESEARCHER + "\n\n" + PROMPT_RESEARCHER_EXPERT,
        },
        {
          name: "expert-2-researcher",
          description: "Research verification and quality check",
          mode: "expert-2",
          hidden: true,
          systemPrompt: PROMPT_RESEARCHER + "\n\n" + PROMPT_RESEARCHER_EXPERT2,
        },
      ],
    },
    {
      name: "planner",
      description: "Architecture design and project planning",
      agents: [
        {
          name: "fast-planner",
          description: "Quick architecture sketches and high-level plans",
          mode: "fast",
          systemPrompt: PROMPT_PLANNER + "\n\n" + PROMPT_PLANNER_FAST,
        },
        {
          name: "pro-planner",
          description: "Detailed architecture with component specs",
          mode: "pro",
          systemPrompt: PROMPT_PLANNER + "\n\n" + PROMPT_PLANNER_PRO,
        },
        {
          name: "expert-planner",
          description: "Enterprise architecture with trade-offs",
          mode: "expert",
          systemPrompt: PROMPT_PLANNER + "\n\n" + PROMPT_PLANNER_EXPERT,
        },
        {
          name: "expert-2-planner",
          description: "Plan review, anti-pattern detection, optimization",
          mode: "expert-2",
          hidden: true,
          systemPrompt: PROMPT_PLANNER + "\n\n" + PROMPT_PLANNER_EXPERT2,
        },
      ],
    },
    {
      name: "pc-control",
      description: "PC operations, file management, terminal commands",
      agents: [
        {
          name: "fast-todo",
          description: "Quick file operations and simple commands",
          mode: "fast",
          systemPrompt: PROMPT_PC + "\n\n" + PROMPT_PC_FAST,
        },
        {
          name: "pro-todo",
          description: "Multi-step operations with error handling",
          mode: "pro",
          systemPrompt: PROMPT_PC + "\n\n" + PROMPT_PC_PRO,
        },
        {
          name: "expert-pc-control",
          description: "Complex automation and deployment pipelines",
          mode: "expert",
          systemPrompt: PROMPT_PC + "\n\n" + PROMPT_PC_EXPERT,
        },
        {
          name: "expert-2-pc-control",
          description: "Code review and performance optimization",
          mode: "expert-2",
          hidden: true,
          systemPrompt: PROMPT_PC + "\n\n" + PROMPT_PC_EXPERT2,
        },
      ],
    },
    {
      name: "database-agent",
      description: "History management, memory recall, user preferences, self-improvement",
      agents: [
        {
          name: "database-agent",
          description: "Eternal memory — provides ZOYA with exact history, user preferences, and self-improvement feedback",
          mode: "fast",
          systemPrompt: PROMPT_DB + "\n\n" + PROMPT_DB_FAST,
        },
        {
          name: "database-agent-pro",
          description: "Same as database-agent — no mode difference, always comprehensive",
          mode: "pro",
          systemPrompt: PROMPT_DB + "\n\n" + PROMPT_DB_PRO,
        },
        {
          name: "database-agent-expert",
          description: "Same as database-agent — no mode difference, always comprehensive",
          mode: "expert",
          systemPrompt: PROMPT_DB + "\n\n" + PROMPT_DB_EXPERT,
        },
        {
          name: "database-agent-expert-2",
          description: "Same as database-agent — no mode difference, always comprehensive",
          mode: "expert-2",
          hidden: true,
          systemPrompt: PROMPT_DB + "\n\n" + PROMPT_DB_EXPERT2,
        },
      ],
    },
    {
      name: "self-builder",
      description: "Tool & agent creation — ZOYA apne naye tools aur agents khud bana sakti hai",
      agents: [
        {
          name: "self-builder",
          description: "ZOYA ko naye tools aur agents design karne mein help karta hai. 🚀 Jab ZOYA koi naya tool ya agent banana chahe",
          mode: "fast",
          systemPrompt: PROMPT_SELF_BUILDER + "\n\n" + PROMPT_SELF_BUILDER_FAST,
        },
        {
          name: "self-builder-pro",
          description: "Detailed tool/agent design with reasoning and alternatives",
          mode: "pro",
          systemPrompt: PROMPT_SELF_BUILDER + "\n\n" + PROMPT_SELF_BUILDER_PRO,
        },
        {
          name: "self-builder-expert",
          description: "Enterprise-grade tool/agent design with full specs",
          mode: "expert",
          systemPrompt: PROMPT_SELF_BUILDER + "\n\n" + PROMPT_SELF_BUILDER_EXPERT,
        },
        {
          name: "self-builder-expert-2",
          description: "Design verification and quality assurance",
          mode: "expert-2",
          hidden: true,
          systemPrompt: PROMPT_SELF_BUILDER + "\n\n" + PROMPT_SELF_BUILDER_EXPERT2,
        },
      ],
    },
  ]
}

export * as AgentGroups from "."
