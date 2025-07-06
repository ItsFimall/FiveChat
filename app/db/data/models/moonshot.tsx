import { LLMModel, LLMModelProvider } from "@/types/llm"
export const provider: LLMModelProvider = {
  id: 'moonshot',
  providerName: 'Moonshot',
  apiStyle: 'openai',
}

export const modelList: LLMModel[] = [
  {
    'id': 'moonshot-v1-auto',
    'displayName': 'Moonshot v1 Auto',
    'supportVision': false,
    'supportTool': true,
    "maxTokens": 131072,
    'selected': true,
    provider
  },
  {
    'id': 'moonshot-v1-8k',
    'displayName': 'Moonshot v1 8K',
    'supportVision': false,
    'supportTool': true,
    "maxTokens": 8192,
    'selected': true,
    provider
  },
  {
    'id': 'moonshot-v1-32k',
    'displayName': 'Moonshot v1 32K',
    'supportVision': false,
    'supportTool': true,
    "maxTokens": 32768,
    'selected': true,
    provider
  },
  {
    'id': 'moonshot-v1-128k',
    'displayName': 'Moonshot v1 128K',
    'supportVision': false,
    'supportTool': true,
    "maxTokens": 131072,
    'selected': true,
    provider
  },
]