import { drizzle as neon } from 'drizzle-orm/neon-http';
import { drizzle } from 'drizzle-orm/postgres-js';

import { llmModels, users, llmSettingsTable, appSettings, groups, groupModels, mcpServers, usageReport, mcpTools, searchEngineConfig, oauthProviders, passwordResetTokens, modelFamilies } from './schema'
import * as relations from './relations';

const getDbInstance = () => {
  // 添加默认值处理，防止在构建时出错
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fivechat';

  // 在构建时可能需要一个虚拟的数据库连接
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    console.warn('警告: 没有提供 DATABASE_URL 环境变量，使用默认连接字符串。这在生产环境可能导致问题。');
  }

  if (process.env.VERCEL) {
    return neon(process.env.DATABASE_URL!,
      { schema: { users, llmModels, llmSettingsTable, appSettings, groups, groupModels, mcpServers, usageReport, mcpTools, searchEngineConfig, oauthProviders, passwordResetTokens, modelFamilies, ...relations } });
  } else {
    return drizzle(process.env.DATABASE_URL!,
      { schema: { users, llmModels, llmSettingsTable, appSettings, groups, groupModels, mcpServers, usageReport, mcpTools, searchEngineConfig, oauthProviders, passwordResetTokens, modelFamilies, ...relations } });
  }
}

export const db = getDbInstance();
// export const db = drizzle(process.env.DATABASE_URL!, { schema: { users, llmModels, llmSettingsTable } });