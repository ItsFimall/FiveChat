import { LLMModel, LLMModelProvider } from "@/types/llm"
export const provider: LLMModelProvider = {
  id: 'openrouter',
  providerName: 'OpenRouter',
  apiStyle: 'openai',
}

export const modelList: LLMModel[] = [
  {
    'id': 'deepseek/deepseek-r1:free',
    'displayName': 'DeepSeek: R1 (free)',
    'supportVision': false,
    "maxTokens": 164 * 1024,
    'selected': true,
    provider
  },
  {
    'id': 'deepseek/deepseek-chat:free',
    'displayName': 'DeepSeek V3 (free)',
    'supportVision': false,
    'supportTool': true,
    "maxTokens": 128 * 1024,
    'selected': true,
    provider
  },
  {
    'id': 'deepseek/deepseek-r1',
    'displayName': 'DeepSeek: R1',
    'supportVision': false,
    'selected': true,
    provider
  },
  {
    'id': 'deepseek/deepseek-chat',
    'displayName': 'DeepSeek V3',
    'supportVision': false,
    'supportTool': true,
    "maxTokens": 134144,
    'selected': true,
    provider
  },
]