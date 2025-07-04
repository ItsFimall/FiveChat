import {
  integer,
  text,
  sqliteTable,
  primaryKey,
  unique
} from "drizzle-orm/sqlite-core";
import type { AdapterAccountType } from "next-auth/adapters";
import { nanoid } from 'nanoid';
import { relations } from 'drizzle-orm';

export const users = sqliteTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  password: text("password"),
  emailVerified: integer("emailVerified"),
  isAdmin: integer("isAdmin", { mode: "boolean" }).default(false),
  image: text("image"),
  groupId: text("groupId"),
  todayTotalTokens: integer('today_total_tokens').notNull().default(0),
  currentMonthTotalTokens: integer('current_month_total_tokens').notNull().default(0),
  usageUpdatedAt: integer('usage_updated_at').notNull().$defaultFn(() => Date.now()),
  createdAt: integer('created_at').$defaultFn(() => Date.now()),
})

export const accounts = sqliteTable("account", {
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").$type<AdapterAccountType>().notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
},
  (account) => [
    {
      compoundKey: primaryKey({
        columns: [account.provider, account.providerAccountId],
      }),
    },
  ]
)

export const sessions = sqliteTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires").notNull(),
})

export const verificationTokens = sqliteTable("verificationToken", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: integer("expires").notNull(),
},
  (verificationToken) => [
    {
      compositePk: primaryKey({
        columns: [verificationToken.identifier, verificationToken.token],
      }),
    },
  ]
)

export const authenticators = sqliteTable("authenticator", {
  credentialID: text("credentialID").notNull().unique(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  providerAccountId: text("providerAccountId").notNull(),
  credentialPublicKey: text("credentialPublicKey").notNull(),
  counter: integer("counter").notNull(),
  credentialDeviceType: text("credentialDeviceType").notNull(),
  credentialBackedUp: integer("credentialBackedUp", { mode: "boolean" }).notNull(),
  transports: text("transports"),
},
  (authenticator) => [
    {
      compositePK: primaryKey({
        columns: [authenticator.userId, authenticator.credentialID],
      }),
    }
  ]
)

export const llmSettingsTable = sqliteTable("llm_settings", {
  provider: text("provider").primaryKey().notNull(),
  providerName: text("providerName").notNull(),
  apikey: text("apikey"),
  endpoint: text("endpoint"),
  isActive: integer('is_active', { mode: "boolean" }).default(false),
  apiStyle: text('api_style').notNull().default('openai'),
  type: text('type').notNull().default('default'),
  logo: text("logo"),
  order: integer('order'),
  createdAt: integer('created_at').$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at').$defaultFn(() => Date.now())
});

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text('value'),
  createdAt: integer('created_at').$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at').$defaultFn(() => Date.now())
});

export const oauthConfigs = sqliteTable("oauth_configs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  clientId: text("client_id").notNull(),
  clientSecret: text("client_secret").notNull(),
  homepage: text("homepage"),
  description: text("description"),
  callbackUrl: text("callback_url").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(false),
  createdAt: integer('created_at').$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at').$defaultFn(() => Date.now())
});

export const llmModels = sqliteTable("models", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  displayName: text("displayName").notNull(),
  maxTokens: integer("maxTokens"),
  supportVision: integer('support_vision', { mode: "boolean" }).default(false),
  supportTool: integer('support_tool', { mode: "boolean" }).default(false),
  builtInImageGen: integer('built_in_image_gen', { mode: "boolean" }).default(false),
  builtInWebSearch: integer('built_in_web_search', { mode: "boolean" }).default(false),
  selected: integer('selected', { mode: "boolean" }).default(true),
  providerId: text("providerId").notNull().references(() => llmSettingsTable.provider, {
    onDelete: 'cascade',
    onUpdate: 'cascade'
  }),
  providerName: text("providerName").notNull(),
  type: text('type').notNull().default('default'),
  order: integer('order').default(1),
  createdAt: integer('created_at').$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at').$defaultFn(() => Date.now()),
}, (table) => ({
  uniqueNameProvider: unique().on(table.name, table.providerId),
}));

export const chats = sqliteTable("chats", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: text("userId"),
  title: text("title").notNull(),
  historyType: text('history_type').notNull().default('count'),
  historyCount: integer('history_count').default(5).notNull(),
  searchEnabled: integer('search_enabled', { mode: "boolean" }).default(false),
  defaultModel: text('default_model'),
  defaultProvider: text('default_provider'),
  isStar: integer('is_star', { mode: "boolean" }).default(false),
  isWithBot: integer('is_with_bot', { mode: "boolean" }).default(false),
  botId: integer('bot_id'),
  avatar: text('avatar'),
  avatarType: text('avatar_type').notNull().default('none'),
  prompt: text("prompt"),
  starAt: integer('star_at'),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  totalTokens: integer('total_tokens').notNull().default(0),
  createdAt: integer('created_at').$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at').$defaultFn(() => Date.now()),
});

export interface WebSearchResponse {
  query: string;
  results: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
}

export interface MCPToolResponse {
  name: string;
  result: any;
  error?: string;
}

