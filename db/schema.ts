import { pgTable, text, timestamp, integer, boolean, jsonb, real, uuid, index } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique(),
  name: text('name'),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  agentId: text('agent_id').notNull(),
  name: text('name').notNull(),
  personalityId: text('personality_id'),
  compressed: boolean('compressed').default(false).notNull(),
  compressionSummary: text('compression_summary'),
  turnCount: integer('turn_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastActiveAt: timestamp('last_active_at').defaultNow().notNull(),
}, (table) => [
  index('sessions_user_id_idx').on(table.userId),
  index('sessions_agent_id_idx').on(table.agentId),
  index('sessions_last_active_idx').on(table.lastActiveAt),
])

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: text('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  toolName: text('tool_name'),
  toolInput: jsonb('tool_input'),
  toolResult: jsonb('tool_result'),
  model: text('model'),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('messages_session_id_idx').on(table.sessionId),
])

export const workflows = pgTable('workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  name: text('name').notNull(),
  description: text('description'),
  definition: jsonb('definition').notNull(),
  triggerType: text('trigger_type'),
  triggerConfig: jsonb('trigger_config'),
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('workflows_user_id_idx').on(table.userId),
])

export const workflowRuns = pgTable('workflow_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').references(() => workflows.id, { onDelete: 'cascade' }).notNull(),
  status: text('status').notNull().default('pending'),
  input: jsonb('input'),
  output: jsonb('output'),
  error: text('error'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  durationMs: integer('duration_ms'),
}, (table) => [
  index('workflow_runs_workflow_id_idx').on(table.workflowId),
  index('workflow_runs_status_idx').on(table.status),
])

export const metrics = pgTable('metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: text('session_id').references(() => sessions.id),
  workflowRunId: uuid('workflow_run_id').references(() => workflowRuns.id),
  agentId: text('agent_id'),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  costUsd: real('cost_usd').notNull(),
  latencyMs: integer('latency_ms').notNull(),
  carbonGrams: real('carbon_grams'),
  toolCalls: integer('tool_calls').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('metrics_session_id_idx').on(table.sessionId),
  index('metrics_agent_id_idx').on(table.agentId),
  index('metrics_created_at_idx').on(table.createdAt),
])

export const skills = pgTable('skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description'),
  content: text('content').notNull(),
  agentId: text('agent_id'),
  version: integer('version').default(1).notNull(),
  usageCount: integer('usage_count').default(0).notNull(),
  avgRating: real('avg_rating'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const feedback = pgTable('feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: text('session_id').references(() => sessions.id),
  messageId: uuid('message_id').references(() => messages.id),
  agentId: text('agent_id'),
  rating: integer('rating'),
  comment: text('comment'),
  signal: text('signal'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('feedback_agent_id_idx').on(table.agentId),
  index('feedback_session_id_idx').on(table.sessionId),
])
