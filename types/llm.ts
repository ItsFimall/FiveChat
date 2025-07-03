import { WebSearchResponse } from '@/types/search';

export abstract class LLMApi {
  abstract chat(options: ChatOptions): Promise<void>;
  abstract prepareMessage?<T>(messages: RequestMessage[]): T[];
  abstract stopChat(callback?: (answer: ResponseContent) => void): void;
  abstract usage(): Promise<LLMUsage>;
  abstract models(): Promise<LLMModel[]>;
}

export type ChatType = {
  id: string;
  title?: string;
  defaultModel?: string;
  defaultProvider?: string,
  searchEnabled?: boolean,
  historyType?: 'all' | 'none' | 'count';
  historyCount?: number;
  isStar?: boolean;
  isWithBot?: boolean;
  botId?: number;
  avatar?: string;
  avatarType?: 'emoji' | 'url' | 'none';
  prompt?: string;
  createdAt: Date;
  starAt?: Date;
}

export type Message = {
  id?: number;
  chatId: string;
  role: string;
  content: string | Array<
    {
      type: 'text';
      text: string;
    }
    | {
      type: 'image';
      mimeType: string;
      data: string;
    }
  >;
  reasoninContent?: string;
  searchEnabled?: boolean;
  searchStatus?: "none" | "searching" | "error" | "done";
  mcpTools?: MCPToolResponse[];
  webSearch?: WebSearchResponse;
  providerId: string;
  model: string;
  type: 'text' | 'image' | 'error' | 'break';
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  errorType?: string;
  errorMessage?: string;
  createdAt?: Date;
}

export type ResponseContent = {
  id?: number;
  content: MessageContent;
  reasoningContent?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  mcpTools?: MCPToolResponse[];
}

export type ChatOptions = {
  messages: RequestMessage[];
  config: LLMConfig;
  chatId?: string;
  buildinTools?: any[];
  mcpTools?: MCPTool[];
  onUpdate: (update: ResponseContent) => void;
  onFinish: (message: ResponseContent, shouldContinue?: boolean) => void;
  onError?: (error?: Error) => void;
  onController?: (controller: AbortController) => void;
}

export type MessageContent = string | Array<
  {
    type: 'text';
    text: string;
  }
  | {
    type: 'image';
    mimeType: string;
    data: string;
  }
>;

export interface RequestMessage {
  role: 'developer' | 'system' | 'user' | 'assistant' | 'tool' | 'function';
  content: MessageContent;
  tool_call_id?: string;
}

export interface LLMConfig {
  model: string;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  presence_penalty?: number;
  frequency_penalty?: number;
}

export interface LLMUsage {
  used: number;
  total: number;
}

export interface LLMModel {
  id: string;
  displayName: string;
  apiUrl?: string;
  maxTokens?: number;
  supportVision?: boolean;
  supportTool?: boolean;
  builtInImageGen?: boolean;
  builtInWebSearch?: boolean;
  selected?: boolean;
  provider: LLMModelProvider;
  type?: 'default' | 'custom';
}

export interface LLMModelRealId {
  id: number;
  name: string;
  displayName: string;
  apiUrl?: string;
  maxTokens?: number;
  supportVision?: boolean;
  selected?: boolean;
  provider: LLMModelProvider;
  type?: 'default' | 'custom';
}

export type apiStyle = 'openai' | 'claude' | 'gemini' | 'openai_response';

export interface LLMModelProvider {
  id: string;
  providerName: string;
  apiStyle: apiStyle;
  providerLogo?: string;
  status?: boolean;
  type?: 'default' | 'custom';
}

export default interface TranslaterComponent {
  startTranslate: (question: string, language: string, completeCallback: (result: string) => void) => void;
  stopTranslate: () => void;
  clear: () => void;
}

export interface MCPToolInputSchema {
  type: string
  description?: string
  required?: string[]
  properties: Record<string, object>
}

export interface MCPTool {
  id: string
  name: string
  serverName: string
  description?: string
  inputSchema: MCPToolInputSchema
}

export interface MCPServer {
  name: string
  description?: string
  type: 'sse' | 'streamableHttp'
  baseUrl?: string
  isActive: boolean
}

export interface MCPToolResponse {
  id: string // tool call id, it should be unique
  tool: MCPTool // tool info
  status: string // 'invoking' | 'done'
  response?: any
}