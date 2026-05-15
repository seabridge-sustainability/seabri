# Sentinel Runtime Protection

MCP Sentinel is active for this repository.

- Claude Code: `.claude/settings.json` runs the shared Sentinel `PreToolUse` hook.
- Gemini CLI: `.gemini/settings.json` runs the shared Sentinel `BeforeTool` hook.
- Codex CLI: `.codex/hooks.json` registers the shared Sentinel `PreToolUse` hook; `.codex/config.toml` enables Codex hooks where supported.
- OpenCode: `.opencode/plugins/seabridge-sentinel.js` blocks suspicious tool and command execution before it runs.

Shared pinned Sentinel source:
`C:\Users\adelm\SeaBridgeAI\everything-claude-code\vendor\claude-mcp-sentinel`

For Markdown review/protection, run the repo's Sentinel Markdown guard when present, or invoke the shared Sentinel skill wrapper. Never remove or weaken these Sentinel entries without explicit approval.
