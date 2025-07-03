import { LLMModel, LLMModelProvider } from "@/types/llm"
export const provider: LLMModelProvider = {
  id: 'deepseek',
  providerName: 'Deepseek',
  apiStyle: 'openai',
}

export const modelList: LLMModel[] = [
  {
    'id': 'deepseek-chat',
    'displayName': 'DeepSeek V3',
    'supportVision': false,
    'supportTool': true,
    'maxTokens': 65536,
    'selected': true,
    provider
  },
  {
    'id': 'deepseek-reasoner',
    'displayName': 'DeepSeek R1',
    'supportVision': false,
    'supportTool': false,
    'maxTokens': 65536,
    'selected': true,
    provider
  }
]