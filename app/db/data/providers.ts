import { llmSettingsType } from '@/types/llm';

const providers: llmSettingsType[] = [
  {
    provider: 'openai',
    providerName: 'OpenAI',
    apikey: null,
    endpoint: null,
    isActive: null,
    apiStyle: 'openai',
    type: 'default',
    logo: '/images/providers/openai.svg',
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

export default providers;