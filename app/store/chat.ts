import { create } from 'zustand';
import { ChatType } from '@/types/llm';
import { updateChatInServer } from '@/app/chat/actions/chat';

interface IChatStore {
  chat: ChatType | null;
  webSearchEnabled: boolean;
  historyType: 'all' | 'none' | 'count';
  historyCount: number;
  setHistoryType: (chatId: string, newType: 'all' | 'none' | 'count') => Promise<void>;
  setHistoryCount: (chatId: string, newCount: number) => Promise<void>;
  setChat: (chat: ChatType) => void;
  setWebSearchEnabled: (flag: boolean) => void;
  initializeChat: (chatInfo: ChatType) => void;
}

const useChatStore = create<IChatStore>((set) => ({
  chat: null,
  webSearchEnabled: false,
  historyType: 'count',
  historyCount: 10,
  setHistoryType: async (chatId: string, newType: 'all' | 'none' | 'count') => {
    try {
      const result = await updateChatInServer(chatId, { historyType: newType });
      if (result.status === 'success') {
        set((state) => ({ historyType: newType }));
      } else {
        console.error('Failed to update history type:', result.message);
      }
    } catch (error) {
      console.error('Error updating history type:', error);
    }
  },
  setHistoryCount: async (chatId: string, newCount: number) => {
    try {
      const result = await updateChatInServer(chatId, { historyCount: newCount });
      if (result.status === 'success') {
        set((state) => ({ historyCount: newCount }));
      } else {
        console.error('Failed to update history count:', result.message);
      }
    } catch (error) {
      console.error('Error updating history count:', error);
    }
  },

  setChat: (chat: ChatType) => {
    set({ chat: chat });
  },

  setWebSearchEnabled: (flag: boolean) => {
    set({ webSearchEnabled: flag });
  },

  initializeChat: async (chatInfo: ChatType) => {
    set({
      chat: chatInfo,
      historyType: chatInfo.historyType || 'count',
      historyCount: chatInfo.historyCount || 10
    });
  },

}))

export default useChatStore
