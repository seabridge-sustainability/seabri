# Self-Improving Skill System

**Date:** 2026-05-03  
**Purpose:** Design a system where SeaBri agents can detect their own capability gaps and generate new skills or improve existing ones.

---

## Concept

SeaBri handles a wide range of sustainability, property risk, and emergency queries. When an agent cannot answer confidently or when users repeatedly rephrase the same question type, the system should:
1. Detect the gap (failed confidence, repeated query pattern, user frustration signal)
2. Propose a new skill or modification
3. Draft the skill (either from nanobot's skill-creator or from LLM generation)
4. Stage it for human review before activation
5. Track performance improvement post-activation

Inspired by: space-agent's SKILL.md git-backed system and nanobot's `skill_creator.py`.

---

## Gap Detection Signals

| Signal | Source | Threshold |
|--------|--------|-----------|
| Low confidence response | Response contains FORBIDDEN_PATTERNS | Any occurrence |
| User re-asks same question | 3+ similar messages in 10 min window | 3 rephrases |
| User sends "that's wrong" / "no" | isDenial after non-approval context | Any |
| Agent mode mismatch | Routed to `general` but content matches specific capability | > 5 times/day |
| Attachment type not handled | Binary fallback triggered | > 10/day |
| Backend bridge returns null | SeaBridgeAI API returned no data | > 20/day |

---

## Skill Format

Following space-agent's SKILL.md pattern:

```markdown
---
id: "wildfire-proximity-check"
name: "Wildfire Proximity Check"
version: "1.0.0"
capabilities: ["climate-risk-analysis", "property-risk"]
trigger: "user asks about wildfire risk near their address"
confidence: 0.0   # starts at 0; updated post-deployment
status: "staged"  # staged | active | deprecated
created: "2026-05-03"
source: "gap-detector"
---

# Wildfire Proximity Check

## When to Use
User mentions wildfire, fire risk, evacuation zone, fire season near a specific location.

## Steps
1. Extract address from message (via address-extractor.ts)
2. Call SeaBridgeAI backend: GET /api/v1/openseabri/climate-risk?address={addr}
3. Extract wildfireRisk field
4. If NASA FIRMS enabled: call /api/v1/firms/active-fires?lat={lat}&lng={lng}&radius=50km
5. Build response: specific risk tier, nearest active fire distance (if FIRMS), evacuation zone status

## Response Template
"Based on [SOURCE], [ADDRESS] is in a [TIER] wildfire risk zone.
[IF FIRMS]: The nearest active fire detection is [DISTANCE] km away.
Evacuation zone: [STATUS]."

## Tests
- Input: "wildfire risk at 123 Pine St Malibu CA" → wildfireRisk field in response
- Input: GPS pin in high-risk zone → FIRMS data fetched
```

---

## Skill Storage

```
gateway/skills/
    active/
        wildfire-proximity-check.md
        flood-depth-estimator.md
    staged/
        coastal-erosion-check.md    ← awaiting human review
    deprecated/
        old-generic-flood-check.md
```

---

## Skill Registry

```typescript
// gateway/seabri/skill-registry.ts

export interface SkillDefinition {
  id: string
  name: string
  version: string
  capabilities: string[]
  trigger: string
  confidence: number
  status: 'staged' | 'active' | 'deprecated'
  path: string
}

export class SkillRegistry {
  private skills = new Map<string, SkillDefinition>()

  async loadFromDisk(dir: string): Promise<void> { /* read gateway/skills/active/ */ }
  get(id: string): SkillDefinition | undefined { return this.skills.get(id) }
  listActive(): SkillDefinition[] { return [...this.skills.values()].filter(s => s.status === 'active') }
  matchTrigger(text: string): SkillDefinition | undefined {
    // Simple keyword match on trigger field; future: embedding similarity
    return this.listActive().find(s => text.toLowerCase().includes(s.trigger.toLowerCase().split(' ')[0]))
  }
}
```

---

## Gap Detector

```typescript
// gateway/seabri/gap-detector.ts

export interface GapSignal {
  userId: string
  agentId: string
  messageText: string
  signal: 'forbidden_pattern' | 'user_denial' | 'repeated_query' | 'bridge_null' | 'attachment_fallback'
  timestamp: number
}

export class GapDetector {
  private signals: GapSignal[] = []

  record(signal: GapSignal): void {
    this.signals.push(signal)
    this.analyzePatterns()
  }

  private analyzePatterns(): void {
    // Cluster recent signals → if threshold met → propose skill
    const recentByType = this.groupBySignalType(this.signals.filter(s => Date.now() - s.timestamp < 3_600_000))
    for (const [type, group] of Object.entries(recentByType)) {
      if (group.length >= this.threshold(type as GapSignal['signal'])) {
        this.proposeSkill(group)
      }
    }
  }

  private async proposeSkill(signals: GapSignal[]): Promise<void> {
    // Generate skill draft via LLM
    // Write to gateway/skills/staged/
    // Notify admin via CLI or Slack (if configured)
  }
}
```

---

## Human Review Gate

Before a skill moves from `staged` to `active`:

```bash
# CLI command
seabri skills list-staged
seabri skills review <skill-id>   # prints skill, prompts Y/N
seabri skills activate <skill-id>
seabri skills reject <skill-id>   # moves to deprecated/
```

Or via Telegram admin channel:
```
/skill-review <skill-id>   → shows staged skill
→ YES → moves to active/
→ NO → moves to deprecated/
```

---

## Performance Tracking

After activation, track:
- Query-to-skill match rate (did the trigger fire on relevant queries?)
- User satisfaction proxy (no "that's wrong" after skill-matched response)
- Forbidden pattern rate (did the skill reduce generic hedging?)

Results appended to `WORKSPACE_DIR/skill_metrics.jsonl`.

---

## Sprint Scope

**Sprint 1:** Gap detector records signals; no auto-generation yet  
**Sprint 2:** Skill drafting via LLM; staged folder; CLI review  
**Sprint 3:** Performance tracking; nanobot skill_creator integration
