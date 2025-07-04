'use server';
import { db } from '@/app/db';
import { auth } from "@/auth";
import { MCPToolResponse as LLMMCPToolResponse, MessageContent } from '@/types/llm';
import { eq, and, asc } from 'drizzle-orm';
import { messages, MCPToolResponse, WebSearchResponse } from '@/app/db/schema';
import { searchResultType, WebSearchResponse as SearchWebSearchResponse } from '@/types/search';

export const clearMessageInServer = async (chatId: string) => {
  const session = await auth();
  if (!session?.user.id) {
    return {
      status: 'success',
      data: []
    }
  }

  const result = await db.delete(messages)
    .where(
      and(
        eq(messages.chatId, chatId),
        eq(messages.userId, session.user.id)
      ));
  return {
    status: 'success',
  }
}
export const deleteMessageInServer = async (messageId: number) => {
  const session = await auth();
  if (!session?.user.id) {
    return {
      status: 'success',
      data: []
    }
  }

  const result = await db.delete(messages)
    .where(
      and(
        eq(messages.id, messageId),
        eq(messages.userId, session.user.id)
      ));
  return {
    status: 'success',
  }
}

export const getMessagesInServer = async (chatId: string) => {
  const session = await auth();
  if (!session?.user.id) {
    return {
      status: 'success',
      data: []
    }
  }
  const result = await db.select()
    .from(messages)
    .where(
      and(
        eq(messages.chatId, chatId),
        eq(messages.userId, session.user.id),
      ))
    .orderBy(asc(messages.createdAt));
  return {
    status: 'success',
    data: result
  }
}

export const addMessageInServer = async (message: {
  chatId: string,
  role: string,
  content: MessageContent,
  reasoninContent?: string,
  searchEnabled?: boolean,
  searchStatus?: searchResultType,
  mcpTools?: LLMMCPToolResponse[],
  providerId: string,
  model: string,
  type: 'text' | 'image' | 'error' | 'break',
  inputTokens?: number | null,
  outputTokens?: number | null,
  totalTokens?: number | null,
  errorType?: string,
  errorMessage?: string,
}) => {
  const session = await auth();
  if (!session?.user.id) {
    return {
      status: 'fail',
      message: 'please login first.'
    }
  }
  // 转换 mcpTools 格式
  const dbMessage = {
    ...message,
    mcpTools: message.mcpTools ? message.mcpTools.map(tool => ({
      name: tool.tool.name,
      result: tool.response,
      error: tool.status === 'error' ? 'Tool execution failed' : undefined
    })) : undefined
  };

  const [result] = await db.insert(messages)
    .values({ userId: session.user.id, ...dbMessage })
    .returning();
  return result.id;
}

export const updateMessageWebSearchInServer = async (
  messageId: number,
  searchEnabled: boolean,
  searchStatus: "none" | "searching" | "error" | "done",
  webSearch?: SearchWebSearchResponse,
) => {
  const session = await auth();
  if (!session?.user.id) {
    return {
      status: 'fail',
      message: 'please login first.'
    }
  }

  try {
    // 转换 webSearch 格式
    const dbWebSearch: WebSearchResponse | undefined = webSearch ? {
      query: webSearch.query || '',
      results: webSearch.results.map(result => ({
        title: result.title,
        url: result.url,
        snippet: result.content
      }))
    } : undefined;

    await db.update(messages)
      .set({
        searchEnabled: searchEnabled,
        searchStatus: searchStatus,
        webSearch: dbWebSearch,
        updatedAt: Date.now()
      })
      .where(
        and(
          eq(messages.id, messageId),
          eq(messages.userId, session.user.id)
        ));

    return {
      status: 'success',
      message: '搜索信息已保存'
    };
  } catch (error) {
    console.error('同步搜索响应失败:', error);
    return {
      status: 'fail',
      message: '同步搜索失败'
    };
  }
}