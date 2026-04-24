# Graph Report - C:\Users\adelm\SeaBridgeAI\openseabri  (2026-04-23)

## Corpus Check
- 104 files · ~110,146 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 465 nodes · 944 edges · 39 communities detected
- Extraction: 79% EXTRACTED · 21% INFERRED · 0% AMBIGUOUS · INFERRED: 198 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_bridge|bridge]]
- [[_COMMUNITY_cli|cli]]
- [[_COMMUNITY_gateway|gateway]]
- [[_COMMUNITY_gateway|gateway]]
- [[_COMMUNITY_gateway|gateway]]
- [[_COMMUNITY_gateway|gateway]]
- [[_COMMUNITY_research|research]]
- [[_COMMUNITY_gateway|gateway]]
- [[_COMMUNITY_gateway|gateway]]
- [[_COMMUNITY_daemon|daemon]]
- [[_COMMUNITY_gateway|gateway]]
- [[_COMMUNITY_integrations|integrations]]
- [[_COMMUNITY_cli|cli]]
- [[_COMMUNITY_research|research]]
- [[_COMMUNITY_gateway|gateway]]
- [[_COMMUNITY_gateway|gateway]]
- [[_COMMUNITY_gateway|gateway]]
- [[_COMMUNITY_integrations|integrations]]
- [[_COMMUNITY_gateway|gateway]]
- [[_COMMUNITY_srccomponents|src/components]]
- [[_COMMUNITY_srcstore|src/store]]
- [[_COMMUNITY_srcstore|src/store]]
- [[_COMMUNITY_srccomponents|src/components]]
- [[_COMMUNITY_srclib|src/lib]]
- [[_COMMUNITY_srclib|src/lib]]
- [[_COMMUNITY_playwright.config.ts|playwright.config.ts]]
- [[_COMMUNITY_tailwind.config.js|tailwind.config.js]]
- [[_COMMUNITY_vite.config.js|vite.config.js]]
- [[_COMMUNITY_vitest.config.ts|vitest.config.ts]]
- [[_COMMUNITY_gateway|gateway]]
- [[_COMMUNITY_gateway|gateway]]
- [[_COMMUNITY_srcApp.tsx|src/App.tsx]]
- [[_COMMUNITY_srcmain.tsx|src/main.tsx]]
- [[_COMMUNITY_srccomponents|src/components]]
- [[_COMMUNITY_srcstore|src/store]]
- [[_COMMUNITY_srctypes|src/types]]
- [[_COMMUNITY_srctypes|src/types]]
- [[_COMMUNITY_tests|tests]]
- [[_COMMUNITY_types|types]]

