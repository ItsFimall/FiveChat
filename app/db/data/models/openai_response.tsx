import { LLMModel, LLMModelProvider } from "@/types/llm"
export const provider: LLMModelProvider = {
  id: 'openai_response',
  providerName: 'OpenAI',
  apiStyle: 'openai_response',
}

export const modelList: LLMModel[] = [
  {
    'id': 'gpt-4.1',
    'displayName': 'GPT 4.1',
    'supportVision': true,
    'supportTool': true,
    'maxTokens': 1024000,
    'selected': true,
    provider
  },
  {
    'id': 'gpt-4.1-mini',
    'displayName': 'GPT 4.1 mini',
    'supportVision': true,
    'supportTool': true,
    'builtInImageGen': true,
    'builtInWebSearch': false,
    'maxTokens': 1024000,
    'selected': true,
    provider
  },
  {
    'id': 'gpt-4.1-nano',
    'displayName': 'GPT 4.1 nano',
    'supportVision': true,
    'supportTool': true,
    'maxTokens': 1024000,
    'selected': true,
    provider
  },
  {
    'id': 'gpt-4o',
    'displayName': 'GPT 4o',
    'supportVision': true,
    'supportTool': true,
    'maxTokens': 131072,
    'selected': true,
    provider
  },
  {
    'id': 'gpt-4o-mini',
    'displayName': 'GPT 4o mini',
    'supportVision': true,
    'supportTool': true,
    'maxTokens': 131072,
    'selected': true,
    provider
  },
  {
    'id': 'o1',
    'displayName': 'o1',
    'supportVision': false,
    'maxTokens': 131072,
    'selected': true,
    provider
  },
  {
    'id': 'o1-mini',
    'displayName': 'o1 mini',
    'supportVision': false,
    'maxTokens': 131072,
    'selected': true,
    provider
  },
  {
    'id': 'gpt-4-turbo-preview',
    'displayName': 'GPT 4 Turbo',
    'supportVision': true,
    'supportTool': true,
    'maxTokens': 131072,
    'selected': false,
    provider
  },
  {
    'id': 'gpt-4-32k',
    'displayName': 'GPT 4 32k',
    'supportVision': true,
    'supportTool': true,
    'maxTokens': 32768,
    'selected': false,
    provider
  }
]