import { addMessageInServer } from '@/app/chat/actions/message';
import { updateUsage } from './actions';

export default async function proxyGeminiStream(response: Response,
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
      let completeResponse: Array<{ text: string } | { inlineData: { mimeType: string, data: string } }> = [];
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
          if (cleanedLine === "") {
            continue;
          }

          try {
            const parsedData = JSON.parse(cleanedLine);
            
            // Add null checks to handle missing data safely
            if (!parsedData.candidates || parsedData.candidates.length === 0) {
              console.error("No candidates in response:", cleanedLine);
              continue;
            }
            
            const { content, finishReason } = parsedData.candidates[0];
            const usage = parsedData.usageMetadata;
            
            if (content && content.parts) {
              completeResponse = completeResponse.concat(content.parts);
            }

            if (finishReason && usage) {
              promptTokens = usage.promptTokenCount || 0;
              completionTokens = usage.candidatesTokenCount || 0;
              totalTokens = usage.totalTokenCount || 0;
            }

          } catch (error) {
            console.error("JSON parse error:", error, "in line:", cleanedLine);
          }
        }
        controller.enqueue(value);
      }
      // 有 ChatId 的存储到 messages 表，需要转为数据库的格式
      const convertedContent = completeResponse.filter(Boolean).map((part): { type: "text"; text: string; } | { type: "image"; mimeType: string; data: string; } | null => {
        if ('text' in part && part.text) {
          return {
            type: 'text' as const,
            text: part.text
          };
        }
        if ('inlineData' in part && part.inlineData) {
          return {
            type: 'image' as const,
            mimeType: part.inlineData.mimeType,
            data: 'data:' + part.inlineData.mimeType + ';base64,' + part.inlineData.data,
          };
        }
        return null;
      }).filter((item) => item !== null);

      const mergedContent = convertedContent.reduce((acc: any[], curr: { type: string; text?: string; mimeType?: string; data?: string }) => {
        if (!curr) return acc;
        const lastElement = acc[acc.length - 1];
        if (lastElement && lastElement.type === 'text' && curr.type === 'text') {
          lastElement.text += curr.text;
          return acc;
        }

        acc.push(curr);
        return acc;
      }, []);
      if (messageInfo.chatId) {
        const toAddMessage = {
          chatId: messageInfo.chatId,
          content: mergedContent,
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
        inputTokens: promptTokens  || 0,
        outputTokens: completionTokens  || 0,
        totalTokens: totalTokens  || 0,
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