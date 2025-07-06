import { addMessageInServer } from '@/app/chat/actions/message';
import { updateUsage } from './actions';

export default async function proxyOpenAiStream(response: Response,
  messageInfo: {
    chatId?: string,
    model: string,
    userId: string,
    providerId: string
  }): Promise<Response> {
  const transformStream = new TransformStream({
    async transform(chunk, controller) {
      controller.enqueue(chunk);
    }
  });

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.pipeThrough(transformStream).getReader();
  const stream = new ReadableStream({
    async start(controller: ReadableStreamDefaultController) {
      let bufferedData = '';
      let completeResponse = '';
      let promptTokens = null;
      let completionTokens = null;
      let totalTokens = null;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        bufferedData += new TextDecoder().decode(value, { stream: true });
        // Parse SSE format from bufferedData
        const lines = bufferedData.split('\n');
        bufferedData = lines.pop() || ''; // 保留最后一行可能是不完整JSON

        for (const line of lines) {
          const cleanedLine = line.replace(/^data: /, "").trim();
          if (cleanedLine === "" || cleanedLine.startsWith('event:')) {
            continue;
          }

          try {
            const parsedLine = JSON.parse(cleanedLine);
            // 修改为支持 Claude API 的处理方式
            if (parsedLine.type === "content_block_delta") {
              const { delta } = parsedLine;
              if (delta.type === 'text_delta') {
                const content = delta.text;
                // 更新 UI
                if (content) {
                  completeResponse += content;
                }
              }
            } else if (parsedLine.type === 'message_stop') {
              const usage = parsedLine.usage || parsedLine['amazon-bedrock-invocationMetrics'];
              if (usage) {
                promptTokens = usage?.inputTokenCount || null;
                completionTokens = usage?.outputTokenCount || null;
                totalTokens = promptTokens && completionTokens ? promptTokens + completionTokens : null;
              }
            }
          } catch (error) {
            console.error("JSON parse error:", error, "in line:", cleanedLine);
          }
        }
        controller.enqueue(value);
      }
      // 有 ChatId 的存储到 messages 表
      if (messageInfo.chatId) {
        const toAddMessage = {
          chatId: messageInfo.chatId,
          content: completeResponse,
          role: 'assistant',
          type: 'text' as const,
          inputTokens: promptTokens,
          outputTokens: completionTokens,
          totalTokens: totalTokens,
          model: messageInfo.model,
          providerId: messageInfo.providerId,
        }
        const id = await addMessageInServer(toAddMessage);
        // 发送一个自定义的消息，包含消息ID
        const metadataEvent = {
          isDone: true,
          messageId: id
        };
        const metadataString = `data: ${JSON.stringify({ metadata: metadataEvent })}\n\n`;
        controller.enqueue(new TextEncoder().encode(metadataString));
      }
      updateUsage(messageInfo.userId, {
        chatId: messageInfo.chatId,
        date: new Date().toISOString().split('T')[0],
        userId: messageInfo.userId,
        modelId: messageInfo.model,
        providerId: messageInfo.providerId,
        inputTokens: promptTokens || 0,
        outputTokens: completionTokens || 0,
        totalTokens: totalTokens || 0,
      });
      controller.close();
    }
  });

  // 设置响应 headers
  const responseHeaders = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  return new Response(stream, {
    headers: responseHeaders,
  });
}