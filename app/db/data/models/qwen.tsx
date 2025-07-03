import { LLMModel, LLMModelProvider } from "@/types/llm"
export const provider: LLMModelProvider = {
  id: 'qwen',
  providerName: '通义千问',
  apiStyle: 'openai',
}

export const modelList: LLMModel[] = [
  {
    'id': 'qwen-max',
    'displayName': '通义千问 Max',
    'supportVision': false,
    'supportTool': true,
    'selected': true,
    provider
  },
  {
    'id': 'qwen-plus',
    'displayName': '通义千问 Plus',
    'supportVision': false,
    'supportTool': true,
    'selected': true,
    provider
  },
  {
    'id': 'qwen-turbo',
    'displayName': '通义千问 Turbo',
    'supportVision': false,
    'supportTool': true,
    'selected': true,
    provider
  },
  {
    'id': 'qwen-vl-max',
    'displayName': '通义千问 VL',
    'supportVision': true,
    'supportTool': true,
    'selected': true,
    provider
  },  
]