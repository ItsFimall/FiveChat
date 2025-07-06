import { LLMModel, LLMModelProvider } from "@/types/llm"
export const provider: LLMModelProvider = {
  id: 'grok',
  providerName: 'Grok',
  apiStyle: 'openai',
}

export const modelList: LLMModel[] = [
  {
    'id': 'grok-3-beta',
    'displayName': 'Grok3',
    'supportVision': false,
    'supportTool': true,
    "maxTokens": 131072,
    'selected': true,
    provider
  },
  {
    'id': 'grok-3-mini-beta',
    'displayName': 'Grok3 Mini',
    'supportVision': false,
    'supportTool': true,
    "maxTokens": 131072,
    'selected': true,
    provider
  },
  {
    'id': 'grok-2-vision-1212',
    'displayName': 'Grok2 Vision',
    'supportVision': true,
    "maxTokens": 32768,
    'selected': true,
    provider
  },
  {
    'id': 'grok-2',
    'displayName': 'Grok2',
    'supportVision': false,
    "maxTokens": 131072,
    'selected': true,
    provider
  }
]