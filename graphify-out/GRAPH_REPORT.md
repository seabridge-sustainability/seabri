# Graph Report - .  (2026-05-11)

## Corpus Check
- 328 files Â· ~0 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1389 nodes Â· 1809 edges Â· 252 communities detected
- Extraction: 64% EXTRACTED Â· 36% INFERRED Â· 0% AMBIGUOUS Â· INFERRED: 657 edges (avg confidence: 0.5)
- Token cost: 0 input Â· 0 output

## God Nodes (most connected - your core abstractions)
1. `ModelRegistry` - 17 edges
2. `McpRegistry` - 13 edges
3. `pushActivity()` - 13 edges
4. `runResearchCycle()` - 12 edges
5. `safeStr()` - 11 edges
6. `inlandFloodAssessment()` - 11 edges
7. `heatStressAssessment()` - 11 edges
8. `droughtStressAssessment()` - 11 edges
9. `SkillRegistry` - 11 edges
10. `coastalFloodAssessment()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `json()` --calls--> `corsOrigin()`  [INFERRED]
  gateway\seabri\api-handler.ts â†’ gateway\claim\api-handler.ts
- `handleClaimApiRequest()` --calls--> `json()`  [INFERRED]
  gateway\claim\api-handler.ts â†’ gateway\seabri\api-handler.ts
- `handleClaimApiRequest()` --calls--> `isAuthorized()`  [INFERRED]
  gateway\claim\api-handler.ts â†’ gateway\seabri\api-handler.ts
- `handleClaimApiRequest()` --calls--> `readBody()`  [INFERRED]
  gateway\claim\api-handler.ts â†’ gateway\seabri\api-handler.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (17): corsOrigin(), handleClaimApiRequest(), handleSeabriApiRequest(), isAuthorized(), json(), parseJsonWithSchema(), queryParams(), readBody() (+9 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (18): callGateway(), deleteProfile(), loadCatalog(), pushActivity(), runCarbon(), runCertification(), runCommunity(), runComparison() (+10 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (15): checkAnthropicConnection(), checkGatewayRunning(), cmdDaemonInstall(), cmdDoctor(), cmdMemory(), cmdOnboard(), cmdResearch(), cmdResearchOvernight() (+7 more)

### Community 3 - "Community 3"
Cohesion: 0.1
Nodes (27): blobPath(), DatabaseTelemetryStore, defaultTelemetryPath(), deleteBlob(), deleteSession(), ensureSessionsDir(), FileTelemetryStore, getBlob() (+19 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (18): addCronJob(), checkSeaBridgeConnection(), createDefaultRegistry(), createSession(), generateId(), getOrCreateSession(), listCronJobs(), loadStore() (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.2
Nodes (28): clamp(), coastalFloodAssessment(), droughtStressAssessment(), executePerilTool(), fetchAQI(), fetchDroughtLevel(), fetchElevation(), fetchFIRSFireCount() (+20 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (2): getClimateRiskSummary(), toOptionalFloat()

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (3): buildBuiltinModelRegistry(), buildModelRegistry(), ModelRegistry

### Community 8 - "Community 8"
Cohesion: 0.21
Nodes (9): evalAtom(), evaluateCondition(), interpolate(), parseLiteral(), resolvePath(), resolveValue(), sleep(), withTimeout() (+1 more)

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (14): buildRagSkillsContext(), buildSkillsContext(), copyBuiltinToUser(), getPersonalityPrompt(), getSkillBody(), idFromFilename(), initUserPersonalitiesDir(), listDir() (+6 more)

### Community 10 - "Community 10"
Cohesion: 0.25
Nodes (14): escapeXml(), getHistory(), handleInitialCall(), handleSpeechInput(), handleVoiceWebhook(), parseForm(), readBody(), sayAndGather() (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.28
Nodes (13): mergeMarkdown(), migrateApprovedSenders(), migrateCrons(), migrateMarkdown(), migrateSearchIndex(), migrateSessions(), migrateUserSkills(), pathExists() (+5 more)

### Community 12 - "Community 12"
Cohesion: 0.23
Nodes (13): accountSid(), authToken(), downloadMedia(), fromNumber(), getState(), handleInbound(), handleSmsWebhook(), isTrustedMediaUrl() (+5 more)

### Community 13 - "Community 13"
Cohesion: 0.25
Nodes (15): buildActionPreparationResponse(), buildIncidentResponse(), buildInsuranceResponse(), buildLocalHelpResponse(), buildPhotoResponse(), cleanProfileUpdates(), extractPolicyTerms(), findLatestDocument() (+7 more)

### Community 14 - "Community 14"
Cohesion: 0.23
Nodes (12): dispatch(), handleInitialize(), handleResourcesList(), handleResourcesRead(), handleToolCall(), handleToolsList(), log(), resolvePort() (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.18
Nodes (2): buildMcpRegistry(), McpRegistry

### Community 16 - "Community 16"
Cohesion: 0.16
Nodes (2): McpClient, SeaBriClientError

### Community 17 - "Community 17"
Cohesion: 0.22
Nodes (9): cognitoEndpoint(), createToken(), decodeJwtPayload(), hashPassword(), isTokenExpired(), refreshCognitoTokens(), signIn(), signUp() (+1 more)

### Community 18 - "Community 18"
Cohesion: 0.14
Nodes (1): ApprovalSecretMissingError

### Community 19 - "Community 19"
Cohesion: 0.35
Nodes (13): buildCommunityResilienceChecklist(), buildSustainablePurchasingChecklist(), checkCarbonOffsetQuality(), estimateHouseholdCarbon(), impact(), isSpanish(), labels(), navigateCertification() (+5 more)

### Community 20 - "Community 20"
Cohesion: 0.2
Nodes (2): getGlobalLevel(), Logger

### Community 21 - "Community 21"
Cohesion: 0.31
Nodes (13): appendStrategyNote(), appendToDiscardedFile(), appendToFindingsFile(), formatFindingsMarkdown(), getCoveredTopicsToday(), main(), parseAgenda(), pickNextTopic() (+5 more)

### Community 22 - "Community 22"
Cohesion: 0.35
Nodes (12): augmentAgentLatestContext(), augmentClimateRiskContext(), augmentMaterialityContext(), augmentMcpToolsContext(), augmentNatureRiskContext(), augmentRegulationContext(), augmentSustainabilityContext(), augmentTargetsContext() (+4 more)

### Community 23 - "Community 23"
Cohesion: 0.32
Nodes (12): appendMemory(), buildSystemContext(), fileExists(), initWorkspace(), maybeNudgeUserModel(), nudgeUserModelSilently(), readMemory(), readSkills() (+4 more)

### Community 24 - "Community 24"
Cohesion: 0.33
Nodes (8): databaseStore(), deleteProfile(), getProfile(), key(), load(), persist(), upsertProfile(), useDatabaseProfileStore()

### Community 25 - "Community 25"
Cohesion: 0.32
Nodes (12): clearSenderPolicy(), getPreferredAgent(), hasDangerousKey(), isAllowed(), isComplianceTagAllowed(), loadPolicy(), policyPath(), requiresPairing() (+4 more)

### Community 26 - "Community 26"
Cohesion: 0.32
Nodes (11): checkLaunchdStatus(), checkSystemdStatus(), getDaemonStatus(), getGatewayEntryPoint(), getNodePath(), installDaemon(), installLaunchd(), installSystemd() (+3 more)

### Community 27 - "Community 27"
Cohesion: 0.18
Nodes (2): FakeClient, FakeServer

### Community 28 - "Community 28"
Cohesion: 0.21
Nodes (4): buildCapabilityRegistry(), buildFallbackText(), CapabilityRegistry, resolveCapabilityGap()

### Community 29 - "Community 29"
Cohesion: 0.24
Nodes (1): SkillRegistry

### Community 30 - "Community 30"
Cohesion: 0.33
Nodes (10): allowedTestNumbers(), digitsOnly(), env(), getProviderReadiness(), getProviderReadinessWithEvidence(), liveProvidersAllowed(), missing(), numberAllowed() (+2 more)

### Community 31 - "Community 31"
Cohesion: 0.25
Nodes (5): getState(), handleInbound(), handleWhatsAppWebhook(), readRawBody(), verifyWebhookSignature()

### Community 32 - "Community 32"
Cohesion: 0.27
Nodes (7): aggregateFeedback(), classifyFeedback(), classifySignal(), computeAgentAggregate(), createExplicitFeedback(), createImplicitFeedback(), generateId()

### Community 33 - "Community 33"
Cohesion: 0.2
Nodes (2): generateId(), WorkflowTriggerManager

### Community 34 - "Community 34"
Cohesion: 0.35
Nodes (10): autoresearchDir(), buildArgs(), ensureHandoffDir(), findPowerShell(), orchestratorScript(), runFeynman(), runGraphify(), runOrchestrator() (+2 more)

### Community 35 - "Community 35"
Cohesion: 0.22
Nodes (2): allowlist(), startOptionalChannels()

### Community 36 - "Community 36"
Cohesion: 0.47
Nodes (9): activeBackend(), extractKeywords(), indexSession(), indexSessionJson(), loadIndex(), rebuildSearchIndex(), saveIndex(), searchSessions() (+1 more)

### Community 37 - "Community 37"
Cohesion: 0.38
Nodes (8): escapeFtsQuery(), indexSessionSqlite(), initDb(), isAvailable(), loadDriver(), openDb(), rebuildIndex(), searchSessionsSqlite()

### Community 38 - "Community 38"
Cohesion: 0.44
Nodes (9): approveSender(), createPairingCode(), generateCode(), isApproved(), listApproved(), loadData(), revokeSender(), saveData() (+1 more)

### Community 39 - "Community 39"
Cohesion: 0.39
Nodes (7): callOpenKbProxy(), executeTool(), geocodeAddress(), getApprovalToken(), getOptionalKbName(), lookupFloodZone(), webSearch()

### Community 40 - "Community 40"
Cohesion: 0.36
Nodes (3): DatabaseProfileStore, DatabaseProviderValidationStore, profileKey()

### Community 41 - "Community 41"
Cohesion: 0.31
Nodes (2): AgentRegistry, buildBuiltinRegistry()

### Community 42 - "Community 42"
Cohesion: 0.44
Nodes (8): forwardGeocodeWithGoogle(), forwardGeocodeWithNominatim(), geocodeAddress(), geocodeCoordinates(), parseGoogleResult(), parseNominatimResult(), reverseGeocodeWithGoogle(), reverseGeocodeWithNominatim()

### Community 43 - "Community 43"
Cohesion: 0.36
Nodes (6): latestProviderValidationEvidence(), listProviderValidationEvidence(), recordProviderValidationEvidence(), redactReference(), sanitizeProviderValidationEvidence(), store()

### Community 44 - "Community 44"
Cohesion: 0.25
Nodes (2): getAgentView(), listAgentViews()

### Community 45 - "Community 45"
Cohesion: 0.28
Nodes (3): CarbonTracker, computeEquivalents(), estimateRequestCarbon()

### Community 46 - "Community 46"
Cohesion: 0.31
Nodes (2): handleKeyDown(), handleSend()

### Community 47 - "Community 47"
Cohesion: 0.28
Nodes (4): addPilotActivity(), emptyPilotProfile(), emptyPilotState(), sanitizePilotDetail()

### Community 48 - "Community 48"
Cohesion: 0.36
Nodes (7): buildRecommendations(), computeCarbonScore(), computeEfficiencyScore(), computeRecommendationScore(), heuristicScore(), scoreDecision(), scoreFinding()

### Community 49 - "Community 49"
Cohesion: 0.36
Nodes (4): addOperatorNote(), finalizeSession(), getSession(), updateSession()

### Community 50 - "Community 50"
Cohesion: 0.54
Nodes (7): disablePreset(), enablePreset(), listRegisteredPresets(), loadStore(), runPresetNow(), saveStore(), startEnabledPresets()

### Community 51 - "Community 51"
Cohesion: 0.39
Nodes (5): countPatternMatches(), describeSignals(), extractComplexitySignals(), scoreComplexity(), selectModel()

### Community 52 - "Community 52"
Cohesion: 0.43
Nodes (7): assertSafeSkillId(), exportAllSkills(), exportSkill(), extractVersion(), importSkillFromBundle(), importSkillFromFile(), listSkillVersions()

### Community 53 - "Community 53"
Cohesion: 0.39
Nodes (5): parseFrontmatter(), parseMiniYaml(), parseScalarOrInlineArray(), SkillValidationError, stripScalar()

### Community 54 - "Community 54"
Cohesion: 0.54
Nodes (7): bool(), enabledChannelsFrom(), hasProductionPersistence(), issue(), resolveStartupMode(), validateStartupConfig(), value()

### Community 55 - "Community 55"
Cohesion: 0.29
Nodes (2): CopilotError, WorkflowCopilot

### Community 56 - "Community 56"
Cohesion: 0.46
Nodes (7): eccSkillsRoot(), findSkill(), listSkills(), parseFrontmatter(), parseTriggers(), readSkill(), skillsHubSummary()

### Community 57 - "Community 57"
Cohesion: 0.39
Nodes (5): extractTopics(), generateReport(), readProgram(), runOvernightResearch(), saveReport()

### Community 58 - "Community 58"
Cohesion: 0.62
Nodes (6): checkScmStatus(), gatewayEntryPoint(), installScm(), loadNodeWindows(), makeService(), uninstallScm()

### Community 59 - "Community 59"
Cohesion: 0.38
Nodes (3): agentListText(), handleSlashCommand(), personalityListText()

### Community 60 - "Community 60"
Cohesion: 0.29
Nodes (0):

### Community 61 - "Community 61"
Cohesion: 0.52
Nodes (6): buildDocumentHeader(), classifyDocument(), extractAudioFromVideo(), extractInsuranceFields(), processAttachment(), transcribeWithWhisper()

### Community 62 - "Community 62"
Cohesion: 0.43
Nodes (5): normalizePhone(), readConfiguredFile(), readConfiguredSearchEndpoint(), searchLocalResources(), toResource()

### Community 63 - "Community 63"
Cohesion: 0.52
Nodes (6): buildTwimlUrl(), checkCallAllowed(), checkSmsAllowed(), digitsOnly(), initiateOutboundCall(), initiateOutboundSms()

### Community 64 - "Community 64"
Cohesion: 0.43
Nodes (1): HermesAdapter

### Community 65 - "Community 65"
Cohesion: 0.33
Nodes (1): OpenClawAdapter

### Community 66 - "Community 66"
Cohesion: 0.48
Nodes (5): classify(), handoffRoot(), kindOf(), latestFeynmanBrief(), listArtifacts()

### Community 67 - "Community 67"
Cohesion: 0.52
Nodes (5): backup(), mutateProgram(), readProgram(), renderManagedBlock(), spliceManagedBlock()

### Community 68 - "Community 68"
Cohesion: 0.53
Nodes (5): buildSynthesisPrompt(), consultOne(), consultPanel(), validateAgents(), withTimeout()

### Community 69 - "Community 69"
Cohesion: 0.53
Nodes (4): channelGateSummary(), configuredChannelIds(), enabledChannelSet(), isChannelExplicitlyEnabled()

### Community 70 - "Community 70"
Cohesion: 0.47
Nodes (4): buildAgentListText(), buildWelcomeText(), makeLruMap(), startTelegramChannel()

### Community 71 - "Community 71"
Cohesion: 0.4
Nodes (2): deriveStatus(), isPacketComplete()

### Community 72 - "Community 72"
Cohesion: 0.53
Nodes (4): formatTranscriptForClaude(), generateOpeningMessage(), getClient(), runClaimTurn()

### Community 73 - "Community 73"
Cohesion: 0.53
Nodes (4): buildIdf(), rankByTfIdf(), tfidfVector(), tokenize()

### Community 74 - "Community 74"
Cohesion: 0.4
Nodes (2): estimateCarbon(), recordMetric()

### Community 75 - "Community 75"
Cohesion: 0.47
Nodes (4): checkDailyBudget(), checkSessionBudget(), getDailyBudgetLimit(), getSessionBudgetLimit()

### Community 76 - "Community 76"
Cohesion: 0.33
Nodes (0):

### Community 77 - "Community 77"
Cohesion: 0.47
Nodes (3): validateSkillBody(), validateSkillFile(), validateSkillSource()

### Community 78 - "Community 78"
Cohesion: 0.53
Nodes (5): clamp(), computeOverallScore(), createSustainabilityScore(), formatScoreReport(), scoreToBand()

### Community 79 - "Community 79"
Cohesion: 0.4
Nodes (1): MiroFishAdapter

### Community 80 - "Community 80"
Cohesion: 0.47
Nodes (3): buildAgentScorecard(), normalizeCost(), normalizeLatency()

### Community 81 - "Community 81"
Cohesion: 0.4
Nodes (2): generateId(), parseRefinementResponse()

### Community 82 - "Community 82"
Cohesion: 0.53
Nodes (4): analyzeWorkflow(), buildOptimizationSuggestions(), buildTransitiveDeps(), findParallelizableGroups()

### Community 83 - "Community 83"
Cohesion: 0.33
Nodes (0):

### Community 84 - "Community 84"
Cohesion: 0.6
Nodes (5): canvasSmoke(), fail(), fetchJson(), main(), wsSmoke()

### Community 85 - "Community 85"
Cohesion: 0.6
Nodes (5): canvasSmoke(), fetchJson(), main(), requireValue(), wsSlashSmoke()

### Community 86 - "Community 86"
Cohesion: 0.4
Nodes (0):

### Community 87 - "Community 87"
Cohesion: 0.7
Nodes (4): getBridgeContext(), routeMessage(), streamOneTurn(), toApiMessages()

### Community 88 - "Community 88"
Cohesion: 0.4
Nodes (0):

### Community 89 - "Community 89"
Cohesion: 0.5
Nodes (2): makeBotStub(), makeChannelWithBot()

### Community 90 - "Community 90"
Cohesion: 0.5
Nodes (2): buildExecutionPlan(), nextStepId()

### Community 91 - "Community 91"
Cohesion: 0.8
Nodes (4): initializePersistenceAdapterForStartup(), persistenceConfigIssues(), resolvePersistenceAdapter(), value()

### Community 92 - "Community 92"
Cohesion: 0.4
Nodes (0):

### Community 93 - "Community 93"
Cohesion: 0.5
Nodes (2): buildPropertyRiskContext(), riskLine()

### Community 94 - "Community 94"
Cohesion: 0.8
Nodes (4): canonical(), secret(), signRunApproval(), verifyRunApproval()

### Community 95 - "Community 95"
Cohesion: 0.4
Nodes (0):

### Community 96 - "Community 96"
Cohesion: 0.6
Nodes (3): newId(), RESEARCH_PROMPT(), runExperimentWithBudget()

### Community 97 - "Community 97"
Cohesion: 0.6
Nodes (3): isPlaceholder(), present(), value()

### Community 98 - "Community 98"
Cohesion: 0.8
Nodes (4): git(), gitMaybe(), main(), reportOne()

### Community 99 - "Community 99"
Cohesion: 0.4
Nodes (0):

### Community 100 - "Community 100"
Cohesion: 0.5
Nodes (0):

### Community 101 - "Community 101"
Cohesion: 0.83
Nodes (3): checkSeaBridgeConnection(), printWelcome(), startCliChannel()

### Community 102 - "Community 102"
Cohesion: 0.5
Nodes (0):

### Community 103 - "Community 103"
Cohesion: 0.83
Nodes (3): classifyByKeywords(), classifyIntent(), classifyWithLLM()

### Community 104 - "Community 104"
Cohesion: 0.83
Nodes (3): isCompanionSurface(), isHarnessSurface(), productForChannel()

### Community 105 - "Community 105"
Cohesion: 0.83
Nodes (3): carbonEquivalent(), generateCarbonReport(), generateRecommendations()

### Community 106 - "Community 106"
Cohesion: 0.5
Nodes (0):

### Community 107 - "Community 107"
Cohesion: 0.67
Nodes (2): clamp(), scoreSustainability()

### Community 108 - "Community 108"
Cohesion: 1.0
Nodes (3): isComplex(), optimizeSustainableCompute(), reductionRange()

### Community 109 - "Community 109"
Cohesion: 0.5
Nodes (0):

### Community 110 - "Community 110"
Cohesion: 0.5
Nodes (0):

### Community 111 - "Community 111"
Cohesion: 0.83
Nodes (3): loadUserConfig(), saveUserConfig(), setUserConfigField()

### Community 112 - "Community 112"
Cohesion: 0.5
Nodes (0):

### Community 113 - "Community 113"
Cohesion: 0.67
Nodes (0):

### Community 114 - "Community 114"
Cohesion: 0.67
Nodes (0):

### Community 115 - "Community 115"
Cohesion: 0.67
Nodes (0):

### Community 116 - "Community 116"
Cohesion: 0.67
Nodes (0):

### Community 117 - "Community 117"
Cohesion: 0.67
Nodes (0):

### Community 118 - "Community 118"
Cohesion: 0.67
Nodes (0):

### Community 119 - "Community 119"
Cohesion: 1.0
Nodes (2): buildRegistrySnapshot(), packageVersion()

### Community 120 - "Community 120"
Cohesion: 0.67
Nodes (0):

### Community 121 - "Community 121"
Cohesion: 1.0
Nodes (2): generateTaskId(), routeTask()

### Community 122 - "Community 122"
Cohesion: 0.67
Nodes (0):

### Community 123 - "Community 123"
Cohesion: 1.0
Nodes (2): analyzeIncidentImage(), fallback()

### Community 124 - "Community 124"
Cohesion: 1.0
Nodes (2): checkAndImprove(), improveSilently()

### Community 125 - "Community 125"
Cohesion: 1.0
Nodes (2): makeProfile(), makeStep()

### Community 126 - "Community 126"
Cohesion: 0.67
Nodes (0):

### Community 127 - "Community 127"
Cohesion: 0.67
Nodes (0):

### Community 128 - "Community 128"
Cohesion: 1.0
Nodes (2): label(), present()

### Community 129 - "Community 129"
Cohesion: 0.67
Nodes (0):

### Community 130 - "Community 130"
Cohesion: 1.0
Nodes (0):

### Community 131 - "Community 131"
Cohesion: 1.0
Nodes (0):

### Community 132 - "Community 132"
Cohesion: 1.0
Nodes (0):

### Community 133 - "Community 133"
Cohesion: 1.0
Nodes (0):

### Community 134 - "Community 134"
Cohesion: 1.0
Nodes (0):

### Community 135 - "Community 135"
Cohesion: 1.0
Nodes (0):

### Community 136 - "Community 136"
Cohesion: 1.0
Nodes (0):

### Community 137 - "Community 137"
Cohesion: 1.0
Nodes (0):

### Community 138 - "Community 138"
Cohesion: 1.0
Nodes (0):

### Community 139 - "Community 139"
Cohesion: 1.0
Nodes (0):

### Community 140 - "Community 140"
Cohesion: 1.0
Nodes (0):

### Community 141 - "Community 141"
Cohesion: 1.0
Nodes (0):

### Community 142 - "Community 142"
Cohesion: 1.0
Nodes (0):

### Community 143 - "Community 143"
Cohesion: 1.0
Nodes (0):

### Community 144 - "Community 144"
Cohesion: 1.0
Nodes (0):

### Community 145 - "Community 145"
Cohesion: 1.0
Nodes (0):

### Community 146 - "Community 146"
Cohesion: 1.0
Nodes (0):

### Community 147 - "Community 147"
Cohesion: 1.0
Nodes (0):

### Community 148 - "Community 148"
Cohesion: 1.0
Nodes (0):

### Community 149 - "Community 149"
Cohesion: 1.0
Nodes (0):

### Community 150 - "Community 150"
Cohesion: 1.0
Nodes (0):

### Community 151 - "Community 151"
Cohesion: 1.0
Nodes (0):

### Community 152 - "Community 152"
Cohesion: 1.0
Nodes (0):

### Community 153 - "Community 153"
Cohesion: 1.0
Nodes (0):

### Community 154 - "Community 154"
Cohesion: 1.0
Nodes (0):

### Community 155 - "Community 155"
Cohesion: 1.0
Nodes (0):

### Community 156 - "Community 156"
Cohesion: 1.0
Nodes (0):

### Community 157 - "Community 157"
Cohesion: 1.0
Nodes (0):

### Community 158 - "Community 158"
Cohesion: 1.0
Nodes (0):

### Community 159 - "Community 159"
Cohesion: 1.0
Nodes (0):

### Community 160 - "Community 160"
Cohesion: 1.0
Nodes (0):

### Community 161 - "Community 161"
Cohesion: 1.0
Nodes (0):

### Community 162 - "Community 162"
Cohesion: 1.0
Nodes (0):

### Community 163 - "Community 163"
Cohesion: 1.0
Nodes (0):

### Community 164 - "Community 164"
Cohesion: 1.0
Nodes (0):

### Community 165 - "Community 165"
Cohesion: 1.0
Nodes (0):

### Community 166 - "Community 166"
Cohesion: 1.0
Nodes (0):

### Community 167 - "Community 167"
Cohesion: 1.0
Nodes (1): SpeechRecognition

### Community 168 - "Community 168"
Cohesion: 1.0
Nodes (0):

### Community 169 - "Community 169"
Cohesion: 1.0
Nodes (0):

### Community 170 - "Community 170"
Cohesion: 1.0
Nodes (0):

### Community 171 - "Community 171"
Cohesion: 1.0
Nodes (0):

### Community 172 - "Community 172"
Cohesion: 1.0
Nodes (0):

### Community 173 - "Community 173"
Cohesion: 1.0
Nodes (0):

### Community 174 - "Community 174"
Cohesion: 1.0
Nodes (0):

### Community 175 - "Community 175"
Cohesion: 1.0
Nodes (0):

### Community 176 - "Community 176"
Cohesion: 1.0
Nodes (0):

### Community 177 - "Community 177"
Cohesion: 1.0
Nodes (0):

### Community 178 - "Community 178"
Cohesion: 1.0
Nodes (0):

### Community 179 - "Community 179"
Cohesion: 1.0
Nodes (0):

### Community 180 - "Community 180"
Cohesion: 1.0
Nodes (0):

### Community 181 - "Community 181"
Cohesion: 1.0
Nodes (0):

### Community 182 - "Community 182"
Cohesion: 1.0
Nodes (0):

### Community 183 - "Community 183"
Cohesion: 1.0
Nodes (0):

### Community 184 - "Community 184"
Cohesion: 1.0
Nodes (0):

### Community 185 - "Community 185"
Cohesion: 1.0
Nodes (0):

### Community 186 - "Community 186"
Cohesion: 1.0
Nodes (0):

### Community 187 - "Community 187"
Cohesion: 1.0
Nodes (0):

### Community 188 - "Community 188"
Cohesion: 1.0
Nodes (0):

### Community 189 - "Community 189"
Cohesion: 1.0
Nodes (0):

### Community 190 - "Community 190"
Cohesion: 1.0
Nodes (0):

### Community 191 - "Community 191"
Cohesion: 1.0
Nodes (0):

### Community 192 - "Community 192"
Cohesion: 1.0
Nodes (0):

### Community 193 - "Community 193"
Cohesion: 1.0
Nodes (0):

### Community 194 - "Community 194"
Cohesion: 1.0
Nodes (0):

### Community 195 - "Community 195"
Cohesion: 1.0
Nodes (0):

### Community 196 - "Community 196"
Cohesion: 1.0
Nodes (0):

### Community 197 - "Community 197"
Cohesion: 1.0
Nodes (0):

### Community 198 - "Community 198"
Cohesion: 1.0
Nodes (0):

### Community 199 - "Community 199"
Cohesion: 1.0
Nodes (0):

### Community 200 - "Community 200"
Cohesion: 1.0
Nodes (0):

### Community 201 - "Community 201"
Cohesion: 1.0
Nodes (0):

### Community 202 - "Community 202"
Cohesion: 1.0
Nodes (0):

### Community 203 - "Community 203"
Cohesion: 1.0
Nodes (0):

### Community 204 - "Community 204"
Cohesion: 1.0
Nodes (0):

### Community 205 - "Community 205"
Cohesion: 1.0
Nodes (0):

### Community 206 - "Community 206"
Cohesion: 1.0
Nodes (0):

### Community 207 - "Community 207"
Cohesion: 1.0
Nodes (0):

### Community 208 - "Community 208"
Cohesion: 1.0
Nodes (0):

### Community 209 - "Community 209"
Cohesion: 1.0
Nodes (0):

### Community 210 - "Community 210"
Cohesion: 1.0
Nodes (0):

### Community 211 - "Community 211"
Cohesion: 1.0
Nodes (0):

### Community 212 - "Community 212"
Cohesion: 1.0
Nodes (0):

### Community 213 - "Community 213"
Cohesion: 1.0
Nodes (0):

### Community 214 - "Community 214"
Cohesion: 1.0
Nodes (0):

### Community 215 - "Community 215"
Cohesion: 1.0
Nodes (0):

### Community 216 - "Community 216"
Cohesion: 1.0
Nodes (0):

### Community 217 - "Community 217"
Cohesion: 1.0
Nodes (0):

### Community 218 - "Community 218"
Cohesion: 1.0
Nodes (0):

### Community 219 - "Community 219"
Cohesion: 1.0
Nodes (0):

### Community 220 - "Community 220"
Cohesion: 1.0
Nodes (0):

### Community 221 - "Community 221"
Cohesion: 1.0
Nodes (0):

### Community 222 - "Community 222"
Cohesion: 1.0
Nodes (0):

### Community 223 - "Community 223"
Cohesion: 1.0
Nodes (0):

### Community 224 - "Community 224"
Cohesion: 1.0
Nodes (0):

### Community 225 - "Community 225"
Cohesion: 1.0
Nodes (0):

### Community 226 - "Community 226"
Cohesion: 1.0
Nodes (0):

### Community 227 - "Community 227"
Cohesion: 1.0
Nodes (0):

### Community 228 - "Community 228"
Cohesion: 1.0
Nodes (0):

### Community 229 - "Community 229"
Cohesion: 1.0
Nodes (0):

### Community 230 - "Community 230"
Cohesion: 1.0
Nodes (0):

### Community 231 - "Community 231"
Cohesion: 1.0
Nodes (0):

### Community 232 - "Community 232"
Cohesion: 1.0
Nodes (0):

### Community 233 - "Community 233"
Cohesion: 1.0
Nodes (0):

### Community 234 - "Community 234"
Cohesion: 1.0
Nodes (0):

### Community 235 - "Community 235"
Cohesion: 1.0
Nodes (0):

### Community 236 - "Community 236"
Cohesion: 1.0
Nodes (0):

### Community 237 - "Community 237"
Cohesion: 1.0
Nodes (0):

### Community 238 - "Community 238"
Cohesion: 1.0
Nodes (0):

### Community 239 - "Community 239"
Cohesion: 1.0
Nodes (0):

### Community 240 - "Community 240"
Cohesion: 1.0
Nodes (0):

### Community 241 - "Community 241"
Cohesion: 1.0
Nodes (0):

### Community 242 - "Community 242"
Cohesion: 1.0
Nodes (0):

### Community 243 - "Community 243"
Cohesion: 1.0
Nodes (0):

### Community 244 - "Community 244"
Cohesion: 1.0
Nodes (0):

### Community 245 - "Community 245"
Cohesion: 1.0
Nodes (0):

### Community 246 - "Community 246"
Cohesion: 1.0
Nodes (0):

### Community 247 - "Community 247"
Cohesion: 1.0
Nodes (0):

### Community 248 - "Community 248"
Cohesion: 1.0
Nodes (0):

### Community 249 - "Community 249"
Cohesion: 1.0
Nodes (0):

### Community 250 - "Community 250"
Cohesion: 1.0
Nodes (0):

### Community 251 - "Community 251"
Cohesion: 1.0
Nodes (0):

## Knowledge Gaps
- **1 isolated node(s):** `SpeechRecognition`
  These have â‰¤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 130`** (2 nodes): `localhost-anatomy.tsx`, `Button()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 131`** (2 nodes): `types.ts`, `kindFor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 132`** (2 nodes): `base.ts`, `tryImport()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 133`** (2 nodes): `shared_commands.test.ts`, `makeState()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 134`** (2 nodes): `policies.test.ts`, `basePacket()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 135`** (2 nodes): `parser.ts`, `parseNaturalLanguageCron()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 136`** (2 nodes): `presets.test.ts`, `storeWith()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 137`** (2 nodes): `compress.test.ts`, `makeMessages()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 138`** (2 nodes): `capability-registry.test.ts`, `makeCap()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 139`** (2 nodes): `mcp-registry.test.ts`, `makeConfig()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 140`** (2 nodes): `model-registry.test.ts`, `makeModel()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 141`** (2 nodes): `skill-registry.test.ts`, `makeSkill()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 142`** (2 nodes): `address-extractor.ts`, `extractAddress()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 143`** (2 nodes): `agent-registry.test.ts`, `makeAgent()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 144`** (2 nodes): `carbon-report.test.ts`, `makeMetric()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 145`** (2 nodes): `gap-detector.test.ts`, `makeMsg()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 146`** (2 nodes): `gap-detector.ts`, `detectGaps()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 147`** (2 nodes): `geocoder.test.ts`, `mockFetch()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 148`** (2 nodes): `modes.test.ts`, `input()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 149`** (2 nodes): `pairing.test.ts`, `storeWith()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 150`** (2 nodes): `policy.test.ts`, `makePolicy()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 151`** (2 nodes): `store.test.ts`, `makeSession()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 152`** (2 nodes): `sustainability-compliance.test.ts`, `loadAllSkills()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 153`** (2 nodes): `scoring.test.ts`, `makeDim()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 154`** (2 nodes): `register-builtin.ts`, `registerBuiltinTools()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 155`** (2 nodes): `registry.test.ts`, `executor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 156`** (2 nodes): `upstream.test.ts`, `makeAdapter()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 157`** (2 nodes): `copilot.test.ts`, `makeValidWorkflow()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 158`** (2 nodes): `executor.test.ts`, `agentStep()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 159`** (2 nodes): `evaluator.test.ts`, `makeMetrics()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 160`** (2 nodes): `connector.test.ts`, `makeConnector()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 161`** (2 nodes): `check-production.ts`, `printResult()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 162`** (2 nodes): `check-secrets.ts`, `liveSecretValues()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 163`** (2 nodes): `db-migration-check.ts`, `fail()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 164`** (2 nodes): `VoiceButton.tsx`, `VoiceButton()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 165`** (2 nodes): `SustainabilityDashboard.tsx`, `savings()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 166`** (2 nodes): `useLiveTelemetry.ts`, `useLiveTelemetry()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 167`** (2 nodes): `openseabri.d.ts`, `SpeechRecognition`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 168`** (2 nodes): `carbon-model.ts`, `estimateCarbonGrams()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 169`** (2 nodes): `config.ts`, `vitest.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 170`** (1 nodes): `schema.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 171`** (1 nodes): `localhost-tailwind.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 172`** (1 nodes): `localhost-theme.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 173`** (1 nodes): `drizzle.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 174`** (1 nodes): `agents.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 175`** (1 nodes): `perils.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 176`** (1 nodes): `tools.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 177`** (1 nodes): `enablement.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 178`** (1 nodes): `examples.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 179`** (1 nodes): `schemas.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 180`** (1 nodes): `config.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 181`** (1 nodes): `approval.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 182`** (1 nodes): `stdio.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 183`** (1 nodes): `rag.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 184`** (1 nodes): `classifier.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 185`** (1 nodes): `graph.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 186`** (1 nodes): `metrics.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 187`** (1 nodes): `model-router.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 188`** (1 nodes): `planner.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 189`** (1 nodes): `adapter.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 190`** (1 nodes): `product.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 191`** (1 nodes): `schemas-chat-attachments.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 192`** (1 nodes): `action-executor.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 193`** (1 nodes): `address-extractor.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 194`** (1 nodes): `carbon-budget.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 195`** (1 nodes): `document-execution.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 196`** (1 nodes): `feedback.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 197`** (1 nodes): `incident-workflow.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 198`** (1 nodes): `lang.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 199`** (1 nodes): `local-resources.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 200`** (1 nodes): `outbound.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 201`** (1 nodes): `plugin-registry-singleton.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 202`** (1 nodes): `practical-sustainability.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 203`** (1 nodes): `property-risk-card.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 204`** (1 nodes): `provider-readiness.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 205`** (1 nodes): `provider-validation-evidence.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 206`** (1 nodes): `sustainability-scoring.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 207`** (1 nodes): `sustainable-compute.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 208`** (1 nodes): `task-router.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 209`** (1 nodes): `telemetry.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 210`** (1 nodes): `vision-analysis.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 211`** (1 nodes): `workflow-store.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 212`** (1 nodes): `hmac.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 213`** (1 nodes): `index.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 214`** (1 nodes): `loader.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 215`** (1 nodes): `validator.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 216`** (1 nodes): `production-config.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 217`** (1 nodes): `carbon-tracker.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 218`** (1 nodes): `product-comparison.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 219`** (1 nodes): `logger.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 220`** (1 nodes): `message.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 221`** (1 nodes): `message.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 222`** (1 nodes): `upstream-compat.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 223`** (1 nodes): `user_config.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 224`** (1 nodes): `refiner.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 225`** (1 nodes): `playwright.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 226`** (1 nodes): `knowledge-vault.ps1`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 227`** (1 nodes): `release-check.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 228`** (1 nodes): `secret-scan.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 229`** (1 nodes): `validate-production.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 230`** (1 nodes): `validate-staging.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 231`** (1 nodes): `CarbonReport.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 232`** (1 nodes): `RecommendationList.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 233`** (1 nodes): `SeaBriOSPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 234`** (1 nodes): `StatCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 235`** (1 nodes): `useSustainabilityData.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 236`** (1 nodes): `VoicePanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 237`** (1 nodes): `canvasAdapter.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 238`** (1 nodes): `AgentNode.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 239`** (1 nodes): `ConditionNode.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 240`** (1 nodes): `LoopNode.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 241`** (1 nodes): `ParallelNode.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 242`** (1 nodes): `ToolNode.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 243`** (1 nodes): `WorkflowCanvas.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 244`** (1 nodes): `pilot.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 245`** (1 nodes): `carbon-model.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 246`** (1 nodes): `tailwind.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 247`** (1 nodes): `canvas.spec.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 248`** (1 nodes): `pilot-workspace.spec.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 249`** (1 nodes): `node-telegram-bot-api.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 250`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 251`** (1 nodes): `vitest.setup.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 12 inferred relationships involving `pushActivity()` (e.g. with `saveProfile()` and `runIncident()`) actually correct?**
  _`pushActivity()` has 12 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `runResearchCycle()` (e.g. with `parseAgenda()` and `todayString()`) actually correct?**
  _`runResearchCycle()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `safeStr()` (e.g. with `augmentClimateRiskContext()` and `augmentNatureRiskContext()`) actually correct?**
  _`safeStr()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **What connects `SpeechRecognition` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
