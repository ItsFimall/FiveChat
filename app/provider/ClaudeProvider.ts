import { fetchEventSource, EventStreamContentType, EventSourceMessage } from '@microsoft/fetch-event-source';
import { ChatOptions, LLMApi, LLMModel, LLMUsage, RequestMessage, ResponseContent, MCPToolResponse } from '@/types/llm';
import { prettyObject } from '@/app/utils';
import { callMCPTool } from '@/app/utils/mcpToolsServer';
import { InvalidAPIKeyError, TimeoutError, MCPErrorHandler } from '@/types/errorTypes';
import { mcpToolsToAnthropicTools, anthropicToolUseToMcpTool } from '@/app/utils/mcpToolsClient';
import { syncMcpTools } from '@/app/chat/actions/chat';
import {
  MessageCreateParamsNonStreaming,
  MessageParam,
  ToolResultBlockParam,
  ToolUseBlock
} from '@anthropic-ai/sdk/resources';

export default class ClaudeApi implements LLMApi {
  private controller: AbortController | null = null;
  private answer = '';
  private reasoning_content = '';
  private inputTokens = 0;
  private outputTokens = 0;
  private totalTokens = 0;
  private finishReason = '';
  private mcpTools: MCPToolResponse[] = [];
  private finished = false;
  prepareMessage<MessageParam>(messages: RequestMessage[]): MessageParam[] {
    return messages.map(msg => {
      // 处理文本消息
      if (typeof msg.content === 'string') {
        return {
          role: msg.role,
          content: msg.content
        } as MessageParam;
      }

      // 处理包含图像的消息
      if (Array.isArray(msg.content)) {
        const formattedContent = msg.content.map(item => {
          if (item.type === 'text') {
            return {
              type: 'text',
              text: item.text
            };
          }
          if (item.type === 'image') {
            return {
              type: 'image',
              source: {
                type: "base64",
                media_type: item.mimeType || 'image/jpeg',
                data: item.data.substring(item.data.indexOf(",") + 1)
              }
            };
          }
        }).filter(Boolean);

        return {
          role: msg.role,
          content: formattedContent
        } as MessageParam;
      }

      // 默认返回文本消息
      return {
        role: msg.role,
        content: ''
      } as MessageParam;
    });
  }
  async chat(options: ChatOptions) {
    this.answer = '';
    const clear = () => {
      if (!this.finished) {
        this.finished = true;
        if (this.controller) {
          this.controller.abort();
          this.controller = null;
        }
        this.answer = '';
      }
    };
    this.controller = new AbortController();

    const timeoutId = setTimeout(() => {
      this.controller?.abort('timeout');
      options.onError?.(new TimeoutError('Timeout'));
    }, 30000);

    const messages = this.prepareMessage(options.messages)

    const processOnMessage = async (event: EventSourceMessage) => {
      const text = event.data;
      if (text) {
        try {
          const json = JSON.parse(text);
          if (json?.metadata && json?.metadata.isDone) {
            // 处理工具调用
            // 将对象形式的 final_tool_calls 转换为数组形式
            const toolCalls = Object.values(final_tool_calls);
            if (this.finishReason === 'tool_use' && toolCalls.length > 0) {
              for (const toolCall of toolCalls) {
                const mcpTool = anthropicToolUseToMcpTool(options.mcpTools, toolCall)
                if (mcpTool) {
                  this.mcpTools.push({
                    id: toolCall.id,
                    tool: mcpTool,
                    status: 'invoking',
                  });
                  // 次数还没变空
                  options.onUpdate({
                    content: this.answer,
                    reasoningContent: this.reasoning_content,
                    mcpTools: this.mcpTools,
                  });

                  let toolCallResponse: any = null;
                  try {
                    toolCallResponse = await callMCPTool(mcpTool);
                    const toolIndex = this.mcpTools.findIndex(t => t.id === toolCall.id);
                    if (toolIndex !== -1) {
                      this.mcpTools[toolIndex] = {
                        ...this.mcpTools[toolIndex],
                        status: 'done',
                        response: toolCallResponse
                      };
                    }
                  } catch (error) {
                    // 处理MCP工具调用错误
                    const toolIndex = this.mcpTools.findIndex(t => t.id === toolCall.id);
                    if (toolIndex !== -1) {
                      let errorMessage = 'Tool call failed';

                      if (MCPErrorHandler.isMCPError(error)) {
                        errorMessage = error.toUserMessage();
                        MCPErrorHandler.logError(error);
                      } else {
                        console.error(`[Claude Provider] MCP tool call error:`, error);
                        errorMessage = `工具调用失败: ${(error as Error).message}`;
                      }

                      const errorResponse = {
                        isError: true,
                        content: [
                          {
                            type: 'text',
                            text: errorMessage
                          }
                        ]
                      };

                      this.mcpTools[toolIndex] = {
                        ...this.mcpTools[toolIndex],
                        status: 'error',
                        response: errorResponse
                      };

                      // 设置错误响应用于后续处理
                      toolCallResponse = errorResponse;
                    }
                  }

                  // 这里已经为空了
                  options.onUpdate({
                    content: this.answer,
                    reasoningContent: this.reasoning_content,
                    mcpTools: this.mcpTools,
                  });

                  const toolResponsContent: ToolResultBlockParam[] = [];
                  if (toolCallResponse && toolCallResponse.content) {
                    for (const content of toolCallResponse.content) {
                      let toolResponseMessage: ToolResultBlockParam;
                      if (content.type === 'text') {
                        toolResponseMessage = {
                          tool_use_id: toolCall.id,
                          type: 'tool_result',
                          content: content.text,
                        };
                      }
                      else {
                        console.warn('Unsupported content type:', content.type)
                        toolResponseMessage = {
                          tool_use_id: toolCall.id,
                          type: 'tool_result',
                          content: 'unsupported content type: ' + content.type
                        }
                      }
                      toolResponsContent.push(toolResponseMessage);
                      messages.push({
                        role: 'assistant',
                        content: [{ ...toolCall, input: JSON.parse(toolCall.input as string) }]
                      });
                      messages.push({
                        role: 'user',
                        content: [toolResponseMessage]
                      });
                    }
                  }
                }
              }
              options.onFinish({
                id: json.metadata.messageId,
                content: this.answer,
                reasoningContent: this.reasoning_content,
                inputTokens: this.inputTokens,
                outputTokens: this.outputTokens,
                totalTokens: this.totalTokens,
                mcpTools: this.mcpTools,
              }, true);
              syncMcpTools(json.metadata.messageId, this.mcpTools);
              this.answer = '';
              this.reasoning_content = '';
              this.mcpTools = [];
              Object.keys(final_tool_calls).forEach(key => delete final_tool_calls[Number(key)]);
              
              if (!this.controller) {
                this.controller = new AbortController();
              }
              // 这里再 fetchEventSource
              try {
                await fetchEventSource('/api/completions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Provider': 'claude',
                    'X-Model': encodeURIComponent(options.config.model),
                    'X-Chat-Id': options.chatId!,
                  },
                  body: JSON.stringify({
                    "stream": true,
                    'max_tokens': 2048,
                    "model": `${options.config.model}`,
                    "messages": messages,
                    ...toolsParameter,
                  }),
                  signal: this.controller.signal,
                  onopen: async (res) => {
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
                        resTextRaw = prettyObject(resTextJson);
                      } catch {
                        resTextRaw = await res.clone().text();
                      }
                      const responseTexts = [resTextRaw];

                      if (res.status === 401) {
                        options.onError?.(new InvalidAPIKeyError('Invalid API Key'));
                      } else {
                        this.answer = responseTexts.join("\n\n");
                        options.onError?.(new Error(this.answer));
                      }
                      clear();
                    }
                  },
                  onmessage: processOnMessage,
                  onclose: () => {
                    this.controller = null;
                    clear();
                  },
                  onerror: (err) => {
                    this.controller = null;
                    this.finished = true;
                    this.answer = '';
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
              syncMcpTools(json.metadata.messageId, this.mcpTools);
              this.mcpTools = [];
              clear();
              return;
            }
            return;
          }
          const { type, index, delta, content_block } = JSON.parse(text);
          if (type === 'message_delta' && delta?.stop_reason) {
            this.finishReason = delta.stop_reason;
          }
          if (content_block && content_block?.type === 'tool_use') {
            final_tool_calls[index] = {
              id: content_block.id,
              name: content_block.name,
              type: 'tool_use',
              input: ''
            };
          }
          if (type === 'content_block_delta' && delta.type === 'input_json_delta') {
            final_tool_calls[index].input += delta.partial_json;
          }

          if (type === 'content_block_delta' && delta.type === 'text_delta') {
            const deltaContent = delta?.text;
            if (deltaContent) {
              this.answer += deltaContent;
            }
            options.onUpdate({
              content: this.answer,
              mcpTools: this.mcpTools,
            });
          }

          if (type === 'message_stop') {
            const usage = json.usage || json['amazon-bedrock-invocationMetrics'];
            this.inputTokens = usage?.inputTokenCount || null;
            this.outputTokens = usage?.outputTokenCount || null;
            this.totalTokens = usage.inputTokenCount + usage.outputTokenCount;
          }

        } catch (e) {
          console.error("[Request] parse error", `--------${text}------`, `===--${event}---`);
        }
      }
    }

    let toolsParameter = {};
    if (options.mcpTools) {
      const tools = mcpToolsToAnthropicTools(options.mcpTools);
      if (tools.length > 0) {
        toolsParameter = {
          tools,
          "tool_choice": { "type": "auto" },
        }
      }
    }
    const final_tool_calls = {} as Record<number, ToolUseBlock>
    try {
      await fetchEventSource('/api/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Provider': 'claude',
          'X-Model': encodeURIComponent(options.config.model),
          'X-Chat-Id': options.chatId!,
        },
        body: JSON.stringify({
          "stream": true,
          'max_tokens': 2048,
          "model": `${options.config.model}`,
          "messages": messages,
          ...toolsParameter
        }),
        signal: this.controller.signal,
        onopen: async (res) => {
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
              resTextRaw = prettyObject(resTextJson);
            } catch {
              resTextRaw = await res.clone().text();
            }
            const responseTexts = [resTextRaw];

            if (res.status === 401) {
              options.onError?.(new InvalidAPIKeyError('Invalid API Key'));
            } else {
              this.answer = responseTexts.join("\n\n");
              options.onError?.(new Error(this.answer));
            }
            clear();
          }
        },
        onmessage: processOnMessage,
        onclose: () => {
          this.controller = null;
          // clear();
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
    this.mcpTools = [];
  }

  async check(modelId: string, apikey: string, apiUrl: string): Promise<{ status: 'success' | 'error', message?: string }> {
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': `${apikey}`,
      'X-Provider': 'claude',
      'X-Model': encodeURIComponent(modelId),
      'X-Endpoint': apiUrl
    };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch('/api/completions', {
        signal: controller.signal,
        method: 'POST',
        headers,
        body: JSON.stringify({
          "stream": true,
          'max_tokens': 2048,
          "model": modelId,
          "messages": [{
            "role": "user",
            "content": "ping"
          }],
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