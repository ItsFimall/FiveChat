'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Message } from '@/types/llm';

interface UseOptimizedMessagesOptions {
  chatId: string;
  pageSize?: number;
  enableVirtualization?: boolean;
}

interface UseOptimizedMessagesReturn {
  messages: Message[];
  hasMore: boolean;
  isLoading: boolean;
  loadMore: () => Promise<void>;
  totalCount: number;
  error: string | null;
}

export const useOptimizedMessages = ({
  chatId,
  pageSize = 50,
  enableVirtualization = true
}: UseOptimizedMessagesOptions): UseOptimizedMessagesReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Memoized fetch function to prevent unnecessary re-creation
  const fetchMessages = useCallback(async (page: number = 0, reset: boolean = false) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/chat/${chatId}/messages?page=${page}&limit=${pageSize}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (reset) {
        setMessages(data.messages || []);
      } else {
        setMessages(prev => [...prev, ...(data.messages || [])]);
      }
      
      setTotalCount(data.totalCount || 0);
      setHasMore(data.hasMore || false);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
      console.error('Error fetching messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [chatId, pageSize, isLoading]);

  // Load more messages
  const loadMore = useCallback(async () => {
    if (hasMore && !isLoading) {
      await fetchMessages(currentPage + 1, false);
    }
  }, [fetchMessages, hasMore, isLoading, currentPage]);

  // Initial load
  useEffect(() => {
    if (chatId) {
      fetchMessages(0, true);
    }
  }, [chatId, fetchMessages]);

  // Memoized return value to prevent unnecessary re-renders
  return useMemo(() => ({
    messages,
    hasMore,
    isLoading,
    loadMore,
    totalCount,
    error
  }), [messages, hasMore, isLoading, loadMore, totalCount, error]);
};

// Hook for real-time message updates
export const useRealtimeMessages = (chatId: string, initialMessages: Message[] = []) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const updateMessage = useCallback((messageId: number, updates: Partial<Message>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    ));
  }, []);

  const deleteMessage = useCallback((messageId: number) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  return {
    messages,
    addMessage,
    updateMessage,
    deleteMessage,
    setMessages
  };
};

// Hook for message caching
export const useMessageCache = () => {
  const cache = useMemo(() => new Map<string, Message[]>(), []);

  const getCachedMessages = useCallback((chatId: string): Message[] | null => {
    return cache.get(chatId) || null;
  }, [cache]);

  const setCachedMessages = useCallback((chatId: string, messages: Message[]) => {
    cache.set(chatId, messages);
  }, [cache]);

  const clearCache = useCallback((chatId?: string) => {
    if (chatId) {
      cache.delete(chatId);
    } else {
      cache.clear();
    }
  }, [cache]);

  return {
    getCachedMessages,
    setCachedMessages,
    clearCache
  };
};
