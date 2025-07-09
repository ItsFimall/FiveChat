import { llmModels, llmSettingsTable, groupModels, groups, users, passwordResetTokens } from './schema';
import { relations } from 'drizzle-orm';

export const modelsGroupsRelations = relations(llmModels, ({ many }) => ({
    groups: many(groupModels),
}))

export const groupsModelsRelations = relations(groups, ({ many }) => ({
    models: many(groupModels),
}))

export const groupsToModelsRelations = relations(groupModels, ({ one }) => ({
    model: one(llmModels, {
        fields: [groupModels.modelId],
        references: [llmModels.id],
    }),
    group: one(groups, {
        fields: [groupModels.groupId],
        references: [groups.id],
    }),
}))

export const providerModelsRelations = relations(llmSettingsTable, ({ many }) => ({
    models: many(llmModels),
}))

export const modelsProvidersRelations = relations(llmModels, ({ one }) => ({
    provider: one(llmSettingsTable, {
        fields: [llmModels.providerId],
        references: [llmSettingsTable.provider],
    }),
}))

// user and group relations
export const usersGroupsRelations = relations(groups, ({ many }) => ({
    users: many(users),
}))

export const groupsUsersRelations = relations(users, ({ one, many }) => ({
    group: one(groups, {
        fields: [users.groupId],
        references: [groups.id],
    }),
    passwordResetTokens: many(passwordResetTokens),
}))

// password reset tokens relations
export const passwordResetTokensUsersRelations = relations(passwordResetTokens, ({ one }) => ({
    user: one(users, {
        fields: [passwordResetTokens.userId],
        references: [users.id],
    }),
}))