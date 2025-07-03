'use server';
import WebSearchService from '@/app/services/WebSearchService';
import { searchEngineConfig } from '@/app/db/schema';
import { db } from '@/app/db';
import { eq } from 'drizzle-orm';
import { auth } from "@/auth";

export async function getDefaultSearchEngineConfig() {
  const session = await auth();
  if (!session?.user.isAdmin) {
    throw new Error('not allowed');
  }
  try {
    const result = await db.query.searchEngineConfig.findFirst({
      where: eq(searchEngineConfig.isActive, true)
    });
    if (result) {
      return result;
    } else {
      // Check if tavily config exists
      const tavilyConfig = await db.query.searchEngineConfig.findFirst({
        where: eq(searchEngineConfig.id, 'tavily')
      });

      if (tavilyConfig) {
        // If tavily config exists, set it as active
        await db.update(searchEngineConfig)
          .set({ isActive: true })
          .where(eq(searchEngineConfig.id, 'tavily'));
        return { ...tavilyConfig, isActive: true };
      } else {
        // If no config exists at all, create new tavily config
        const newConfig = {
          id: 'tavily',
          name: 'Tavily',
          apiKey: '',
          isActive: true,
          extractKeywords: false,
          maxResults: 5,
        };
        await db.insert(searchEngineConfig).values(newConfig);
        return newConfig;
      }
    }
  } catch (error) {
    throw new Error('query config list fail');
  }
}

export async function setSearchEngineConfig(searchEngineId: string) {
  const session = await auth();
  if (!session?.user.isAdmin) {
    throw new Error('not allowed');
  }
  try {
    // First, set all search engines to inactive
    await db.update(searchEngineConfig)
      .set({ isActive: false })
      .where(eq(searchEngineConfig.isActive, true));

    // Then, get the target search engine config
    const targetConfig = await db.query.searchEngineConfig.findFirst({
      where: eq(searchEngineConfig.id, searchEngineId)
    });

    if (targetConfig) {
      // If config exists, update it to active
      await db.update(searchEngineConfig)
        .set({ isActive: true })
        .where(eq(searchEngineConfig.id, searchEngineId));
      return targetConfig;
    } else {
      // If config doesn't exist, create a new one
      const newConfig = {
        id: searchEngineId,
        name: searchEngineId,
        apiKey: '',
        isActive: true,
        extractKeywords: false,
        maxResults: 5,
      };
      await db.insert(searchEngineConfig).values(newConfig);
      return newConfig;
    }
  } catch (error) {
    throw new Error('Failed to set search engine config');
  }
}

export async function saveSearchEngineConfig() {
  const session = await auth();
  if (!session?.user.isAdmin) {
    throw new Error('not allowed');
  }
  try {
    const result = await db.query.searchEngineConfig.findFirst({
      where: eq(searchEngineConfig.isActive, true)
    });
    if (result) {
      return result;
    } else {
      return {
        id: 'tavily',
        name: 'Tavily',
        apiKey: '',
        maxResults: 5,
      }
    }
  } catch (error) {
    throw new Error('query user list fail');
  }
}

export async function updateSearchEngineConfig(config: {
  id: string;
  name: string;
  apiKey: string | null;
  isActive: boolean;
  extractKeywords: boolean;
  maxResults: number;
}) {
  const session = await auth();
  if (!session?.user.isAdmin) {
    throw new Error('not allowed');
  }
  try {
    await db.update(searchEngineConfig)
      .set(config)
      .where(eq(searchEngineConfig.id, config.id));
    return { status: 'success' };
  } catch (error) {
    throw new Error('update search engine config fail');
  }
}

export const checkSearch = async (providerId: string, apiKey: string): Promise<{ valid: boolean; message?: string }> => {
  const session = await auth();
  if (!session?.user.isAdmin) {
    throw new Error('not allowed');
  }
  const result = await WebSearchService.checkSearch({
    id: providerId,
    name: providerId,
    apiKey: apiKey,
  })
  return {
    valid: result.valid,
    message: result.error?.message,
  };
}