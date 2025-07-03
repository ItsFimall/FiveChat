'use client'
import { fetchEventSource, EventStreamContentType, EventSourceMessage } from '@microsoft/fetch-event-source';
import { ChatOptions, LLMApi, LLMModel, LLMUsage, RequestMessage, ResponseContent, MCPToolResponse, MessageContent } from '@/types/llm';
import { prettyObject } from '@/app/utils';
import { InvalidAPIKeyError, OverQuotaError, TimeoutError } from '@/types/errorTypes';
import { callMCPTool } from '@/app/utils/mcpToolsServer';
import { syncMcpTools } from '@/app/chat/actions/chat';
import { mcpToolsToOpenAIResponseTools, openAIResponseToolsToMcpTool } from '@/app/utils/mcpToolsClient';
import { ResponseInputItem, ResponseFunctionToolCall, ResponseItem } from 'openai/resources/responses/responses';

export default class OpenAIResponseApi implements LLMApi {
  private providerId: string;
  constructor(providerId: string = 'openai_response') {
    this.providerId = providerId;
  }
  private controller: AbortController | null = null;
  private answer: MessageContent = '';
  private reasoning_content = '';
  private finishReason = '';
  private inputTokens = 0;
  private outputTokens = 0;
  private totalTokens = 0;
  private mcpTools: MCPToolResponse[] = [];
  private finished = false;
  private isThinking = false;

  prepareMessage<T = ResponseInputItem>(messages: RequestMessage[]): T[] {
    return messages
      .map(msg => {
        let contentArr: any[] = [];
        let contentType = 'input_text';
        if (msg.role === 'user' || msg.role === 'system') {
          contentType = 'input_text';
        } else {
          contentType = 'output_text';
        }
        if (typeof msg.content === 'string') {
          // 文本消息
          contentArr.push({
            type: contentType,
            text: msg.content,
          });
        } else if (Array.isArray(msg.content)) {
          // 混合消息
          for (const item of msg.content) {
            if (item.type === 'text') {
              contentArr.push({
                type: contentType,
                text: item.text,
              });
            } else if (item.type === 'image') {
              contentArr.push({
                type: 'input_image',
                image_url: item.data, // 支持 base64 或 url
                detail: 'auto',
              });
            }
          }
        }
        // 若没有内容，补一个空文本
        if (contentArr.length === 0) {
          contentArr.push({ type: 'input_text', text: '' });
        }
        return {
          role: msg.role as 'user' | 'system' | 'developer',
          content: contentArr,
          type: 'message',
        } as T;
      });
  }

