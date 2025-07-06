import { LLMModel, LLMModelProvider } from "@/types/llm"
export const provider: LLMModelProvider = {
  id: 'claude',
  providerName: 'Claude',
  apiStyle: 'claude',
}

export const modelList: LLMModel[] = [
  {
    'id': 'claude-sonnet-4-20250514',
    'displayName': 'Claude 4 Sonnet',
    'supportVision': true,
    'supportTool': true,
    'maxTokens': 204800,
    'selected': true,
    provider
  },
  {
    'id': 'claude-opus-4-20250514',
    'displayName': 'Claude 4 Opus',
    'supportVision': true,
    'supportTool': true,
    'maxTokens': 204800,
    'selected': true,
    provider
  },
  {
    'id': 'claude-3-7-sonnet-20250219',
    'displayName': 'Claude 3.7 Sonnet',
    'supportVision': true,
    'supportTool': true,
    'maxTokens': 204800,
    'selected': true,
    provider
  },
  {
    'id': 'claude-3-5-sonnet-20241022',
    'displayName': 'Claude 3.5 Sonnet',
    'supportVision': true,
    'supportTool': true,
    'maxTokens': 204800,
    'selected': true,
    provider
  },
  {
    'id': 'claude-3-5-haiku-20241022',
    'displayName': 'Claude 3.5 Haiku',
    'supportVision': true,
    'supportTool': true,
    'maxTokens': 204800,
    'selected': true,
    provider
  }
]