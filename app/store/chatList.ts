import { create } from 'zustand';
import { updateChatTitleInServer, updateChatInServer } from '@/app/chat/actions/chat';
import { addBotToChatInServer } from '@/app/chat/actions/bot';
import { ChatType } from '@/types/llm';

interface IChatListStore {
  chatList: ChatType[];
  setNewTitle: (chatId: string, newTitle: string) => void;
  setChatList: (chatList: ChatType[]) => void;
  updateChat: (chatId: string, chat: {
    title?: string;
    defaultModel?: string;
    historyType?: 'all' | 'none' | 'count';
    historyCount?: number;
    isStar?: boolean;
    isWithBot?: boolean;
    botId?: number;
    avatar?: string;
    avatarType?: 'emoji' | 'url' | 'none';
    prompt?: string;
    starAt?: Date;
  }) => Promise<void>;
  addBot: (botId: number) => void;
}

const useChatListStore = create<IChatListStore>((set) => ({
  chatList: [],
  setNewTitle: (chatId: string, newTitle: string) => {
    set((state) => {
      updateChatTitleInServer(chatId, newTitle);
      // 同步更新聊天列表
      const chatList = state.chatList.map(chat => {
        if (chat.id === chatId) {
          return { ...chat, title: newTitle };
        }
        return chat;
      });
      return { chatList };
    });
  },
  updateChat: async (chatId: string, newChatInfo) => {
    try {
      const result = await updateChatInServer(chatId, newChatInfo);
      if (result.status === 'success') {
        set((state) => {
          const chatList = state.chatList.map(chat => {
            if (chat.id === chatId) {
              return { ...chat, ...newChatInfo };
            }
            return chat;
          });
          return { chatList };
        });
      } else {
        console.error('Failed to update chat:', result.message);
      }
    } catch (error) {
      console.error('Error updating chat:', error);
    }
  },
  setChatList: (chatList: ChatType[]) => {
    set((state) => {
      return { chatList: chatList };
    });
  },

  addBot: async (botId: number) => {
    const result = await addBotToChatInServer(botId);
    set((state) => ({
      chatList: [result.data as ChatType, ...state.chatList],
    }));
  },

}))

export default useChatListStore