  async chat(options: ChatOptions) {
    this.answer = '';
    this.reasoning_content = '';
    const clear = () => {
      if (!this.finished) {
        this.finished = true;
        if (this.controller) {
          this.controller.abort();
          this.controller = null;
        }
        this.answer = '';
        this.reasoning_content = '';
      }
    };
    this.controller = new AbortController();

    const timeoutId = setTimeout(() => {
      this.controller?.abort('timeout');
      options.onError?.(new TimeoutError('Timeout'));
    }, 60000);

    const messages: ResponseInputItem[] = this.prepareMessage<ResponseInputItem>(options.messages)
    let toolsParameter = {};
    const processOnOpen = async (res: Response) => {
      clearTimeout(timeoutId);
      this.finished = false;
      if (
        !res.ok ||
        !res.headers.get("content-type")?.startsWith(EventStreamContentType) ||
        res.status !== 200
      ) {

        let resTextRaw = '';
        try {
          const resTextJson = await res.clone().json();
          // 正常没有开 stream 时的处理逻辑
          if (res.ok && resTextJson?.status === 'completed') {
            const outputs = resTextJson.output;
            const outputMessage = outputs
              .filter((item: any) => (item.type === 'message' || item.type === 'image_generation_call'))
              .map((item: any) => {
                if (item.type === 'message') {
                  const text = (item.content || [])
                    .filter((c: any) => c.type === 'output_text')
                    .map((c: any) => c.text)
                    .join('');
                  return {
                    type: 'text',
                    text: text
                  };
                }
                if (item.type === 'image_generation_call') {
                  return {
                    type: 'image',
                    mimeType: `image/${item.output_format}`,
                    data: `data:image/${item.output_format}` + ';base64,' + item.result,
                  };
                }
              });
            this.answer = outputMessage;
            this.outputTokens = resTextJson.usage.input_tokens;
            this.outputTokens = resTextJson.usage.output_tokens;
            this.totalTokens = resTextJson.usage.total_tokens;
            options.onFinish({
              id: resTextJson?.metadata.messageId,
              content: this.answer,
              reasoningContent: this.reasoning_content,
              inputTokens: this.inputTokens,
              outputTokens: this.outputTokens,
              totalTokens: this.totalTokens,
              mcpTools: this.mcpTools,
            });
            clear();
            return;
          } else {
            resTextRaw = prettyObject(resTextJson);
          }
        } catch {
          resTextRaw = await res.clone().text();
        }
        const responseTexts = [resTextRaw];
        if (res.status === 401) {
          options.onError?.(new InvalidAPIKeyError('Invalid API Key'));
        } else if (res.status === 459) {
          options.onError?.(new OverQuotaError('Over Quota'));
        } else {
          this.answer = responseTexts.join("\n\n");
          options.onError?.(new Error(this.answer));
        }
        clear();
      }
    }

    const processOnMessage = async (event: EventSourceMessage) => {
      const text = event.data;
      if (text === "") {
        return;
      }

      try {
        const json = JSON.parse(text);
        if (json.error) {
          const prettyResJson = prettyObject(json);
          options.onError?.(new Error(prettyResJson));
          this.finishReason = 'error';
          return;
        }
        if (json.type === 'response.completed') {
          const outputs = json.response.output;
          // 过滤outputs 中 type 为 function_call 的输出
          const responseFunctionCalls = outputs.filter((output: ResponseItem) => output.type === 'function_call');
          final_tool_calls = responseFunctionCalls;
          if (responseFunctionCalls.length > 0) {
            this.finishReason = 'tool_calls';
          } else {
            this.finishReason = 'completed';
          }

          const usage = json?.response?.usage;
          if (usage) {
            this.inputTokens = usage.inputTokens;
            this.outputTokens = usage.outputTokens;
            this.totalTokens = usage.total_tokens;
          }
        }

        if (json?.metadata && json?.metadata.isDone) {
          if (this.finishReason === 'error') {
            return;
          }
          if (this.finishReason === 'tool_calls') {
            // 需要循环调用 tools 再把获取的结果给到大模型
            messages.push(...final_tool_calls);
            for (const toolCall of final_tool_calls) {
              const mcpTool = openAIResponseToolsToMcpTool(options.mcpTools, toolCall);
              if (!mcpTool) {
                continue;
              }
              // toolCalls 包含了大模型返回的提取的参数
              this.mcpTools.push({
                id: toolCall.id || '',
                tool: mcpTool,
                status: 'invoking',
              });
              options.onUpdate({
                content: this.answer,
                reasoningContent: this.reasoning_content,
                mcpTools: this.mcpTools,
              });
              const _mcpTools = this.mcpTools;
              const toolCallResponse = await callMCPTool(mcpTool);
              // 还需要更新工具执行状态
              const toolIndex = _mcpTools.findIndex(t => {
                return t.id === toolCall.id;
              });
              if (toolIndex !== -1) {
                _mcpTools[toolIndex] = {
                  ...this.mcpTools[toolIndex],
                  status: 'done',
                  response: toolCallResponse
                };
              }
              options.onUpdate({
                content: this.answer,
                reasoningContent: this.reasoning_content,
                mcpTools: _mcpTools,
              });

              // MCP 函数返回格式不固定，判断如果只有文字就提取出文字
              let output: string;
              if (Array.isArray(toolCallResponse.content) && toolCallResponse.content.length === 1 && toolCallResponse.content[0]?.type === 'text') {
                output = toolCallResponse.content[0].text;
              } else {
                output = JSON.stringify(toolCallResponse.content);
              }

              const toolResponsContent: ResponseInputItem.FunctionCallOutput = {
                call_id: toolCall.call_id,
                output,
                type: 'function_call_output',
              }
              messages.push(toolResponsContent);
            }
            const shouldContinue: boolean = this.finishReason === 'tool_calls';
            options.onFinish({
              id: json.metadata.messageId,
              content: this.answer,
              reasoningContent: this.reasoning_content,
              inputTokens: this.inputTokens,
              outputTokens: this.outputTokens,
              totalTokens: this.totalTokens,
              mcpTools: this.mcpTools,
            }, shouldContinue);
            syncMcpTools(json.metadata.messageId, this.mcpTools);

            this.mcpTools = [];
            this.answer = '';
            this.reasoning_content = '';
            Object.keys(final_tool_calls).forEach(key => delete final_tool_calls[Number(key)]);
            if (!this.controller) {
              this.controller = new AbortController();
            }
            try {
              await fetchEventSource('/api/responses', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Provider': this.providerId,
                  'X-Model': encodeURIComponent(options.config.model),
                  'X-Chat-Id': options.chatId!,
                },
                body: JSON.stringify({
                  "stream": true,
                  "model": `${options.config.model}`,
                  "input": messages,
                  ...toolsParameter
                }),
                signal: this.controller?.signal,
                onopen: processOnOpen,
                onmessage: processOnMessage,
                onclose: () => {
                  clear();
                },
                onerror: (err) => {
                  this.controller = null;
                  this.finished = true;
                  this.answer = '';
                  throw err;
                },
                openWhenHidden: true,

              })
            } catch (e) { }
            //call tool request end------
          } else {
            options.onFinish({
              id: json.metadata.messageId,
              content: this.answer,
              reasoningContent: this.reasoning_content,
              inputTokens: this.inputTokens,
              outputTokens: this.outputTokens,
              totalTokens: this.totalTokens,
              mcpTools: this.mcpTools,
            }, false);
            // syncMcpTools(json.metadata.messageId, this.mcpTools);
            this.mcpTools = [];
            clear();
            return;
          }
          return;
        }

        // 思考过程的内容
        if (json.type === 'response.reasoning_summary_text.delta') {
          const deltaReasoningContent = json.delta;
          if (deltaReasoningContent) {
            this.reasoning_content += deltaReasoningContent;
          }
        }

        if (json.type === 'response.output_text.delta') {
          const deltaContent = json.delta;
          if (deltaContent) {
            this.answer += deltaContent;
          }
          options.onUpdate({
            content: this.answer,
            reasoningContent: this.reasoning_content,
            mcpTools: this.mcpTools,
          });
        }
      } catch (e) {
        console.error("[Request] parse error", text, e);
      }
    }

    const tools: any = [];
    if (options.buildinTools && options.buildinTools.length > 0) {
      tools.push(...options.buildinTools);
    }
    if (options.mcpTools) {
      const mcpTools = mcpToolsToOpenAIResponseTools(options.mcpTools);
      tools.push(...mcpTools);
    }
    if (tools.length > 0) {
      toolsParameter = {
        tools,
        tool_choice: "auto",
      }
    }
    let final_tool_calls: ResponseFunctionToolCall[] = [];
    try {
      await fetchEventSource('/api/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Provider': this.providerId,
          'X-Model': encodeURIComponent(options.config.model),
          'X-Chat-Id': options.chatId!,
        },
        body: JSON.stringify({
          "stream": true,
          "model": `${options.config.model}`,
          "input": messages,
          ...toolsParameter
        }),
        signal: this.controller.signal,
        onopen: processOnOpen,
        onmessage: processOnMessage,
        onclose: () => {
          clear();
        },
        onerror: (err) => {
          this.controller = null;
          this.finished = true;
          this.answer = '';
          // 需要 throw，不然框架会自动重试
          throw err;
        },
        openWhenHidden: true,
      });
    } catch (error) {
      if (error instanceof Error) {
        options.onError?.(new InvalidAPIKeyError('Invalid API Key'));
      } else {
        options.onError?.(new Error('An unknown error occurred'));
      }
      clear();
    } finally {
      clearTimeout(timeoutId);
    }
  }
  stopChat = (callback: (responseContent: ResponseContent) => void) => {
    this.finished = true;
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
    callback({
      content: this.answer,
      reasoningContent: this.reasoning_content,
      mcpTools: this.mcpTools,
    });
    this.answer = '';
    this.reasoning_content = '';
    this.mcpTools = [];
  }

  async check(modelId: string, apikey: string, apiUrl: string): Promise<{ status: 'success' | 'error', message?: string }> {
    const headers = {
      'Content-Type': 'application/json',
      'X-Apikey': `${apikey}`,
      'X-Provider': this.providerId,
      'X-Model': encodeURIComponent(modelId),
      'X-Endpoint': apiUrl
    };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch('/api/responses', {
        signal: controller.signal,
        method: 'POST',
        headers,
        body: JSON.stringify({
          "model": modelId,
          "input": 'Hello',
          "stream": true,
        }),
      });
      if (!res.ok) {
        let resTextRaw = '';
        try {
          const resTextJson = await res.clone().json();
          resTextRaw = prettyObject(resTextJson);
        } catch {
          resTextRaw = await res.clone().text();
        }
        return {
          status: 'error',
          message: resTextRaw,
        }
      } else {
        clearTimeout(timeoutId);
        return {
          status: 'success'
        }
      }
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        return {
          status: 'error',
          message: '网络连接超时',
        }
      }
      return {
        status: 'error',
        message: (error as Error)?.message || 'Unknown error occurred',
      }
    }
  }
  usage(): Promise<LLMUsage> {
    throw new Error('Method not implemented.');
  }

  models(): Promise<LLMModel[]> {
    throw new Error('Method not implemented.');
  }

}
