const normalizeDots = (s) => s.replace(/\./g, "-");
const rules = [
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
            const version = id.replace("deepseek-", "");
            return normalizeDots(`deepseek-v${version}`);
        },
    },
    {
        prefix: "glm-",
        lab: "zhipuai",
        transform: (id) => id,
    },
];
export function mapKiroIdToModelsDev(kiroId) {
    if (kiroId === "auto")
        return undefined;
    for (const rule of rules) {
        if (kiroId.startsWith(rule.prefix)) {
            const transformed = rule.transform(kiroId);
            return `${rule.lab}/${transformed}`;
        }
    }
    return undefined;
}
//# sourceMappingURL=id-mapper.js.map