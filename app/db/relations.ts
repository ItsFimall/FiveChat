import {
  llmModels,
  llmSettingsTable,
  groupModels,
  groups,
  users,
  chats,
  messages,
} from "./schema";
import { relations } from "drizzle-orm";

export const usersChatsRelations = relations(users, ({ many }) => ({
  chats: many(chats),
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
}));

export const modelsGroupsRelations = relations(llmModels, ({ many }) => ({
  groups: many(groupModels),
}));

export const groupsModelsRelations = relations(groups, ({ many }) => ({
  models: many(groupModels),
}));

export const groupsToModelsRelations = relations(groupModels, ({ one }) => ({
  model: one(llmModels, {
    fields: [groupModels.modelId],
    references: [llmModels.id],
  }),
  group: one(groups, {
    fields: [groupModels.groupId],
    references: [groups.id],
  }),
}));

export const providerModelsRelations = relations(llmSettingsTable, ({ many }) => ({
  models: many(llmModels),
}));

export const modelsProvidersRelations = relations(llmModels, ({ one }) => ({
  provider: one(llmSettingsTable, {
    fields: [llmModels.providerId],
    references: [llmSettingsTable.provider],
  }),
}));

// user and group relations
export const usersGroupsRelations = relations(groups, ({ many }) => ({
  users: many(users),
}));

export const groupsUsersRelations = relations(users, ({ one }) => ({
  group: one(groups, {
    fields: [users.groupId],
    references: [groups.id],
  }),
}));