## God Nodes (most connected - your core abstractions)
1. `log()` - 54 edges
2. `ManageEsgClient` - 14 edges
3. `runResearchCycle()` - 14 edges
4. `json()` - 13 edges
5. `routeMessage()` - 12 edges
6. `safeStr()` - 11 edges
7. `isSeaBridgeAvailable()` - 11 edges
8. `loadPolicy()` - 11 edges
9. `startGateway()` - 10 edges
10. `runOvernightResearch()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `printMigrationReport()` --calls--> `log()`  [INFERRED]
  cli\migrate.ts → gateway\mcp\server.ts
- `cmdResearchReport()` --calls--> `getLastReport()`  [INFERRED]
  cli\seabri.ts → research\overnight.ts
- `runOvernightResearch()` --calls--> `runPool()`  [INFERRED]
  research\overnight.ts → research\worker.ts
- `augmentTransitionRiskContext()` --calls--> `getTransitionRiskData()`  [INFERRED]
  bridge\agent_bridge.ts → bridge\seabridge_client.ts
- `runPresetNow()` --calls--> `runAgent()`  [INFERRED]
  gateway\cron\presets.ts → bridge\seabridge_client.ts

## Communities

### Community 0 - "bridge"
Cohesion: 0.07
Nodes (30): augmentAgentLatestContext(), augmentClimateRiskContext(), augmentMaterialityContext(), augmentMcpToolsContext(), augmentNatureRiskContext(), augmentRegulationContext(), augmentSustainabilityContext(), augmentTargetsContext() (+22 more)

### Community 1 - "cli"
Cohesion: 0.11
Nodes (38): checkAnthropicConnection(), checkGatewayRunning(), checkSeaBridgeConnection(), cmdAgents(), cmdBriefing(), cmdChat(), cmdCronAdd(), cmdCronList() (+30 more)

### Community 2 - "gateway"
Cohesion: 0.08
Nodes (20): ApprovalSecretMissingError, createApprovalTokenFactory(), main(), checkSeaBridgeConnection(), printBanner(), startGateway(), disablePreset(), enablePreset() (+12 more)

### Community 3 - "gateway"
Cohesion: 0.1
Nodes (29): getAgentName(), getSystemPrompt(), checkSeaBridgeConnection(), printWelcome(), startCliChannel(), compressHistory(), copyBuiltinToUser(), getPersonalityPrompt() (+21 more)

### Community 4 - "gateway"
Cohesion: 0.12
Nodes (14): clearSenderPolicy(), getPreferredAgent(), isAllowed(), isComplianceTagAllowed(), loadPolicy(), policyPath(), requiresPairing(), savePolicy() (+6 more)

### Community 5 - "gateway"
Cohesion: 0.12
Nodes (22): checkAndImprove(), improveSilently(), listSkillsFormatted(), showSkill(), buildSkillsContext(), invalidateSkillCache(), loadSkillContent(), loadSkillMetadata() (+14 more)

### Community 6 - "research"
Cohesion: 0.16
Nodes (21): streamAnthropicMessage(), json(), appendStrategyNote(), appendToDiscardedFile(), appendToFindingsFile(), formatFindingsMarkdown(), getCoveredTopicsToday(), main() (+13 more)

### Community 7 - "gateway"
Cohesion: 0.2
Nodes (18): cmdSearch(), activeBackend(), extractKeywords(), indexSession(), indexSessionJson(), loadIndex(), rebuildSearchIndex(), saveIndex() (+10 more)

### Community 8 - "gateway"
Cohesion: 0.19
Nodes (17): createSession(), getOrCreateSession(), renameSession(), resetSession(), updateSession(), dispatch(), handleInitialize(), handleToolCall() (+9 more)

### Community 9 - "daemon"
Cohesion: 0.2
Nodes (18): checkLaunchdStatus(), checkSystemdStatus(), getDaemonStatus(), getGatewayEntryPoint(), getNodePath(), installDaemon(), installLaunchd(), installSystemd() (+10 more)

### Community 10 - "gateway"
Cohesion: 0.2
Nodes (14): authorized(), handleAttachmentRequest(), maxBytes(), readBody(), blobPath(), deleteBlob(), getBlob(), hashBytes() (+6 more)

### Community 11 - "integrations"
Cohesion: 0.2
Nodes (15): classify(), handoffRoot(), kindOf(), latestFeynmanBrief(), listArtifacts(), autoresearchDir(), buildArgs(), ensureHandoffDir() (+7 more)

### Community 12 - "cli"
Cohesion: 0.3
Nodes (14): mergeMarkdown(), migrateApprovedSenders(), migrateCrons(), migrateMarkdown(), migrateSearchIndex(), migrateSessions(), migrateUserSkills(), pathExists() (+6 more)

### Community 13 - "research"
Cohesion: 0.24
Nodes (12): extractTopics(), generateReport(), getLastReport(), readProgram(), runOvernightResearch(), saveReport(), backup(), deriveMutationFromReport() (+4 more)

### Community 14 - "gateway"
Cohesion: 0.32
Nodes (12): appendMemory(), buildSystemContext(), fileExists(), initWorkspace(), maybeNudgeUserModel(), nudgeUserModelSilently(), readMemory(), readSkills() (+4 more)

### Community 15 - "gateway"
Cohesion: 0.41
Nodes (11): addCronJob(), generateId(), listCronJobs(), loadStore(), pauseCronJob(), removeCronJob(), resumeCronJob(), runJob() (+3 more)

### Community 16 - "gateway"
Cohesion: 0.4
Nodes (10): approveSender(), createPairingCode(), generateCode(), isApproved(), listApproved(), loadData(), revokeSender(), saveData() (+2 more)

### Community 17 - "integrations"
Cohesion: 0.47
Nodes (4): cognitoEndpoint(), decodeJwtPayload(), isTokenExpired(), refreshCognitoTokens()

### Community 18 - "gateway"
Cohesion: 0.8
Nodes (4): canonical(), secret(), signRunApproval(), verifyRunApproval()

### Community 19 - "src/components"
Cohesion: 0.67
Nodes (2): ConnectionBadge(), statusColor()

### Community 20 - "src/store"
Cohesion: 0.5
Nodes (1): FakeWebSocket

### Community 21 - "src/store"
Cohesion: 0.5
Nodes (0): 

### Community 22 - "src/components"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "src/lib"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "src/lib"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "playwright.config.ts"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "tailwind.config.js"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "vite.config.js"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "vitest.config.ts"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "gateway"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "gateway"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "src/App.tsx"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "src/main.tsx"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "src/components"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "src/store"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "src/types"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "src/types"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "tests"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "types"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `src/components`** (2 nodes): `formatRelative()`, `SessionsSidebar.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `src/lib`** (2 nodes): `getAgent()`, `agents.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `src/lib`** (2 nodes): `uid()`, `id.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `playwright.config.ts`** (1 nodes): `playwright.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `tailwind.config.js`** (1 nodes): `tailwind.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `vite.config.js`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `vitest.config.ts`** (1 nodes): `vitest.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `gateway`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `gateway`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `src/App.tsx`** (1 nodes): `App.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `src/main.tsx`** (1 nodes): `main.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `src/components`** (1 nodes): `CanvasPane.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `src/store`** (1 nodes): `canvas.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `src/types`** (1 nodes): `canvas.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `src/types`** (1 nodes): `openseabri.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `tests`** (1 nodes): `canvas.spec.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `types`** (1 nodes): `node-telegram-bot-api.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `log()` connect `cli` to `gateway`, `gateway`, `gateway`, `gateway`, `research`, `gateway`, `gateway`, `daemon`, `cli`, `research`, `gateway`, `gateway`?**
  _High betweenness centrality (0.303) - this node is a cross-community bridge._
- **Why does `activeBackend()` connect `gateway` to `cli`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `printMigrationReport()` connect `cli` to `cli`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Are the 51 inferred relationships involving `log()` (e.g. with `printMigrationReport()` and `cmdChat()`) actually correct?**
  _`log()` has 51 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `runResearchCycle()` (e.g. with `log()` and `scoreFinding()`) actually correct?**
  _`runResearchCycle()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `json()` (e.g. with `routeMessage()` and `parseNaturalLanguageCron()`) actually correct?**
  _`json()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `routeMessage()` (e.g. with `cmdBriefing()` and `buildSystemContext()`) actually correct?**
  _`routeMessage()` has 10 INFERRED edges - model-reasoned connections that need verification._