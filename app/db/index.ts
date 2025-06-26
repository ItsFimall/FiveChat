import { drizzle as neon } from 'drizzle-orm/neon-http';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema'
import * as relations from './relations';

const getDbInstance = () => {
  if (process.env.VERCEL) {
    return neon(process.env.DATABASE_URL!,
      { schema: { ...schema, ...relations } });
  } else {
    // 创建 postgres 连接实例
    const client = postgres(process.env.DATABASE_URL!);
    return drizzle(client,
      { schema: { ...schema, ...relations } });
  }
}

export const db = getDbInstance();
// export const db = drizzle(process.env.DATABASE_URL!, { schema: { users, llmModels, llmSettingsTable } });