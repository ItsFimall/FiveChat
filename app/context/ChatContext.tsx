'use client'
import React, { createContext, useContext } from 'react';

// 创建聊天上下文
interface ChatContextType {
  chat_id: string;
  responseStatus: "done" | "pending";
  historyType: string;
  historyCount: number;
  currentModel: any;
  handleSubmit: (message: any) => Promise<void>;
  addBreak: () => Promise<void>;
  stopChat: () => void;
  clearHistory: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider = ({ children, ...props }: React.PropsWithChildren<ChatContextType>) => {
  return (
    <ChatContext.Provider value={props}>
      {children}
    </ChatContext.Provider>
  );
};

export default function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
} 