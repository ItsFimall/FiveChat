import 'dotenv/config';
import { llmModels } from '@/app/db/schema';
import { db } from './index';

import { modelList as OpenaiModels } from "@/app/db/data/models/openai";

const modelList = [
  ...OpenaiModels,
];

export async function initializeModels() {
  const modelData = modelList.map((model) => ({
    name: model.id,
    displayName: model.displayName,
    maxTokens: model.maxTokens,
    supportVision: model.supportVision,
    supportTool: model.supportTool,
    builtInImageGen: model.builtInImageGen,
    builtInWebSearch: model.builtInWebSearch,
    selected: model.selected,
    providerId: model.provider.id,
    providerName: model.provider.providerName,
    type: model.type ?? 'default',
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  await db.insert(llmModels).values(modelData)
    .onConflictDoNothing({
      target: [llmModels.name, llmModels.providerId], // 指定冲突检测列
    });
}

initializeModels().then(() => {
  console.log("Models initialized successfully.");
  process.exit(0); // 成功退出
}).catch((error) => {
  console.error("Error initializing models:", error);
  process.exit(1);
});