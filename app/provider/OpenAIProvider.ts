'use client'
import { fetchEventSource, EventStreamContentType, EventSourceMessage } from '@microsoft/fetch-event-source';
import { ChatOptions, LLMApi, LLMModel, LLMUsage, RequestMessage, ResponseContent, MCPToolResponse } from '@/types/llm';
import { prettyObject } from '@/app/utils';
import { InvalidAPIKeyError, OverQuotaError, TimeoutError, MCPErrorHandler } from '@/types/errorTypes';
import { callMCPTool } from '@/app/utils/mcpToolsServer';
import { syncMcpTools } from '@/app/chat/actions/chat';
import { mcpToolsToOpenAITools, openAIToolsToMcpTool } from '@/app/utils/mcpToolsClient';
import {
  ChatCompletionMessageToolCall,
  ChatCompletionToolMessageParam,
  ChatCompletionAssistantMessageParam,
  ChatCompletionContentPartText,
  ChatCompletionMessageParam,
} from 'openai/resources';

export default class ChatGPTApi implements LLMApi {
  private providerId: string;
  constructor(providerId: string = 'openai') {
    this.providerId = providerId;
  }
  private controller: AbortController | null = null;
  private answer = '';
  private reasoning_content = '';
  private finishReason = '';
  private inputTokens = 0;
  private outputTokens = 0;
  private totalTokens = 0;
  private mcpTools: MCPToolResponse[] = [];
  private finished = false;
  private isThinking = false;

  /**
   * Clean the tool call arguments
   * @param toolCall - The tool call
   * @returns The cleaned tool call
   */
  private cleanToolCallArgs(toolCall: ChatCompletionMessageToolCall): ChatCompletionMessageToolCall {
    if (toolCall.function.arguments) {
      let args = toolCall.function.arguments
      const codeBlockRegex = /```(?:\w*\n)?([\s\S]*?)```/
      const match = args.match(codeBlockRegex)
      if (match) {
        // Extract content from code block
        let extractedArgs = match[1].trim()
        // Clean function call format like tool_call(name1=value1,name2=value2)
        const functionCallRegex = /^\s*\w+\s*\(([\s\S]*?)\)\s*$/
        const functionMatch = extractedArgs.match(functionCallRegex)
        if (functionMatch) {
          // Try to convert parameters to JSON format
          const params = functionMatch[1].split(',').filter(Boolean)
          // const paramsObj = {}
          const paramsObj: { [key: string]: any } = {}; // 显式定义索引签名
          params.forEach((param) => {
            const [name, value] = param.split('=').map((p) => p.trim())
            if (name && value !== undefined) {
              paramsObj[name] = value
            }
          })
          extractedArgs = JSON.stringify(paramsObj)
        }
        toolCall.function.arguments = extractedArgs
      }
      args = toolCall.function.arguments
      const firstBraceIndex = args.indexOf('{')
      const lastBraceIndex = args.lastIndexOf('}')
      if (firstBraceIndex !== -1 && lastBraceIndex !== -1 && firstBraceIndex < lastBraceIndex) {
        toolCall.function.arguments = args.substring(firstBraceIndex, lastBraceIndex + 1)
      }
    }
    return toolCall
  }

  prepareMessage<ChatCompletionMessageParam>(messages: RequestMessage[]): ChatCompletionMessageParam[] {
    return messages.map(msg => {
      // 处理文本消息
      if (typeof msg.content === 'string') {
        return {
          role: msg.role,
          content: msg.content
        } as ChatCompletionMessageParam;
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
              type: 'image_url',
              image_url: {
                url: item.data,
              }
            };
          }
        }).filter(Boolean);

