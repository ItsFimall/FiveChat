import { ChatOptions, RequestMessage, LLMModel } from '@/types/llm';
import { ResponseContent } from '@/types/llm';
import ChatGPTApi from '@/app/provider/OpenAIProvider';
import OpenAIResponseApi from '@/app/provider/OpenAIResponseProvider';
import Claude from '@/app/provider/ClaudeProvider';
import GeminiApi from '@/app/provider/GeminiProvider';

export function prettyObject(msg: any) {
  const obj = msg;
  if (typeof msg !== "string") {
    msg = JSON.stringify(msg, null, "  ");
  }
  if (msg === "{}") {
    return obj.toString();
  }
  if (msg.startsWith("```json")) {
    return msg;
  }
  return ["```json", msg, "```"].join("\n");
}

export function generateTitle(
  messages: RequestMessage[],
  model: LLMModel,
  onFinish: (message: string) => void,
  onError: () => void
) {
  const llmApi = getProviderInstance(model.provider.id, model.provider.apiStyle);
  const toSendMessages: RequestMessage[] = [...messages, {
    role: "user",
    content: "使用4到8个字直接返回这句话的简要主题，在 8 个字以内，不要解释、不要标点、不要语气词、不要多余文本，不要加粗，如果没有主题，请直接返回“闲聊”"
  }];
  const options: ChatOptions = {
    messages: toSendMessages,
    config: { model: model.id },
    onUpdate: (responseContent: ResponseContent) => {
    },
    onFinish: async (responseContent: ResponseContent) => {
      if (typeof responseContent.content === 'string') {
        onFinish(responseContent.content);
      } else if (Array.isArray(responseContent.content)) {
        const textContent = responseContent.content.find(item => item.type === 'text');
        if (textContent && 'text' in textContent) {
          onFinish(textContent.text);
        } else {
          onFinish("闲聊1");
        }
      } else {
        onFinish("闲聊2");
      }
    },
    onError: async (err?: Error) => {
      onError();
    },
  }
  llmApi.chat(options);
}

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => {
      console.error('Error converting file to base64:', error);
      reject(new Error('Failed to convert file to base64'));
    };
  });
};

export const getProviderInstance = (providerId: string, apiStyle: string) => {
  let llmApi;
  switch (apiStyle) {
    case 'claude':
      llmApi = new Claude();
      break;
    case 'gemini':
      llmApi = new GeminiApi();
      break;
    case 'openai_response':
      llmApi = new OpenAIResponseApi(providerId);
      break;
    default:
      llmApi = new ChatGPTApi(providerId);
      break;
  }
  return llmApi;
}