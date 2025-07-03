import 'dotenv/config';
import { llmModels } from '@/app/db/schema';
import { db } from './index';

import { modelList as OpenaiModels } from "@/app/db/data/models/openai";
import { modelList as ClaudeModels } from "@/app/db/data/models/claude";
import { modelList as GeminiModels } from "@/app/db/data/models/gemini";
import { modelList as MoonshotModels } from "@/app/db/data/models/moonshot";
import { modelList as QwenModels } from "@/app/db/data/models/qwen";
import { modelList as VolcengineModels } from "@/app/db/data/models/volcengine";
import { modelList as DeepseekModels } from "@/app/db/data/models/deepseek";
import { modelList as QianfanModels } from "@/app/db/data/models/qianfan";
import { modelList as SiliconflowModels } from "@/app/db/data/models/siliconflow";
import { modelList as OllamaModels } from "@/app/db/data/models/ollama";
import { modelList as OpenrouterModels } from "@/app/db/data/models/openrouter";
import { modelList as ZhipuModels } from "@/app/db/data/models/zhipu";
import { modelList as GrokModels } from "@/app/db/data/models/grok";
import { modelList as HunyuanModels } from "@/app/db/data/models/hunyuan";
const modelList = [
  ...OpenaiModels,
  ...ClaudeModels,
  ...GeminiModels,
  ...MoonshotModels,
  ...QwenModels,
  ...VolcengineModels,
  ...DeepseekModels,
  ...QianfanModels,
  ...SiliconflowModels,
  ...OllamaModels,
  ...OpenrouterModels,
  ...ZhipuModels,
  ...GrokModels,
  ...HunyuanModels,
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