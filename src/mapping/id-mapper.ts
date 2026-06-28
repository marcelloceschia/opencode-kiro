interface MappingRule {
  prefix: string
  lab: string
  transform: (id: string) => string
}

const normalizeDots = (s: string): string => s.replace(/\./g, "-")

const rules: MappingRule[] = [
  {
    prefix: "claude-",
    lab: "anthropic",
    transform: (id) => normalizeDots(id),
  },
  {
    prefix: "qwen",
    lab: "alibaba",
    transform: (id) => id,
  },
  {
    prefix: "minimax-",
    lab: "minimax",
    transform: (id) => normalizeDots(id),
  },
  {
    prefix: "deepseek-",
    lab: "deepseek",
    transform: (id) => {
      const version = id.replace("deepseek-", "")
      return normalizeDots(`deepseek-v${version}`)
    },
  },
  {
    prefix: "glm-",
    lab: "zhipuai",
    transform: (id) => id,
  },
]

export function mapKiroIdToModelsDev(kiroId: string): string | undefined {
  if (kiroId === "auto") return undefined

  for (const rule of rules) {
    if (kiroId.startsWith(rule.prefix)) {
      const transformed = rule.transform(kiroId)
      return `${rule.lab}/${transformed}`
    }
  }

  return undefined
}
