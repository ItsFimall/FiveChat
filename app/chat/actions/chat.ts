'use server';
import { db } from '@/app/db';
import { auth } from "@/auth";
import { eq, and, desc, asc, inArray } from 'drizzle-orm';
import { ChatType, MCPToolResponse } from '@/types/llm';
import WebSearchService from '@/app/services/WebSearchService';
import { chats, messages, appSettings, mcpServers, mcpTools, searchEngineConfig } from '@/app/db/schema';
import { WebSearchResponse } from '@/types/search';

export const addChatInServer = async (
  chatInfo: {
    title: string;
    defaultModel?: string;
    defaultProvider?: string;
    searchEnabled?: boolean;
    historyType?: 'all' | 'none' | 'count';
    historyCount?: number;
    isStar?: boolean;
    isWithBot?: boolean;
    botId?: number;
    avatar?: string;
    avatarType?: 'emoji' | 'url' | 'none';
    prompt?: string;
  }
) => {
  const session = await auth();
  if (!session?.user.id) {
    return {
      status: 'fail',
      message: 'please login first.'
    }
  }
  const safeTitle = chatInfo.title.length > 255 ? chatInfo.title.slice(0, 255) : chatInfo.title;
  const result = await db.insert(chats)
    .values({
      ...chatInfo,
      title: safeTitle,
      userId: session.user.id
    })
    .returning();
  if (result[0]) {
    return {
      status: 'success',
      data: result[0],
    }
  } else {
    return {
      status: 'fail',
    }
  }
}

export const getChatInfoInServer = async (chatId: string): Promise<{ status: string; data: ChatType | null }> => {
  const session = await auth();
  if (!session?.user.id) {
    return {
      status: 'success',
      data: null
    }
  }
  const result = await db.select()
    .from(chats)
    .where(
      and(
        eq(chats.id, chatId),
        eq(chats.userId, session.user.id),
      ));
  if (result.length > 0) {
    const data = result[0];
    return {
      status: 'success',
      data: {
        id: data.id,
        title: data.title ?? undefined,
        defaultModel: data.defaultModel ?? undefined,
        defaultProvider: data.defaultProvider ?? undefined,
        searchEnabled: data.searchEnabled ?? undefined,
        historyType: data.historyType ?? undefined,
        historyCount: data.historyCount ?? undefined,
        isStar: data.isStar ?? undefined,
        isWithBot: data.isWithBot ?? undefined,
        botId: data.botId ?? undefined,
        avatarType: data.avatarType ?? undefined,
        prompt: data.prompt ?? undefined,
        createdAt: data.createdAt!,
        starAt: data.starAt ?? undefined,
      }
    }
  } else {
    return {
      status: 'fail',
      data: null
    }
  }
}

export const getChatListInServer = async () => {
  const session = await auth();
  if (!session?.user.id) {
    return {
      status: 'success',
      data: []
    }
  }
  const result = await db.select()
    .from(chats)
    .where(
      and(
        eq(chats.userId, session.user.id)
      ))
    .orderBy(desc(chats.createdAt));
  return {
    status: 'success',
    data: result
  }
}

export const updateChatInServer = async (chatId: string, newChatInfo: {
  title?: string;
  defaultModel?: string;
  defaultProvider?: string;
  historyType?: 'all' | 'none' | 'count';
  historyCount?: number;
  isStar?: boolean;
  isWithBot?: boolean;
  botId?: number;
  avatar?: string;
  avatarType?: 'emoji' | 'url' | 'none';
  prompt?: string;
  starAt?: Date;
}) => {
  const session = await auth();
  if (!session?.user.id) {
    return {
      status: 'fail',
      message: 'please login first.'
    }
  }
  const safeChatInfo = { ...newChatInfo };
  if (safeChatInfo.title && safeChatInfo.title.length > 255) {
    safeChatInfo.title = safeChatInfo.title.slice(0, 255);
  }
  const result = await db.update(chats)
    .set(safeChatInfo)
    .where(
      and(
        eq(chats.id, chatId),
        eq(chats.userId, session.user.id)
      ));
  return {
    status: 'success',
  }
}

