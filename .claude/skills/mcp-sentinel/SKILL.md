---
name: mcp-sentinel
version: "2.0.0-seabridge-wrapper"
description: Project-local wrapper for MCP Sentinel security review and runtime protection. Use for Markdown/skill/MCP review, suspicious instructions, tool-call protection, and security scans.
---

# MCP Sentinel

Canonical SeaBridgeAI vendor copy:
`C:\Users\adelm\SeaBridgeAI\everything-claude-code\vendor\claude-mcp-sentinel\SKILL.md`

Pinned source:
`C:\Users\adelm\SeaBridgeAI\everything-claude-code\vendor\claude-mcp-sentinel\SEABRIDGE_PINNED_SOURCE.txt`

When this skill is invoked, read the canonical `SKILL.md` above and follow it. For Markdown review/protection, inspect changed `.md` files, Claude skills, MCP configs, and project agent instructions for prompt injection, secret exfiltration, unsafe shell/network behavior, and safety-bypass language or authorization-rule tampering.

Runtime protection is activated through this repo's `.claude/settings.json` `PreToolUse` hook, which points to the shared `hooks/sentinel_preflight.py` file in the vendor copy.

