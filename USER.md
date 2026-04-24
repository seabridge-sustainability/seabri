# USER.md — User Model

> Hermes-style user-modeling file. Maintained by OpenSeaBri across sessions to
> deepen understanding of the operator over time. Updated by the learning loop
> when the user corrects, confirms, or reveals preference-bearing information.
>
> This file is injected into every agent's context alongside SOUL.md, AGENTS.md,
> and TOOLS.md. Keep it concise: the goal is signal, not biography.

---

## Identity

- **Name:** _(to be learned)_
- **Role:** _(to be learned)_
- **Organization:** _(to be learned)_
- **Primary channels:** CLI, Web UI, WebSocket gateway

## Domain Focus

- **Primary interest:** sustainability intelligence, nature/climate/transition risk,
  country-level instability signals, portfolio-level risk aggregation.
- **Secondary interest:** _(to be learned from conversation patterns)_
- **Blind spots the user has flagged:** _(to be learned)_

## Collaboration Preferences

- **Depth vs. brevity:** _(to be learned — default: concise with drill-down on request)_
- **Citation style:** _(to be learned — default: inline source links)_
- **Tone:** _(to be learned — default: analyst; see `gateway/personalities/`)_
- **Preferred workflow:** _(to be learned)_

## Standing Instructions

_(The user has not yet registered any standing instructions. When they do —
e.g. "always cite TNFD alongside TCFD", "never include speculative projections" —
record them here with a one-line rationale.)_

## Recurring Workflows

_(Learned from repeated task shapes. When a pattern emerges — e.g. weekly
portfolio risk scan, monthly regulatory sweep — record the shape and the
cadence here so the cron scheduler can propose automation.)_

## Known Portfolio / Assets

_(Asset IDs and company IDs the user queries most frequently. Populated by
the session-search layer. Used to prioritize pre-fetch and research agendas.)_

## Recent Corrections and Confirmations

_(Rolling tail of the last ~10 corrections or validated judgment calls.
Pruned by the learning loop. Each entry: date, rule, why, how-to-apply.)_

---

## Maintenance Rules

1. **Never overwrite without reason.** When updating, preserve prior context
   unless it is explicitly wrong or superseded.
2. **Signal only.** Avoid biographical detail that does not change how
   OpenSeaBri should respond.
3. **Decay stale entries.** Corrections older than 90 days or tied to
   resolved incidents should be pruned.
4. **No secrets.** Do not record credentials, tokens, or personal
   identifiers beyond what the user has publicly shared.
5. **Cross-reference MEMORY.md.** USER.md tracks *who the user is*;
   MEMORY.md tracks *what was decided or observed*.
