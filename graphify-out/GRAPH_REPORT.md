# Graph Report - C:\Users\adelm\SeaBridgeAI\openseabri  (2026-05-16)

## Corpus Check
- 336 files · ~345,279 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1488 nodes · 3024 edges · 86 communities detected
- Extraction: 58% EXTRACTED · 42% INFERRED · 0% AMBIGUOUS · INFERRED: 1264 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]

## God Nodes (most connected - your core abstractions)
1. `log()` - 67 edges
2. `handleSeabriApiRequest()` - 64 edges
3. `json()` - 44 edges
4. `handleInbound()` - 24 edges
5. `handleToolCall()` - 22 edges
6. `startGateway()` - 21 edges
7. `handleInbound()` - 21 edges
8. `ModelRegistry` - 18 edges
9. `pushActivity()` - 17 edges
10. `runResearchCycle()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `scanWebsite()` --calls--> `handleSeabriApiRequest()`  [INFERRED]
  C:\Users\adelm\SeaBridgeAI\openseabri\bridge\seabridge_client.ts → C:\Users\adelm\SeaBridgeAI\openseabri\gateway\seabri\api-handler.ts
- `printMigrationReport()` --calls--> `log()`  [INFERRED]
  cli\migrate.ts → C:\Users\adelm\SeaBridgeAI\openseabri\gateway\mcp\server.ts
- `cmdResearchReport()` --calls--> `getLastReport()`  [INFERRED]
  C:\Users\adelm\SeaBridgeAI\openseabri\cli\seabri.ts → C:\Users\adelm\SeaBridgeAI\openseabri\research\overnight.ts
- `startGateway()` --calls--> `startSessionCleanup()`  [INFERRED]
  C:\Users\adelm\SeaBridgeAI\openseabri\gateway\index.ts → C:\Users\adelm\SeaBridgeAI\openseabri\gateway\claim\session.ts
- `startGateway()` --calls--> `createApprovalTokenFactory()`  [INFERRED]
  C:\Users\adelm\SeaBridgeAI\openseabri\gateway\index.ts → gateway\cron\approval.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (82): handleSeabriApiRequest(), parseJsonWithSchema(), queryParams(), readBody(), list(), estimateCarbonGrams(), buildAgentScorecard(), identifyUnderperformers() (+74 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (56): initializePersistenceAdapterForStartup(), persistenceConfigIssues(), resolvePersistenceAdapter(), value(), buildDocumentHeader(), classifyDocument(), extractAudioFromVideo(), extractInsuranceFields() (+48 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (79): fail(), printResult(), ConnectionBadge(), statusColor(), fail(), checkLaunchdStatus(), checkSystemdStatus(), getDaemonStatus() (+71 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (46): getAgentName(), getSystemPrompt(), checkSeaBridgeConnection(), printWelcome(), startCliChannel(), compressHistory(), isSupportedLocale(), appendMemory() (+38 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (56): getExecutor(), detectActionKind(), extractActionCard(), generateConfirmCode(), isApproval(), isConfirmCode(), isDenial(), logConsent() (+48 more)

### Community 5 - "Community 5"
Cohesion: 0.04
Nodes (24): graphToWorkflow(), CarbonTracker, computeEquivalents(), estimateRequestCarbon(), CopilotError, WorkflowCopilot, evalAtom(), evaluateCondition() (+16 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (64): json(), forwardGeocodeWithGoogle(), forwardGeocodeWithNominatim(), geocodeAddress(), geocodeCoordinates(), parseGoogleResult(), parseNominatimResult(), reverseGeocodeWithGoogle() (+56 more)

### Community 7 - "Community 7"
Cohesion: 0.04
Nodes (29): classifyByKeywords(), classifyIntent(), classifyWithLLM(), validateConnector(), aggregateNode(), classifyNode(), executeNode(), planNode() (+21 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (36): listSkillsFormatted(), showSkill(), buildRagSkillsContext(), buildSkillsContext(), getSkillBody(), loadSkillContent(), loadSkillMetadata(), mergeMarkdown() (+28 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (36): canonical(), secret(), signRunApproval(), verifyRunApproval(), authorized(), handleAttachmentRequest(), json(), maxBytes() (+28 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (38): createToken(), hashPassword(), isAuthConfigured(), signIn(), signUp(), verifyPassword(), closeDb(), getDb() (+30 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (33): augmentAgentLatestContext(), augmentClimateRiskContext(), augmentMaterialityContext(), augmentMcpToolsContext(), augmentNatureRiskContext(), augmentRegulationContext(), augmentSustainabilityContext(), augmentTargetsContext() (+25 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (19): checkBudgetAlert(), checkDailyBudget(), checkSessionBudget(), getDailyBudgetLimit(), getSessionBudgetLimit(), carbonEquivalent(), generateCarbonReport(), generateRecommendations() (+11 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (8): defaultAgentRunner(), HermesAdapter, createDefaultRegistry(), UpstreamRegistry, MiroFishAdapter, OpenClawAdapter, SpaceAgentInstructionAdapter, tokens()

### Community 14 - "Community 14"
Cohesion: 0.1
Nodes (30): checkAndImprove(), improveSilently(), invalidateSkillCache(), assertSafeSkillId(), exportAllSkills(), exportSkill(), extractVersion(), importSkillFromBundle() (+22 more)

### Community 15 - "Community 15"
Cohesion: 0.09
Nodes (27): streamAnthropicMessage(), callGateway(), deleteProfile(), loadCatalog(), pushActivity(), runCarbon(), runCertification(), runCommunity() (+19 more)

### Community 16 - "Community 16"
Cohesion: 0.07
Nodes (7): AgentRegistry, buildBuiltinRegistry(), buildCapabilityRegistry(), buildFallbackText(), CapabilityRegistry, resolveCapabilityGap(), detectGaps()

### Community 17 - "Community 17"
Cohesion: 0.08
Nodes (16): cognitoEndpoint(), decodeJwtPayload(), isTokenExpired(), refreshCognitoTokens(), post(), assert(), close(), listen() (+8 more)

### Community 18 - "Community 18"
Cohesion: 0.13
Nodes (21): corsOrigin(), handleClaimApiRequest(), isAuthorized(), deriveStatus(), detectCATEvent(), detectCrisisLanguage(), evaluatePolicies(), isPacketComplete() (+13 more)

### Community 19 - "Community 19"
Cohesion: 0.09
Nodes (4): FakeWebSocket, McpClient, buildMcpRegistry(), McpRegistry

### Community 20 - "Community 20"
Cohesion: 0.15
Nodes (25): buildActionPreparationResponse(), buildIncidentResponse(), buildInsuranceResponse(), buildLocalHelpResponse(), buildPhotoResponse(), cleanProfileUpdates(), extractPolicyTerms(), findLatestDocument() (+17 more)

### Community 21 - "Community 21"
Cohesion: 0.22
Nodes (17): activeBackend(), extractKeywords(), indexSession(), indexSessionJson(), loadIndex(), rebuildSearchIndex(), saveIndex(), searchSessions() (+9 more)

### Community 22 - "Community 22"
Cohesion: 0.2
Nodes (16): classify(), handoffRoot(), kindOf(), latestFeynmanBrief(), listArtifacts(), readArtifact(), autoresearchDir(), buildArgs() (+8 more)

### Community 23 - "Community 23"
Cohesion: 0.13
Nodes (2): FixtureMunicipalAdapter, NotAvailableMunicipalAdapter

### Community 24 - "Community 24"
Cohesion: 0.23
Nodes (12): extractTopics(), generateReport(), getLastReport(), readProgram(), runOvernightResearch(), saveReport(), backup(), deriveMutationFromReport() (+4 more)

### Community 25 - "Community 25"
Cohesion: 0.27
Nodes (9): ApprovalSecretMissingError, createApprovalTokenFactory(), disablePreset(), enablePreset(), listRegisteredPresets(), loadStore(), runPresetNow(), saveStore() (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.29
Nodes (5): buildRecommendations(), computeCarbonScore(), computeEfficiencyScore(), computeRecommendationScore(), scoreDecision()

### Community 27 - "Community 27"
Cohesion: 0.36
Nodes (7): aggregateFeedback(), classifyFeedback(), classifySignal(), computeAgentAggregate(), createExplicitFeedback(), createImplicitFeedback(), generateId()

### Community 28 - "Community 28"
Cohesion: 0.36
Nodes (5): clamp(), computeOverallScore(), createSustainabilityScore(), formatScoreReport(), scoreToBand()

### Community 29 - "Community 29"
Cohesion: 0.25
Nodes (1): SeaBriClientError

### Community 30 - "Community 30"
Cohesion: 0.29
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 0.33
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 0.4
Nodes (2): buildPropertyRiskContext(), riskLine()

### Community 33 - "Community 33"
Cohesion: 0.5
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 0.67
Nodes (2): handleKeyDown(), handleSend()

### Community 35 - "Community 35"
Cohesion: 0.67
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (1): SpeechRecognition

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Community 58"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Community 61"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "Community 62"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "Community 63"
Cohesion: 1.0
Nodes (0): 

### Community 64 - "Community 64"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "Community 65"
Cohesion: 1.0
Nodes (0): 

### Community 66 - "Community 66"
Cohesion: 1.0
Nodes (0): 

### Community 67 - "Community 67"
Cohesion: 1.0
Nodes (0): 

### Community 68 - "Community 68"
Cohesion: 1.0
Nodes (0): 

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (0): 

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (0): 

### Community 71 - "Community 71"
Cohesion: 1.0
Nodes (0): 

### Community 72 - "Community 72"
Cohesion: 1.0
Nodes (0): 

### Community 73 - "Community 73"
Cohesion: 1.0
Nodes (0): 

### Community 74 - "Community 74"
Cohesion: 1.0
Nodes (0): 

### Community 75 - "Community 75"
Cohesion: 1.0
Nodes (0): 

### Community 76 - "Community 76"
Cohesion: 1.0
Nodes (0): 

### Community 77 - "Community 77"
Cohesion: 1.0
Nodes (0): 

### Community 78 - "Community 78"
Cohesion: 1.0
Nodes (0): 

### Community 79 - "Community 79"
Cohesion: 1.0
Nodes (0): 

### Community 80 - "Community 80"
Cohesion: 1.0
Nodes (0): 

### Community 81 - "Community 81"
Cohesion: 1.0
Nodes (0): 

### Community 82 - "Community 82"
Cohesion: 1.0
Nodes (0): 

### Community 83 - "Community 83"
Cohesion: 1.0
Nodes (0): 

### Community 84 - "Community 84"
Cohesion: 1.0
Nodes (0): 

### Community 85 - "Community 85"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **1 isolated node(s):** `SpeechRecognition`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 36`** (2 nodes): `localhost-anatomy.tsx`, `Button()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (2 nodes): `registry.test.ts`, `executor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (2 nodes): `formatRelative()`, `SessionsSidebar.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (2 nodes): `VoiceButton.tsx`, `VoiceButton()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (2 nodes): `getAgent()`, `agents.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (2 nodes): `uid()`, `id.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (2 nodes): `claim.test.ts`, `makePacket()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (2 nodes): `openseabri.d.ts`, `SpeechRecognition`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `drizzle.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `playwright.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `tailwind.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `vitest.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `vitest.setup.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `localhost-tailwind.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `localhost-theme.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (1 nodes): `approval.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (1 nodes): `stdio.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (1 nodes): `hmac.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (1 nodes): `client.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (1 nodes): `knowledge-vault.ps1`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (1 nodes): `release-check.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (1 nodes): `stop-gateway-ports.ps1`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (1 nodes): `validate-production.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (1 nodes): `validate-staging.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (1 nodes): `main.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (1 nodes): `VoicePanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (1 nodes): `CanvasPane.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (1 nodes): `ClaimPacketPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (1 nodes): `OperatorPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (1 nodes): `RecommendationList.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (1 nodes): `SeaBriOSPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (1 nodes): `StatCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (1 nodes): `AgentNode.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (1 nodes): `ConditionNode.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (1 nodes): `LoopNode.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 78`** (1 nodes): `ParallelNode.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (1 nodes): `ToolNode.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80`** (1 nodes): `canvas.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (1 nodes): `claim.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (1 nodes): `canvas.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 83`** (1 nodes): `canvas.spec.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 84`** (1 nodes): `pilot-workspace.spec.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 85`** (1 nodes): `node-telegram-bot-api.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `log()` connect `Community 2` to `Community 1`, `Community 3`, `Community 6`, `Community 8`, `Community 10`, `Community 14`, `Community 17`, `Community 24`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Why does `handleSeabriApiRequest()` connect `Community 0` to `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 11`, `Community 12`, `Community 15`, `Community 18`, `Community 20`, `Community 26`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `json()` connect `Community 6` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 7`, `Community 13`, `Community 14`, `Community 15`, `Community 17`, `Community 18`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Are the 63 inferred relationships involving `log()` (e.g. with `printMigrationReport()` and `cmdChat()`) actually correct?**
  _`log()` has 63 INFERRED edges - model-reasoned connections that need verification._
- **Are the 58 inferred relationships involving `handleSeabriApiRequest()` (e.g. with `listCapabilityViews()` and `listAgentViews()`) actually correct?**
  _`handleSeabriApiRequest()` has 58 INFERRED edges - model-reasoned connections that need verification._
- **Are the 41 inferred relationships involving `json()` (e.g. with `corsOrigin()` and `handleClaimApiRequest()`) actually correct?**
  _`json()` has 41 INFERRED edges - model-reasoned connections that need verification._
- **Are the 23 inferred relationships involving `handleInbound()` (e.g. with `getState()` and `handleWhatsAppWebhook()`) actually correct?**
  _`handleInbound()` has 23 INFERRED edges - model-reasoned connections that need verification._