# SeaBridgeAI Copilot Contract

`AGENTS.md` is the repository authority. Preserve its safety, authorization,
branch, shared-checkout, secret, and repository-specific rules.

- Use risk-scaled tests and observe changed runtime behavior when practical;
  do not impose universal TDD, fixed coverage, or every test layer.
- Never delete protected assets, bypass hooks, force-push, expose secrets, or
  commit another session's work. Ask before gated actions unless the current
  session already approved the exact bounded sequence.
- Minimize GitHub Actions cost: validate locally, use one integration owner and
  one completed-batch push, and never dispatch or rerun workflows without the
  separately required approval.
