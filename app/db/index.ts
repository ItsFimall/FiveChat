import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

import { llmModels, users, llmSettingsTable, appSettings, groups, groupModels, mcpServers, usageReport, mcpTools, searchEngineConfig, oauthConfigs, allRelations } from './schema'

const getDbInstance = () => {
  const dbPath = process.env.DATABASE_URL || './data/fivechat.db';
  const sqlite = new Database(dbPath);
  return drizzle(sqlite, {
    schema: { users, llmModels, llmSettingsTable, appSettings, groups, groupModels, mcpServers, usageReport, mcpTools, searchEngineConfig, oauthConfigs, ...allRelations }
  });
}

export const db = getDbInstance();
// export const db = drizzle(process.env.DATABASE_URL!, { schema: { users, llmModels, llmSettingsTable } });