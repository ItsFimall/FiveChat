import { create } from 'zustand';
import { ChatType } from '@/types/llm';
import { updateChatInServer } from '@/app/chat/actions/chat';

interface IChatStore {
  chat: ChatType | null;
  webSearchEnabled: boolean;
  builtInImageGen: boolean;
  builtInWebSearch: boolean;
  historyType: 'all' | 'none' | 'count';
  historyCount: number;
  setHistoryType: (chatId: string, newType: 'all' | 'none' | 'count') => void;
  setHistoryCount: (chatId: string, newCount: number) => void;
  setChat: (chat: ChatType) => void;
  setWebSearchEnabled: (flag: boolean) => void;
  setBuiltInImageGen: (flag: boolean) => void;
  initializeChat: (chatInfo: ChatType) => void;
}

const useChatStore = create<IChatStore>((set) => ({
  chat: null,
  webSearchEnabled: false,
  builtInImageGen: false,
  builtInWebSearch: false,
  historyType: 'count',
  historyCount: 5,
  setHistoryType: (chatId: string, newType: 'all' | 'none' | 'count') => {
    set((state) => {
      updateChatInServer(chatId, { historyType: newType })
      return { historyType: newType }
    });
  },
  setHistoryCount: (chatId: string, newCount: number) => {
    set((state) => {
      updateChatInServer(chatId, { historyCount: newCount })
      return { historyCount: newCount }
    });
  },

  setChat: (chat: ChatType) => {
    set({ chat: chat });
  },

  setWebSearchEnabled: (flag: boolean) => {
    set({ webSearchEnabled: flag });
  },

  setBuiltInImageGen: (flag: boolean) => {
    set({ builtInImageGen: flag });
  },

  initializeChat: async (chatInfo: ChatType) => {
    set({
      chat: chatInfo,
      historyType: chatInfo.historyType || 'count',
      historyCount: chatInfo.historyCount || 5
    });
  },

}))

export default useChatStore
