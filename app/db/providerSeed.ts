import 'dotenv/config';
import { llmSettingsTable } from '@/app/db/schema';
import { db } from './index';
import providers from './data/providers';

export async function initializeProviders() {
  await db
    .insert(llmSettingsTable)
    .values(providers)
    .onConflictDoNothing(); // 冲突时忽略
}

initializeProviders().then(() => {
  console.log("Providers initialized successfully.");
  process.exit(0); // 成功退出
}).catch((error) => {
  console.error("Error initializing providers:", error);
  process.exit(1);
});