import {
  boolean,
  timestamp,
  pgTable,
  pgEnum,
  text,
  primaryKey,
  integer,
  varchar,
  json,
  date,
  uuid,
  unique
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";
import { customAlphabet } from 'nanoid';
import { apiStyle, MCPToolResponse } from '@/types/llm'
import { WebSearchResponse } from '@/types/search'
const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 10)

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  password: text("password"),
  dingdingUnionId: text("dingdingUnionId"),
  wecomUserId: text("wecomUserId"),
  feishuUserId: text("feishuUserId"),
  feishuOpenId: text("feishuOpenId"),
  feishuUnionId: text("feishuUnionId"),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  isAdmin: boolean("isAdmin").default(false),
  image: text("image"),
  groupId: text("groupId"),
  todayTotalTokens: integer('today_total_tokens').notNull().default(0),
  currentMonthTotalTokens: integer('current_month_total_tokens').notNull().default(0),
  usageUpdatedAt: timestamp('usage_updated_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const accounts = pgTable("account", {
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

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
})

export const verificationTokens = pgTable("verificationToken", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
},
  (verificationToken) => [
    {
      compositePk: primaryKey({
        columns: [verificationToken.identifier, verificationToken.token],
      }),
    },
  ]
)

export const authenticators = pgTable("authenticator", {
  credentialID: text("credentialID").notNull().unique(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  providerAccountId: text("providerAccountId").notNull(),
  credentialPublicKey: text("credentialPublicKey").notNull(),
  counter: integer("counter").notNull(),
  credentialDeviceType: text("credentialDeviceType").notNull(),
  credentialBackedUp: boolean("credentialBackedUp").notNull(),
  transports: text("transports"),
},
  (authenticator) => [
    {
      compositePK: primaryKey({
        columns: [authenticator.userId, authenticator.credentialID],
      }),
    },
  ]
)

export const APIStyle = pgEnum('api_style', ['openai', 'openai_response', 'claude', 'gemini']);
export const providerType = pgEnum('provider_type', ['default', 'custom']);
export const llmSettingsTable = pgTable("llm_settings", {
  provider: varchar({ length: 255 }).primaryKey().notNull(),
  providerName: varchar({ length: 255 }).notNull(),
  apikey: varchar({ length: 255 }),
  endpoint: varchar({ length: 1024 }),
  isActive: boolean('is_active').default(false),
  apiStyle: APIStyle('api_style').notNull().default('openai'),
  type: providerType('type').notNull().default('default'),
  logo: varchar({ length: 2048 }),
  order: integer('order'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text('value'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const modelType = pgEnum('model_type', ['default', 'custom']);

export const llmModels = pgTable("models", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  displayName: varchar({ length: 255 }).notNull(),
  maxTokens: integer(),
  supportVision: boolean('support_vision').default(false),
  supportTool: boolean('support_tool').default(false),
  builtInImageGen: boolean('built_in_image_gen').default(false),
  builtInWebSearch: boolean('built_in_web_search').default(false),
  selected: boolean('selected').default(true),
  providerId: varchar({ length: 255 }).notNull().references(() => llmSettingsTable.provider, {
    onDelete: 'cascade',
    onUpdate: 'cascade'
  }),
  providerName: varchar({ length: 255 }).notNull(),
  type: modelType('type').notNull().default('default'),
  order: integer('order').default(1),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
},
  (table) => ({
    // 创建联合唯一约束
    uniqueNameProvider: unique('unique_model_provider').on(
      table.name,
      table.providerId
    ),
  })
);

export const avatarType = pgEnum('avatar_type', ['emoji', 'url', 'none']);
export const historyType = pgEnum('history_type', ['all', 'count', 'none']);

export const chats = pgTable("chats", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: text(),
  title: varchar({ length: 255 }).notNull(),
  historyType: historyType('history_type').notNull().default('count'),
  historyCount: integer('history_count').default(5).notNull(),
  searchEnabled: boolean('search_enabled').default(false),
  defaultModel: varchar('default_model'),
  defaultProvider: varchar('default_provider'),
  isStar: boolean('is_star').default(false),
  isWithBot: boolean('is_with_bot').default(false),
  botId: integer('bot_id'),
  avatar: varchar('avatar'),
  avatarType: avatarType('avatar_type').notNull().default('none'),
  prompt: text(),
  starAt: timestamp('star_at'),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  totalTokens: integer('total_tokens').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const messageType = pgEnum('message_type', ['text', 'image', 'error', 'break']);
export const messageSearchStatus = pgEnum('search_status', ['none', 'searching', 'error', 'done']);

export const messages = pgTable("messages", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: text().notNull(),
  chatId: text().notNull(),
  role: varchar({ length: 255 }).notNull(),
  content: json('content').$type<string | Array<
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
  model: varchar({ length: 255 }),
  providerId: varchar({ length: 255 }).notNull(),
  type: varchar('message_type').notNull().default('text'),
  searchEnabled: boolean('search_enabled').default(false),
  webSearch: json('web_search').$type<WebSearchResponse>(),
  searchStatus: messageSearchStatus('search_status').notNull().default('none'),
  mcpTools: json('mcp_tools').$type<MCPToolResponse[]>(),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  totalTokens: integer('total_tokens'),
  errorType: varchar('error_type'),
  errorMessage: varchar('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deleteAt: timestamp('delete_at'),
});

export const bots = pgTable("bots", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: varchar({ length: 255 }).notNull(),
  desc: text('desc'),
  prompt: text('prompt'),
  avatarType: avatarType('avatar_type').notNull().default('none'),
  avatar: varchar('avatar'),
  sourceUrl: varchar('source_url'),
  creator: varchar(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deleteAt: timestamp('delete_at'),
});

export interface BotType {
  id?: number;
  title: string;
  desc?: string;
  prompt: string;
  avatar: string;
  avatarType: 'emoji' | 'url';
  sourceUrl?: string;
  creator: string;
  createdAt: Date;
}

export type UserType = typeof users.$inferSelect;

export type llmModelType = typeof llmModels.$inferSelect & {
  providerLogo?: string;
  apiStyle: apiStyle;
};

export type llmSettingsType = typeof llmSettingsTable.$inferSelect;

export const groupModelType = pgEnum('group_model_type', ['all', 'specific'])
export const tokenLimitType = pgEnum('token_limit_type', ['unlimited', 'limited'])

export const groups = pgTable("groups", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  modelType: groupModelType('model_type').notNull().default('all'),
  tokenLimitType: tokenLimitType('token_limit_type').notNull().default('unlimited'),
  monthlyTokenLimit: integer('monthly_token_limit'),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const usageReport = pgTable("usage_report", {
  date: date("date").notNull(),
  userId: text("user_id"),
  modelId: varchar('model_id', { length: 255 }),
  providerId: varchar("provider_id", { length: 255 }),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  totalTokens: integer('total_tokens').notNull().default(0),
},
  (usageReport) => [
    {
      compositePK: primaryKey({
        columns: [usageReport.date, usageReport.userId, usageReport.modelId, usageReport.providerId],
      }),
    },
  ])

export const searchEngineConfig = pgTable("search_engine_config", {
  id: text("id").notNull().primaryKey(),
  name: text("name").notNull(),
  apiKey: text("api_key"),
  maxResults: integer("max_results").default(5).notNull(),
  extractKeywords: boolean("extract_keywords").default(false).notNull(),
  isActive: boolean("is_active").default(false).notNull(),
})

export const mcpServerType = pgEnum('mcp_server_type', ['sse', 'streamableHttp'])
export const mcpServers = pgTable("mcp_servers", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  description: text("description"),
  type: mcpServerType('type').default('sse'),
  baseUrl: text("base_url").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const mcpTools = pgTable("mcp_tools", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  serverId: uuid("server_id")
    .notNull()
    .references(() => mcpServers.id, { onDelete: "cascade" }),
  description: text("description"),
  inputSchema: text('input_schema').notNull(),
})

export const groupModels = pgTable("group_models", {
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


