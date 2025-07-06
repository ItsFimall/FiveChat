import { LLMModel, LLMModelProvider } from "@/types/llm"
export const provider: LLMModelProvider = {
  id: 'hunyuan',
  providerName: '腾讯混元',
  apiStyle: 'openai',
}

export const modelList: LLMModel[] = [
  {
    'id': 'hunyuan-turbo-latest',
    'displayName': 'Hunyuan Turbo',
    'supportVision': false,
    'supportTool': true,
    "maxTokens": 32768,
    'selected': true,
    provider
  },
  {
    'id': 'hunyuan-large',
    'displayName': 'Hunyuan Large',
    'supportVision': false,
    'supportTool': true,
    "maxTokens": 32768,
    'selected': true,
    provider
  },
  {
    'id': 'hunyuan-standard-vision',
    'displayName': 'Hunyuan Standard Vision',
    'supportVision': true,
    'supportTool': true,
    "maxTokens": 8192,
    'selected': true,
    provider
  },
  {
    'id': 'hunyuan-lite-vision',
    'displayName': 'Hunyuan Lite Vision',
    'supportVision': true,
    'supportTool': true,
    "maxTokens": 32768,
    'selected': true,
    provider
  },
]