        return {
          role: msg.role,
          content: formattedContent
        } as ChatCompletionMessageParam;
      }

      // 默认返回文本消息
      return {
        role: msg.role,
        content: ''
      } as ChatCompletionMessageParam;
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
    }, 30000);

    const messages: ChatCompletionMessageParam[] = this.prepareMessage(options.messages)
    let toolsParameter = {};

    const processOnMessage = async (event: EventSourceMessage) => {
      const text = event.data;
      if (text === "[DONE]" || text === "") {
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
        if (json?.metadata && json?.metadata.isDone) {
          if (this.finishReason === 'error') {
            return;
          }
          if (this.finishReason === 'tool_calls') {
            // 需要循环调用 tools 再把获取的结果给到大模型
            const toolCalls = Object.values(final_tool_calls).map(this.cleanToolCallArgs);
            messages.push({
              role: 'assistant',
              tool_calls: toolCalls
            } as ChatCompletionAssistantMessageParam);
            for (const toolCall of toolCalls) {
              const mcpTool = openAIToolsToMcpTool(options.mcpTools, toolCall);
              if (!mcpTool) {
                continue;
              }
              // toolCalls 包含了大模型返回的提取的参数
              this.mcpTools.push({
                id: toolCall.id,
                tool: mcpTool,
                status: 'invoking',
              });
              options.onUpdate({
                content: this.answer,
                reasoningContent: this.reasoning_content,
                mcpTools: this.mcpTools,
              });
              const _mcpTools = this.mcpTools;

              let toolCallResponse: any = null;
              try {
                toolCallResponse = await callMCPTool(mcpTool);
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
              } catch (error) {
                // 处理MCP工具调用错误
                const toolIndex = _mcpTools.findIndex(t => t.id === toolCall.id);
                if (toolIndex !== -1) {
                  let errorMessage = 'Tool call failed';

                  if (MCPErrorHandler.isMCPError(error)) {
                    errorMessage = error.toUserMessage();
                    MCPErrorHandler.logError(error);
                  } else {
                    console.error(`[OpenAI Provider] MCP tool call error:`, error);
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

                  _mcpTools[toolIndex] = {
                    ...this.mcpTools[toolIndex],
                    status: 'error',
                    response: errorResponse
                  };

                  // 设置错误响应用于后续处理
                  toolCallResponse = errorResponse;
                }
              }

              options.onUpdate({
                content: this.answer,
                reasoningContent: this.reasoning_content,
                mcpTools: _mcpTools,
              });

              // 只有在有响应时才处理内容
              const toolResponsContent: Array<ChatCompletionContentPartText | string> = [];
              if (toolCallResponse && toolCallResponse.content) {
                for (const content of toolCallResponse.content) {
                  if (content.type === 'text') {
                    toolResponsContent.push({
                      type: 'text',
                      text: content.text
                    })
                  }
                  else {
                    console.warn('Unsupported content type:', content.type)
                    toolResponsContent.push({
                      type: 'text',
                      text: 'unsupported content type: ' + content.type
                    })
                  }
                }

                if (options.config.model.toLocaleLowerCase().includes('gpt')) {
                  messages.push({
                    role: 'tool',
                    content: toolResponsContent,
                    tool_call_id: toolCall.id
                  } as ChatCompletionToolMessageParam)
                } else {
                  messages.push({
                    role: 'tool',
                    content: JSON.stringify(toolResponsContent),
                    tool_call_id: toolCall.id
                  } as ChatCompletionToolMessageParam)
                }
              }
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
              await fetchEventSource('/api/completions', {
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
                  "messages": messages,
                  "stream_options": {
                    "include_usage": true
                  }
                }),
                signal: this.controller?.signal,
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
                    } else if (res.status === 459) {
                      options.onError?.(new OverQuotaError('Over Quota'));
                    } else {
                      this.answer = responseTexts.join("\n\n");
                      options.onError?.(new Error(this.answer));
                    }
                    clear();
                  }
                },
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
            syncMcpTools(json.metadata.messageId, this.mcpTools);
            this.mcpTools = [];
            clear();
            return;
          }
          return;
        }
        const usage = json.usage || json.choices[0].usage; // 兼容 Moonshot
        if (usage) {
          this.inputTokens = usage.prompt_tokens;
          this.outputTokens = usage.completion_tokens;
          this.totalTokens = usage.total_tokens;
        }
        if (json?.choices.length === 0) {
          return;
        }
        const delta = json?.choices[0]?.delta;
        const finishReason = json.choices[0]?.finish_reason
        this.finishReason = finishReason;
        // 拼接 toolCall 参数
        if (delta?.tool_calls) {
          const chunkToolCalls = delta.tool_calls
          for (const t of chunkToolCalls) {
            const { index, id, function: fn, type } = t
            const args = fn && typeof fn.arguments === 'string' ? fn.arguments : ''
            if (!(index in final_tool_calls)) {
              final_tool_calls[index] = {
                id,
                function: {
                  name: fn?.name,
                  arguments: args
                },
                type
              } as ChatCompletionMessageToolCall
            } else {
              final_tool_calls[index].function.arguments += args
            }
          }
        }
        //------------end-of-toolCall----------

        const deltaContent = delta?.content;
        // openRouter 放在 reasoning 字段中
        const deltaReasoningContent = delta?.reasoning_content || delta?.reasoning;
        if (deltaReasoningContent) {
          this.reasoning_content += deltaReasoningContent;
        }
        if (deltaContent) {
          if (!this.isThinking) {
            if (deltaContent.startsWith("<think>")) {
              this.isThinking = true;
              const thinkContent = deltaContent.slice(7).trim();
              if (thinkContent) {
                this.reasoning_content += thinkContent;
              }
            }
            // 智谱等特殊情况， <think> 标签可能被拆分在不同 chunk 中
            else if ((this.answer + deltaContent).includes('<think>')) {
              this.isThinking = true;
              const text = this.answer + deltaContent;
              const thinkContent = text.slice(text.indexOf('<think>') + 7).trim();
              if (thinkContent) {
                this.reasoning_content = thinkContent;
              }
              this.answer = '';
            } else {
              this.answer += deltaContent;
            }
          } else {
            if (deltaContent.endsWith("</think>")) {
              this.isThinking = false;
              const thinkContent = deltaContent.slice(0, -8).trim();
              if (thinkContent) {
                this.reasoning_content += thinkContent;
              }
            } 
            // 智谱等特殊情况， </think> 标签可能被拆分在不同 chunk 中
            else if ((this.reasoning_content + deltaContent).includes('</think>')) {
              this.isThinking = false;
              const text = this.reasoning_content + deltaContent;
              const thinkContent = text.slice(0, text.indexOf('</think>')).trim();
              if (thinkContent) {
                this.reasoning_content = thinkContent;
              }
              const answerText = text.slice(text.indexOf('</think>') + 8).trim();
              if (answerText) {
                this.answer = answerText;
              }
            } else {
              if (deltaContent.trim()) {
                this.reasoning_content += deltaContent;
              }
            }
          }
        }
        options.onUpdate({
          content: this.answer,
          reasoningContent: this.reasoning_content,
          mcpTools: this.mcpTools,
        });
      } catch (e) {
        console.error("[Request] parse error", text, e);
      }
    }

    if (options.mcpTools) {
      const tools = mcpToolsToOpenAITools(options.mcpTools);
      if (tools.length > 0) {
        toolsParameter = {
          tools,
          tool_choice: "auto",
        }
      }
    }
    const final_tool_calls = {} as Record<number, ChatCompletionMessageToolCall>
    try {
      await fetchEventSource('/api/completions', {
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
          "messages": messages,
          "stream_options": {
            "include_usage": true
          },
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
            } else if (res.status === 459) {
              options.onError?.(new OverQuotaError('Over Quota'));
            } else {
              this.answer = responseTexts.join("\n\n");
              options.onError?.(new Error(this.answer));
            }
            clear();
          }
        },
        onmessage: processOnMessage,
        onclose: () => {
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
      const res = await fetch('/api/completions', {
        signal: controller.signal,
        method: 'POST',
        headers,
        body: JSON.stringify({
          "stream": true,
          "model": modelId,
          "messages": [{
            "role": "user",
            "content": "hello"
          }],
          "stream_options": {
            "include_usage": true
          }
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
