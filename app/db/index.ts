import { drizzle as neon } from 'drizzle-orm/neon-http';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema'
import * as relations from './relations';

const getDbInstance = () => {
  if (process.env.VERCEL) {
    return neon(process.env.DATABASE_URL!, {
      schema: { ...schema, ...relations },
      // 优化 Neon 连接
      arrayMode: false,
      fullResults: true,
    });
  } else {
    // 创建 postgres 连接实例，添加连接池优化
    const client = postgres(process.env.DATABASE_URL!, {
      max: 20, // 最大连接数
      idle_timeout: 20, // 空闲超时时间（秒）
      connect_timeout: 10, // 连接超时时间（秒）
      prepare: false, // 禁用预处理语句以提高性能
      transform: {
        undefined: null, // 将 undefined 转换为 null
      },
      // 启用连接复用
      connection: {
        application_name: 'fivechat',
      },
    });
    return drizzle(client, {
      schema: { ...schema, ...relations },
      logger: process.env.NODE_ENV === 'development', // 仅在开发环境启用日志
    });
  }
}

export const db = getDbInstance();
// export const db = drizzle(process.env.DATABASE_URL!, { schema: { users, llmModels, llmSettingsTable } });