import { run as runTui, type TuiInput } from "@zoya/tui"
import { Global } from "@zoya/core/global"
import { Effect } from "effect"

export function run(input: TuiInput) {
  return runTui(input).pipe(Effect.provide(Global.defaultLayer))
}