export const messages = sqliteTable("messages", {
  id: integer().primaryKey({ autoIncrement: true }),
  userId: text("userId").notNull(),
  chatId: text("chatId").notNull(),
  role: text("role").notNull(),
  content: text('content', { mode: 'json' }).$type<string | Array<
    {
      type: 'text';
      text: string;
    }
    | {
      type: 'image';
      mimeType: string;
      data: string;
    }
  >>(),
  reasoninContent: text('reasonin_content'),
  model: text("model"),
  providerId: text("providerId").notNull(),
  type: text('message_type').notNull().default('text'),
  searchEnabled: integer('search_enabled', { mode: "boolean" }).default(false),
  webSearch: text('web_search', { mode: 'json' }).$type<WebSearchResponse>(),
  searchStatus: text('search_status').notNull().default('none'),
  mcpTools: text('mcp_tools', { mode: 'json' }).$type<MCPToolResponse[]>(),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  totalTokens: integer('total_tokens'),
  errorType: text('error_type'),
  errorMessage: text('error_message'),
  createdAt: integer('created_at').$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at').$defaultFn(() => Date.now()),
  deleteAt: integer('delete_at'),
});

export const bots = sqliteTable("bots", {
  id: integer().primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  desc: text('desc'),
  prompt: text('prompt'),
  avatarType: text('avatar_type').notNull().default('none'),
  avatar: text('avatar'),
  sourceUrl: text('source_url'),
  creator: text("creator"),
  createdAt: integer('created_at').$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at').$defaultFn(() => Date.now()),
  deleteAt: integer('delete_at'),
});

export interface BotType {
  id?: number;
  title: string;
  desc?: string;
  prompt?: string;
  avatarType: 'emoji' | 'url' | 'none';
  avatar?: string;
  sourceUrl?: string;
  creator?: string;
  createdAt?: number;
  updatedAt?: number;
  deleteAt?: number;
}

export const groups = sqliteTable("groups", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  modelType: text('model_type').notNull().default('all'),
  tokenLimitType: text('token_limit_type').notNull().default('unlimited'),
  monthlyTokenLimit: integer('monthly_token_limit'),
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  createdAt: integer('created_at').$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at').$defaultFn(() => Date.now()),
})

export const usageReport = sqliteTable("usage_report", {
  date: text("date").notNull(),
  userId: text("user_id"),
  modelId: text('model_id'),
  providerId: text("provider_id"),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  totalTokens: integer('total_tokens').notNull().default(0),
},
  (usageReport) => [
    {
      compositePK: primaryKey({
        columns: [usageReport.date, usageReport.userId, usageReport.modelId, usageReport.providerId],
      }),
    }
  ]
)

export const searchEngineConfig = sqliteTable("search_engine_config", {
  id: text("id").notNull().primaryKey(),
  name: text("name").notNull(),
  apiKey: text("api_key"),
  maxResults: integer("max_results").default(5).notNull(),
  extractKeywords: integer("extract_keywords", { mode: "boolean" }).default(false).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(false).notNull(),
})

export const mcpServers = sqliteTable("mcp_servers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  description: text("description"),
  type: text('type').default('sse'),
  baseUrl: text("base_url").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer('created_at').$defaultFn(() => Date.now()),
})

export const mcpTools = sqliteTable("mcp_tools", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  serverId: text("server_id")
    .notNull()
    .references(() => mcpServers.id, { onDelete: "cascade" }),
  description: text("description"),
  inputSchema: text('input_schema').notNull(),
})

export const groupModels = sqliteTable("group_models", {
  groupId: text("groupId").notNull().references(() => groups.id, { onDelete: 'cascade' }),
  modelId: integer("modelId").notNull().references(() => llmModels.id, { onDelete: 'cascade' }),
},
  (groupModels) => [
    {
      compositePK: primaryKey({
        columns: [groupModels.groupId, groupModels.modelId],
      }),
    }
  ]
)

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  group: one(groups, {
    fields: [users.groupId],
    references: [groups.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const groupsRelations = relations(groups, ({ many }) => ({
  users: many(users),
  groupModels: many(groupModels),
}));

export const llmModelsRelations = relations(llmModels, ({ one, many }) => ({
  provider: one(llmSettingsTable, {
    fields: [llmModels.providerId],
    references: [llmSettingsTable.provider],
  }),
  groupModels: many(groupModels),
}));

export const groupModelsRelations = relations(groupModels, ({ one }) => ({
  group: one(groups, {
    fields: [groupModels.groupId],
    references: [groups.id],
  }),
  model: one(llmModels, {
    fields: [groupModels.modelId],
    references: [llmModels.id],
  }),
}));

export const mcpServersRelations = relations(mcpServers, ({ many }) => ({
  tools: many(mcpTools),
}));

export const mcpToolsRelations = relations(mcpTools, ({ one }) => ({
  server: one(mcpServers, {
    fields: [mcpTools.serverId],
    references: [mcpServers.id],
  }),
}));

// Export relations object
export const allRelations = {
  usersRelations,
  accountsRelations,
  sessionsRelations,
  groupsRelations,
  llmModelsRelations,
  groupModelsRelations,
  mcpServersRelations,
  mcpToolsRelations,
};

export type llmSettingsType = typeof llmSettingsTable.$inferSelect;
export type oauthConfigType = typeof oauthConfigs.$inferSelect;
