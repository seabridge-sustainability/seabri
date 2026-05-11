# OpenSeaBri Bundle Size Review — 2026-05-09

## Current Output

| Asset | Raw | Gzipped |
|-------|-----|---------|
| `index.js` | 564.39 KB | 174.62 KB |
| `index.css` | 20.59 KB | 4.24 KB |
| `index.html` | 1.35 KB | 0.71 KB |
| **Total** | **586.33 KB** | **179.57 KB** |
| Source maps | 2,177.59 KB | — |

**Build tool**: Vite 8.0.10 (Rolldown)
**Modules transformed**: 448

## Assessment

The 564 KB single-chunk JS bundle exceeds Vite's 500 KB warning threshold. Gzipped transfer size is 174 KB — acceptable for a dashboard SPA but improvable.

## Largest Dependencies (estimated bundle contribution)

| Dependency | Est. Size | Tree-shakeable | Notes |
|------------|-----------|----------------|-------|
| `@xyflow/react` | ~120 KB | Partial | ReactFlow for workflow canvas |
| `react-markdown` + `remark-gfm` | ~80 KB | No | Markdown rendering in chat |
| `react` + `react-dom` | ~45 KB | No | Framework |
| `zod` | ~30 KB | Yes | Schema validation |
| `lucide-react` | ~20 KB | Yes | Icons (tree-shaken) |
| `zustand` | ~3 KB | Yes | State management |

## Recommendations

### 1. Code-Split ReactFlow (HIGH impact, ~120 KB savings)

ReactFlow is only used in the WorkflowCanvas view. Lazy-load it:

```typescript
const WorkflowCanvas = lazy(() => import('./components/workflow-canvas/WorkflowCanvas'))
```

### 2. Code-Split Markdown Renderer (MEDIUM impact, ~80 KB savings)

`react-markdown` + `remark-gfm` are only needed in the chat view:

```typescript
const MarkdownMessage = lazy(() => import('./components/MarkdownMessage'))
```

### 3. Enable Rolldown Code Splitting (MEDIUM impact)

```typescript
// vite.config.ts
build: {
  rolldownOptions: {
    output: {
      codeSplitting: true,
    },
  },
}
```

### 4. Audit Server-Only Dependencies

These packages appear in `dependencies` but should be `devDependencies` or server-only — verify they aren't bundled into the frontend:

- `@anthropic-ai/sdk`, `openai` — API clients (gateway only)
- `@langchain/*` — agent framework (gateway only)
- `pg`, `better-sqlite3`, `drizzle-orm` — database (gateway only)
- `node-telegram-bot-api`, `twilio`, `ws` — channels (gateway only)
- `@ffmpeg-installer/ffmpeg`, `fluent-ffmpeg` — media (gateway only)
- `pdf-parse` — document processing (gateway only)
- `commander`, `inquirer`, `chalk`, `ora` — CLI (gateway only)

Vite tree-shakes unused imports, but explicit separation prevents accidental frontend inclusion.

### 5. Consider Compression

If not already configured on the CDN/server:

- Brotli compression: ~15% smaller than gzip (est. ~148 KB)
- Pre-compress at build time with `vite-plugin-compression`

## Priority Order

1. **Code-split ReactFlow** — largest single-dependency win
2. **Code-split Markdown** — second largest
3. **Enable Rolldown splitting** — automatic route-based chunks
4. **Audit server deps** — ensure clean separation
5. **Brotli** — deploy-time optimization

## Target

With splits #1-3 applied, the main chunk should drop below 350 KB raw / 110 KB gzipped, well under Vite's warning threshold.
