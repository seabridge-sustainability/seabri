# OpenSeaBri Bundle Optimization Review

**Status:** reviewed, no low-risk code split needed this sprint  
**Last updated:** 2026-05-10

## Current Build Shape

Fresh build output from the latest verified pass showed:

| Asset | Raw | Gzip | Notes |
|-------|-----|------|-------|
| `index-*.js` | ~264.97 kB | ~82.52 kB | Main app chunk |
| `WorkflowCanvas-*.js` | ~182.27 kB | ~58.25 kB | Canvas/ReactFlow surface |
| `react-markdown-*.js` | ~111.89 kB | ~33.99 kB | Markdown rendering split chunk |
| `WorkflowCanvas-*.css` | ~15.39 kB | ~2.55 kB | Canvas styling |
| `index-*.css` | ~5.20 kB | ~1.77 kB | Core app styling |

## Findings

- ReactFlow/canvas code is already isolated in a separate chunk.
- `react-markdown` is already split from the main app chunk.
- The current bundle is acceptable for staging deployment.
- Further optimization should be measured against real route usage before changing component boundaries.

## Future Opportunities

| Opportunity | Benefit | Risk | Recommendation |
|-------------|---------|------|----------------|
| Route-level lazy loading for canvas-only views | Reduces initial dashboard payload | Medium if shared canvas state changes load order | Defer until route analytics exist |
| Conditional markdown renderer import for chat-only paths | Reduces non-chat startup | Low to medium | Consider after staging usage data |
| Canvas worker/offscreen isolation | Better perceived responsiveness | Medium | Defer |
| Bundle analyzer CI artifact | Repeatable evidence | Low | Add with CI setup |

No bundle code changes were made in this pass because the existing split chunks are already reasonable and test coverage should stay focused on production-readiness blockers.

## CI Recommendation

Use `npm run validate:staging` as the CI-ready validation command before staging deploys. It runs typecheck, Vitest, Node tests, Playwright, production build, moderate audit, mocked live-channel tests, and provider-readiness tests without live provider calls.

Future CI can add a lightweight chunk-size capture step after `npm run build` and publish the output from `dist/assets` as an artifact.
