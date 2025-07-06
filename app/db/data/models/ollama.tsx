import { LLMModel, LLMModelProvider } from "@/types/llm"
export const provider: LLMModelProvider = {
  id: 'ollama',
  providerName: 'Ollama',
  apiStyle: 'openai',
}

export const modelList: LLMModel[] = [
  {
    'id': 'llama3.2:3b',
    'displayName': 'Llama3.2 3B',
    'supportVision': false,
    'maxTokens': 131072,
    'selected': true,
    provider
  },
  {
    'id': 'llama3.2-vision',
    'displayName': 'Llama3.2 vision',
    'supportVision': true,
    'maxTokens': 131072,
    'selected': true,
    provider
  },
]