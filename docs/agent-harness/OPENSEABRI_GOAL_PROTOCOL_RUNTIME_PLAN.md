# OpenSeaBri /goal Runtime Integration Plan

OpenSeaBri inherits the SeaBridgeAI `/goal` default protocol from:

`C:\Users\adelm\SeaBridgeAI\everything-claude-code\protocols\GOAL_PROTOCOL.md`

## Current Decision

This rollout updates instructions, skills, and agent-harness docs only. Runtime code and persisted schemas are not changed in this phase because goal-state persistence touches gateway, WebSocket/canvas, approval, and task-state behavior and needs a focused implementation plan with tests.

## Required Runtime Shape

When a future runtime implementation is approved, agent tasks should carry:

- `goal_id`
- `normalized_goal`
- `definition_of_done`
- `status`
- `validation_requirements`
- `blockers`
- `artifacts`
- `validation_log`
- `final_report`

## Status Rules

- Do not move to completed until validation requirements have fresh evidence.
- Preserve approval records for live providers, outbound messaging, calls, and user-impacting actions.
- Keep WebSocket/canvas status updates synchronized with the same goal status.
- Record blockers with a safe next action.
- Never store secrets or provider tokens in goal state.

## Validation Requirements For Future Code Work

- Unit tests for status transitions.
- Integration tests for gateway task lifecycle.
- WebSocket/canvas state update tests where goal state is surfaced.
- Approval-gate tests for live-provider actions.
- Resume/retry tests proving persisted goal state is used rather than chat memory alone.

## Out Of Scope For This Rollout

- Database or file-backed goal persistence.
- UI changes for goal state.
- WebSocket payload contract changes.
- Agent loop rewrites.
- Live provider behavior changes.
