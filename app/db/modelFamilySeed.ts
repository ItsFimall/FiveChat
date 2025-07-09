import { db } from '@/app/db';
import { modelFamilies } from '@/app/db/schema';
import { eq } from 'drizzle-orm';

const modelFamilyData = [
  { name: 'Claude', matchRules: ['claude'] },
  { name: 'DeepSeek', matchRules: ['deepseek'] },
  { name: 'Gemini', matchRules: ['gemini'] },
  { name: 'WenXin', matchRules: ['wenxin', 'ernie'] },
  { name: 'HunYuan', matchRules: ['hunyuan'] },
  { name: 'GLM', matchRules: ['glm'] },
  { name: 'Qwen', matchRules: ['qwen', 'qwq', 'qvq'] },
  { name: 'Mistral', matchRules: ['mistral'] },
  { name: 'SenseNova', matchRules: ['sensenova', 'sense'] },
  { name: 'MiniMax', matchRules: ['minimax', 'abab'] },
  { name: 'Gemma', matchRules: ['gemma'] },
  { name: 'Ollama', matchRules: ['ollama'] },
  { name: 'VolcEngine', matchRules: ['volcengine'] },
  { name: 'SiliconCloud', matchRules: ['siliconcloud'] },
  { name: 'Stability', matchRules: ['stability'] },
  { name: 'DALL-E', matchRules: ['dall'] },
  { name: 'Grok', matchRules: ['grok'] },
  { name: 'MoonShot', matchRules: ['moonshot', 'kimi'] },
  { name: 'DouBao', matchRules: ['doubao'] },
  { name: 'Cohere', matchRules: ['command'] },
  { name: 'Llama', matchRules: ['llama'] },
  { name: 'ChatGPT', matchRules: ['gpt', 'o1', 'o3'] },
  { name: 'Yi', matchRules: ['yi'] },
  { name: 'Spark', matchRules: ['spark'] },
  { name: 'HaiLuo', matchRules: ['hailuo'] },
  { name: 'StepFun', matchRules: ['stepfun'] },
  { name: 'ComfyUI', matchRules: ['comfyui'] },
  { name: 'VertexAI', matchRules: ['vertexai'] },
  { name: 'Perplexity', matchRules: ['perplexity'] },
  { name: 'Flux', matchRules: ['flux'] },
];

async function seedModelFamilies() {
  console.log('Seeding model families...');

  for (const family of modelFamilyData) {
    const existingFamily = await db.query.modelFamilies.findFirst({
      where: eq(modelFamilies.name, family.name),
    });

    if (!existingFamily) {
      await db.insert(modelFamilies).values(family);
      console.log(`- Inserted ${family.name}`);
    }
  }

  console.log('Model families seeding complete.');
}

seedModelFamilies().catch((error) => {
  console.error('Error seeding model families:', error);
  process.exit(1);
}); 