export const updateChatTitleInServer = async (chatId: string, newTitle: string) => {
  const session = await auth();
  if (!session?.user.id) {
    return {
      status: 'fail',
      message: 'please login first.'
    }
  }
  try {
    const safeTitle = newTitle.length > 255 ? newTitle.slice(0, 255) : newTitle;
    await db.update(chats)
      .set({
        title: safeTitle,
      })
      .where(
        and(
          eq(chats.id, chatId),
          eq(chats.userId, session.user.id)
        ));
    return {
      status: 'success',
    }
  }
  catch {
    return {
      status: 'fail',
    }
  }
}

export const deleteChatInServer = async (chatId: string) => {
  const session = await auth();
  if (!session?.user.id) {
    return {
      status: 'fail',
      message: 'please login first.'
    }
  }
  const result = await db.delete(chats)
    .where(
      and(
        eq(chats.id, chatId),
        eq(chats.userId, session.user.id)
      ));
  await db.delete(messages)
    .where(
      and(
        eq(messages.chatId, chatId),
        eq(messages.userId, session.user.id)
      ));

  return {
    status: 'success',
  }

}

export const deleteAllUserChatInServer = async () => {
  const session = await auth();
  if (!session?.user.id) {
    return {
      status: 'fail',
      message: 'please login first.'
    }
  }
  const result = await db.delete(chats)
    .where(
      eq(chats.userId, session.user.id)
    );
  await db.delete(messages)
    .where(
      eq(messages.userId, session.user.id)
    );
  return {
    status: 'success',
  }
}

export const fetchAppSettings = async (key: string) => {
  const result = await db.query.appSettings
    .findFirst({
      where: eq(appSettings.key, key)
    });
  return result?.value;
}

export const fetchSettingsByKeys = async (keys: Array<string>) => {
  const results = await db.query.appSettings
    .findMany({
      where: (appSettings) => inArray(appSettings.key, keys)
    });

  // Initialize the result object with all requested keys set to null
  const settingsObject = keys.reduce((acc, key) => {
    acc[key] = null;
    return acc;
  }, {} as Record<string, string | null>);

  // Update the values for keys that exist in the database
  results.forEach(setting => {
    settingsObject[setting.key] = setting.value;
  });

  return settingsObject;
}

export const getMcpServersAndAvailableTools = async () => {
  try {
    const tools = await db
      .select({
        name: mcpTools.name,
        description: mcpTools.description,
        serverId: mcpTools.serverId,
        inputSchema: mcpTools.inputSchema,
      })
      .from(mcpTools)
      .leftJoin(mcpServers, eq(mcpTools.serverId, mcpServers.id))
      .orderBy(
        asc(mcpTools.serverId),
      )
      .where(
        eq(mcpServers.isActive, true)
      );
    const servers = await db.query.mcpServers.findMany({
      where: eq(mcpServers.isActive, true),
      orderBy: [mcpServers.createdAt],
    });
    return {
      tools,
      mcpServers: servers
    };
  } catch (error) {
    return {
      tools: [],
      mcpServers: []
    };
  }
}

export const syncMcpTools = async (messageId: number, mcpToolsResponse: MCPToolResponse[]) => {
  try {
    await db.update(messages)
      .set({
        mcpTools: mcpToolsResponse,
        updatedAt: new Date()
      })
      .where(eq(messages.id, messageId));

    return {
      status: 'success',
      message: '工具信息已保存'
    };
  } catch (error) {
    console.error('同步 MCP 工具响应失败:', error);
    return {
      status: 'fail',
      message: '同步工具失败'
    };
  }
}

export const getSearchResult = async (keyword: string): Promise<{
  status: string;
  message: string;
  data: WebSearchResponse | null;
}> => {
  const session = await auth();
  if (!session?.user) {
    throw new Error('not allowed');
  }

  const searchConfig = await db.query.searchEngineConfig.findFirst({
    where: eq(searchEngineConfig.isActive, true)
  });
  if (searchConfig) {
    try {
      const webSearch = await WebSearchService.search({
        id: searchConfig.id,
        name: searchConfig.name,
        apiKey: searchConfig.apiKey as string
      }, keyword, searchConfig.maxResults);
      return {
        status: 'success',
        message: 'success',
        data: webSearch
      }
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      }
    }
  } else {
    return {
      status: 'error',
      message: '管理员未配置搜索',
      data: null
    }
  }
}