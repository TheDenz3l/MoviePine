## Model Context Protocol (MCP) Tools

This project uses three assistant-provided MCP capabilities during design, planning, and documentation phases. They are NOT shipped in production code, but the team tracks them here for consistent usage.

| Tool | Purpose | When to Use | Skip When |
|------|---------|------------|-----------|
| atom-of-thought | Deep structured reasoning (premises → reasoning → hypotheses → verification → conclusions) | Large refactors, architecture choices, risk analysis | Simple cosmetic changes |
| sequential-thinking | Fast iterative reasoning with ability to revise earlier steps | Medium complexity feature design, exploratory ideation | Ultra-trivial tasks |
| context7 | Pull authoritative, version-aware library docs snippets | Need precise Next.js/React/Tailwind feature details | Knowledge already certain |

### Usage Pattern
1. Run `npm run mcp:list` to show available tools (local helper for team visibility).
2. For a big change: start an Atom of Thought session (ask the assistant: "Run AoT to plan X").
3. For quick design: request Sequential Thinking ("Sequential plan for implementing feature Y").
4. Need docs: ask to resolve & fetch ("Fetch Context7 docs for Next.js routing").

### Decision Log Workflow (Suggested)
1. Initiate AoT or Sequential session.
2. After conclusion, copy summary into `docs/decisions/DECISION-<date>-<slug>.md` (folder not yet created).
3. Reference decision file in PR description.

### Exporting Summaries
Ask the assistant: "Summarize the AoT session as a decision record" and paste into the decision log.

### Extending
If we add self-hosted MCP servers later (e.g., internal API schema server), list them in `mcp.config.json` under a new category.

---
This `mcp` directory is purely informational and does not affect runtime or builds.

### Sequential Thinking MCP Server
Remote endpoint (Smithery): `https://server.smithery.ai/@smithery-ai/server-sequential-thinking/mcp`

VS Code MCP (remote) example:
```jsonc
{
	"mcp": {
		"servers": {
			"sequential-thinking": {
				"type": "http",
				"url": "https://server.smithery.ai/@smithery-ai/server-sequential-thinking/mcp"
			}
		}
	}
}
```

Potential local (if published as a package):
```jsonc
{
	"mcp": {"servers": {"sequential-thinking": {"type":"stdio","command":"npx","args":["-y","@smithery-ai/server-sequential-thinking"]}}}
}
```

#### Note on 401 (Unauthorized) in this Repo Environment
If you run the health script here (`npm run mcp:sequential:health`) you will see HTTP 401. This is expected: the remote Sequential Thinking server requires auth context that Smithery injects into VS Code after installation. The repository runtime (CI, plain node scripts, this assistant) does not possess those credentials, so direct unauthenticated calls are rejected.

Use the tool inside VS Code (where it was installed successfully) rather than invoking it via the assistant here. No action required unless you need headless automation—in that case you would provision a token and pass it securely (not stored in git).
