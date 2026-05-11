# Local LLM — Unsloth

Unsloth Studio is centrally managed from:
  C:\Users\adelm\SeaBridgeAI\everything-claude-code\external\unsloth

Full documentation:
  C:\Users\adelm\SeaBridgeAI\everything-claude-code\docs\local-llm\unsloth.md

Sustainability model training guide:
  C:\Users\adelm\SeaBridgeAI\everything-claude-code\docs\local-llm\sustainability-model-training-with-unsloth.md

## Quick Start (from any repo)

```powershell
# Health check
C:\Users\adelm\SeaBridgeAI\everything-claude-code\scripts\check-unsloth.ps1

# Start Studio with UI  (--frontend is required to serve the web interface)
$fe = "C:\Users\adelm\SeaBridgeAI\everything-claude-code\external\unsloth\studio\frontend\dist"
unsloth studio run --model unsloth/Qwen3.5-4B-GGUF:Q4_K_M -p 8888 --frontend $fe

# Use with Claude Code (dot-source in your terminal)
. C:\Users\adelm\SeaBridgeAI\everything-claude-code\scripts\use-unsloth-claude-code.ps1
claude

# Use with Codex / OpenAI-compatible clients
. C:\Users\adelm\SeaBridgeAI\everything-claude-code\scripts\use-unsloth-openai-compatible.ps1
codex
```

> **Note:** Omitting `--frontend` starts the API only. `http://127.0.0.1:8888/` will
> return `{"detail":"Not Found"}` without it. The frontend dist is pre-built at the path
> above; no rebuild needed unless the central clone is updated.

## Models (16 GB VRAM)

| Model | Command |
|-------|---------|
| Qwen3.5-4B (cached) | `unsloth studio run --model unsloth/Qwen3.5-4B-GGUF:Q4_K_M -p 8888 --frontend $fe` |
| Gemma-4-2B (cached) | `unsloth studio run --model unsloth/gemma-4-E2B-it-GGUF:Q4_K_M -p 8888 --frontend $fe` |
| Qwen3-14B | `unsloth studio run --model unsloth/Qwen3-14B-GGUF:Q4_K_M -p 8888 --frontend $fe` |
| Gemma-4-12B | `unsloth studio run --model unsloth/gemma-4-12b-it-GGUF:Q5_K_M -p 8888 --frontend $fe` |

Do NOT add production dependencies on Unsloth in this repo.
