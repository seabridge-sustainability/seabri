# Sustainability Model Customization — OpenSeaBri Pointer

This document points to the canonical guide and explains OpenSeaBri-specific usage.

## Master Guide

`C:\Users\adelm\SeaBridgeAI\everything-claude-code\docs\local-llm\sustainability-reinforced-model-customization.md`

Covers: all 11 sustainability domains, model selection, dataset formats (SFT/DPO), eval rubric, hallucination prevention, source grounding, full directory structure, training/inference/smoke-test commands, validation checklist.

## OpenSeaBri Use Cases

OpenSeaBri uses the `fast_consumer` model (Gemma-4-2B or Gemma-2-2B) for consumer-facing sustainability QA because it fits comfortably in VRAM alongside inference for other agents.

Target domains for OpenSeaBri fine-tuning:
- **OpenSeaBri Consumer Skills**: see `ECC/local-llm/datasets/sustainability/templates/open-seabridge-skills-template.jsonl`
- **ESG Metrics QA**: see `ECC/local-llm/datasets/sustainability/templates/esg-metrics-qa-template.jsonl`

## Gemma Smoke Config

Use the Gemma-specific config for OpenSeaBri training runs:

```powershell
$VENV = "$env:USERPROFILE\.unsloth\studio\unsloth_studio\Scripts\python.exe"
& $VENV "ECC/local-llm/training/unsloth/train_sustainability_model.py" `
    --config "ECC/local-llm/configs/unsloth/gemma-sustainability-smoke.yaml"
```

Duration: ~1–2 minutes on RTX 4090 Laptop (5 examples × 1 epoch).

## Startup (include --frontend flag)

```powershell
$fe = "C:\Users\adelm\SeaBridgeAI\everything-claude-code\external\unsloth\studio\frontend\dist"
unsloth studio run --model unsloth/gemma-4-E2B-it-GGUF:Q4_K_M -p 8888 --frontend $fe
```

Without `--frontend`, the Studio UI returns 404. The API endpoint (`/v1/chat/completions`) works regardless.

## OpenSeaBri API Route

OpenSeaBri consumes the manageesg-backend via `/api/v1/openseabri/*` routes only. Local LLM routing is controlled by the backend `.env` settings — OpenSeaBri itself does not call the local endpoint directly.

## VRAM Budget for Consumer Model

| Model | Inference VRAM | Notes |
|-------|----------------|-------|
| Gemma-2-2B GGUF Q4 | ~1.5 GB | Best for consumer-facing; leaves headroom |
| Gemma-4-2B GGUF Q4 | ~2.5 GB | Preferred when 4B fits comfortably |
| Qwen3.5-4B GGUF Q4 | ~2.5 GB | Fallback if Gemma unavailable |
