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
  }) => void;
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
  updateChat: (chatId: string, newChatInfo) => {
    set((state) => {
      // 转换 starAt 为时间戳格式
      const serverChatInfo = {
        ...newChatInfo,
        starAt: newChatInfo.starAt ? newChatInfo.starAt.getTime() : undefined
      };
      updateChatInServer(chatId, serverChatInfo);
      const chatList = state.chatList.map(chat => {
        if (chat.id === chatId) {
          return { ...chat, ...newChatInfo };
        }
        return chat;
      });
      return { chatList };
    });
  },
  setChatList: (chatList: ChatType[]) => {
    set((state) => {
      return { chatList: chatList };
    });
  },

  addBot: async (botId: number) => {
    const result = await addBotToChatInServer(botId);
    const convertedChat = {
      ...result.data,
      createdAt: result.data?.createdAt ? new Date(result.data.createdAt) : new Date(),
      updatedAt: result.data?.updatedAt ? new Date(result.data.updatedAt) : new Date(),
      starAt: result.data?.starAt ? new Date(result.data.starAt) : undefined
    };
    set((state) => ({
      chatList: [convertedChat as ChatType, ...state.chatList],
    }));
  },

}))

export default useChatListStore
