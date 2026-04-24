# OpenSeaBri Import Policy

Governs how code, prompts, schemas, and patterns from upstream open-source projects
(Hermes Agent, OpenClaw, and any future adoptions) enter this repository.

Phase A governance artifact. Companion to `gateway/skills/schema.ts` (compliance-tag
enforcement) and `CONTRIBUTING.md`.

---

## 1. Principles

1. **Clone-then-adapt, not fork-and-diverge.** We take narrow, named capabilities —
   not whole trees. Every imported file must justify its single-purpose role in a
   sustainability-only stack.
2. **License compatibility is non-negotiable.** No file enters `main` without a
   verified license trail.
3. **Provenance is permanent.** Every imported file carries an SPDX header pointing
   to the exact upstream commit.
4. **Upstream drift is tracked, not followed.** We pin to commits; we do not auto-pull.

---

## 2. Allowed Upstream Licenses

| License              | Allowed? | Notes                                           |
| -------------------- | -------- | ----------------------------------------------- |
| MIT                  | Yes      | Preserve copyright notice in SPDX header        |
| Apache-2.0           | Yes      | Preserve NOTICE file entries; record patents    |
| BSD-2-Clause / 3     | Yes      | Preserve copyright notice                       |
| ISC                  | Yes      | Preserve copyright notice                       |
| MPL-2.0              | Conditional | File-level copyleft — isolate in own module |
| LGPL-3.0             | Conditional | Only via unmodified dynamic linking         |
| GPL-3.0 / AGPL-3.0   | No       | Incompatible with OpenSeaBri distribution model |
| SSPL / BUSL / Commons Clause | No | Non-OSI, ambiguous redistribution           |
| Unlicensed / unknown | No       | Treat as "all rights reserved"                  |

Hermes Agent (NousResearch) and OpenClaw (openclaw/openclaw) must each be
re-verified on every import — license can change between tags.

---

## 3. Pinned-Commit Strategy

- Every adoption pins a specific upstream SHA, never a branch or tag.
- Pins are recorded in `imports/manifest.json`:
  ```json
  {
    "hermes-agent": {
      "url": "https://github.com/NousResearch/hermes-agent",
      "commit": "<40-char SHA>",
      "license": "Apache-2.0",
      "imported_at": "YYYY-MM-DD",
      "imported_paths": ["skills/engine/", "memory/fts5.ts"]
    }
  }
  ```
- Updating a pin requires a PR titled `import: bump <project> to <short-sha>` with
  a diff summary of upstream changes and a re-run of the license audit.

---

## 4. SPDX Header Requirement

Every imported source file must begin with:

```
// SPDX-License-Identifier: <upstream-license>
// SPDX-FileCopyrightText: <upstream-copyright-line>
// Origin: <repo-url>@<commit-sha>:<path>
// Adapted for OpenSeaBri on <YYYY-MM-DD>. Modifications © SeaBridge AI.
```

Python / YAML / TOML use `# ` comments with the same fields. Markdown uses an
HTML comment block.

Files without a valid SPDX header fail CI (`scripts/audit-imports.ts` — Phase F).

---

## 5. Adaptation Rules

An imported file may be modified, but modifications must:

1. Remain license-compatible (Apache-2.0 additions OK on top of MIT; never the reverse
   unless you relicense your patch under the weaker license).
2. Be isolated from SeaBridgeAI proprietary code. Adapters wrap; they do not
   intermingle. Example: `gateway/adapters/hermes-fts5.ts` is fine; editing
   `gateway/core/session.ts` to inline Hermes logic is not.
3. Keep a sustainability-only scope. Reject features that expand OpenSeaBri into
   general-purpose agent orchestration.

---

## 6. What to Adopt, What to Skip

### Hermes — candidates

| Capability                     | Adopt? | Reason                                       |
| ------------------------------ | ------ | -------------------------------------------- |
| Skills auto-creation loop      | Yes    | Aligns with compliance-gated skill registry  |
| FTS5 session search            | Yes    | Cheap, local, no external dep                |
| Cron / subagents               | Yes    | Needed for regulation-monitoring cadence     |
| Memory nudges                  | Yes    | Thin layer; aligns with our memory store     |
| Daytona/Modal serverless       | Conditional | Only if we need sandbox tier 3         |
| Honcho user modeling           | Skip   | Overlaps our tenant model; license review    |
| Datagen / RL hooks             | Skip   | Out of scope — not sustainability            |

### OpenClaw — candidates

| Capability                     | Adopt? | Reason                                       |
| ------------------------------ | ------ | -------------------------------------------- |
| Multi-channel gateway          | Yes    | WhatsApp/Telegram/Slack → sustainability briefs |
| A2UI / Live Canvas             | Yes    | Powers the Sustainability Intelligence Pane  |
| Sandbox tiers                  | Yes    | Needed for untrusted-skill execution         |
| DM pairing / node pairing      | Conditional | Only if enterprise deploys request it   |
| Companion apps                 | Skip   | Build our own sustainability-branded shell   |
| Voice wake                     | Skip   | Out of scope for Phase A–D                   |

---

## 7. Review Gate

A PR that imports upstream code must have:

- [ ] `imports/manifest.json` updated with commit SHA + license
- [ ] SPDX header on every touched file
- [ ] `LICENSES/<project>.txt` added (full upstream license text)
- [ ] `NOTICE` updated if upstream is Apache-2.0
- [ ] Diff reviewed for secrets, analytics callbacks, telemetry, and non-sustainability
      features — all stripped before merge
- [ ] A CODEOWNERS approval from someone authorized to sign off on license decisions

No exceptions. If the upstream license cannot be verified, the PR is closed —
not merged with "TODO: confirm license."

---

## 8. Drift and Security

- Pinned commits are re-audited quarterly for new CVEs against upstream.
- If an upstream project relicenses away from an allowed license, existing
  imports stay (they were legal at time of import) but new imports stop.
- Any upstream supply-chain incident (typosquat, maintainer compromise) triggers
  an immediate `imports/manifest.json` freeze and a full audit.

---

## 9. Scope Reminder

OpenSeaBri is sustainability-only. Compliance-tag enforcement at the skill layer
is the product moat; import policy is the legal and security moat that lets that
moat exist. Do not weaken either.
