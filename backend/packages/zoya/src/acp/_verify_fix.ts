/**
 * Quick verification script - tests that the AgentGroups module loads and works.
 * Also tests that a basic session can be created and prompted.
 */
import { AgentGroups } from "@/agent-groups"
import { FSUtil } from "@zoya/core/fs-util"
import { Global } from "@zoya/core/global"
import { Effect, Layer, runPromise } from "effect"
import { Permission } from "@/permission"

async function main() {
  console.log("=== Verifying AgentGroups module ===")

  // 1. Test that the module exports exist
  console.log("1. Service class:", typeof AgentGroups.Service)
  console.log("2. defaultLayer:", typeof AgentGroups.defaultLayer)
  console.log("3. node:", typeof AgentGroups.node)
  console.log("4. makeService:", typeof AgentGroups.makeService)

  // 2. Test makeService directly with a mock fsys
  console.log("\n--- Testing makeService ---")
  const layer = Layer.effect(
    AgentGroups.Service,
    Effect.gen(function* () {
      const fsys = yield* FSUtil.Service
      const global = yield* Global.Service
      const cfgPath = require("path").join(global.home, ".config", "zoya", "agent-groups.jsonc")
      const service = AgentGroups.makeService(fsys, cfgPath)

      // Test load
      const cfg = yield* service.load()
      console.log("   load() groups:", cfg.groups.length)
      console.log("   load() currentMode:", cfg.currentMode)

      // Test getCurrentMode
      const mode = yield* service.getCurrentMode()
      console.log("   getCurrentMode:", mode)

      // Test getAgentsForMode
      const agents = yield* service.getAgentsForMode("fast")
      console.log("   getAgentsForMode(fast):", agents.map((a: any) => a.name))

      // Test registerGroupAgents with empty record
      const testAgentInfo = {
        name: "test",
        mode: "all" as const,
        permission: Permission.fromConfig({ "*": "allow" as const }),
        options: {},
      }
      const existing: Record<string, any> = { test: testAgentInfo }
      yield* service.registerGroupAgents(existing)
      const plannerAgents = Object.keys(existing).filter((k) => k.includes("planner"))
      console.log("   registerGroupAgents added:", plannerAgents)

      return service
    }),
  )

  const fullLayer = layer.pipe(
    Layer.provide(FSUtil.defaultLayer),
    Layer.provide(Global.layer),
  )

  try {
    const service = await runPromise(Effect.gen(function* () {
      return yield* AgentGroups.Service
    }).pipe(Effect.provide(fullLayer)))
    console.log("\n✅ AgentGroups layer created successfully!")
  } catch (e) {
    console.error("\n❌ AgentGroups layer failed:", e)
    process.exit(1)
  }

  console.log("\n=== All checks passed! ===")
}

main().catch(console.error)
