export interface ModeConfig {
  id: string
  name: string
  description: string
  variant: "default" | "high" | "xhigh"
  temperature: number
  maxTokens: number
  outputLines: string
  toolsEnabled: boolean
  agentsEnabled: boolean
  icon: string
}

export const MODES: ModeConfig[] = [
  {
    id: "fast",
    name: "Fast",
    description: "Speed-first, concise replies",
    variant: "default",
    temperature: 0.7,
    maxTokens: 8192,
    outputLines: "unlimited",
    toolsEnabled: true,
    agentsEnabled: true,
    icon: "🚀",
  },
  {
    id: "pro",
    name: "Pro",
    description: "Balanced depth, detailed replies",
    variant: "high",
    temperature: 0.6,
    maxTokens: 16384,
    outputLines: "unlimited",
    toolsEnabled: true,
    agentsEnabled: true,
    icon: "💼",
  },
  {
    id: "expert",
    name: "Expert",
    description: "Maximum depth, comprehensive analysis",
    variant: "xhigh",
    temperature: 0.5,
    maxTokens: 32768,
    outputLines: "unlimited",
    toolsEnabled: true,
    agentsEnabled: true,
    icon: "🔬",
  },
]

export function getModeConfig(modeId: string): ModeConfig {
  return MODES.find((m) => m.id === modeId) ?? MODES[1]
}

export function isValidMode(modeId: string): boolean {
  return MODES.some((m) => m.id === modeId)
}

export function getModeVariant(modeId: string): "default" | "high" | "xhigh" {
  return getModeConfig(modeId).variant
}

export * as Mode from "./mode"
