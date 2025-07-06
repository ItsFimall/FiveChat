'use client'
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Modal } from "antd";
import { useRouter } from 'next/navigation';
import ChatHeader from '@/app/components/ChatHeader';
import ResponsingMessage from '@/app/components/ResponsingMessage';
import MessageItem from '@/app/components/MessageItem';
import useChat from '@/app/hooks/chat/useChat';
import { throttle } from 'lodash';
import ScrollToBottomButton from '@/app/components/ScrollToBottomButton';
import { useTranslations } from 'next-intl';
import InputArea from '@/app/components/InputArea';
import PromptSection from '@/app/components/PromptSection';
import LoadingSkeleton from '@/app/components/LoadingSkeleton';
import NewChatButton from '@/app/components/NewChatButton';
import { ChatProvider } from '@/app/context/ChatContext';

export const MessageList = (props: { chat_id: string }) => {
  const t = useTranslations('Chat');
  const [modal, contextHolder] = Modal.useModal();
  const messageListRef = useRef<HTMLDivElement>(null);
  const [stableShowScrollButton, setStableShowScrollButton] = useState(false);
  const router = useRouter();
  
  const {
    chat,
    messageList,
    searchStatus,
    responseStatus,
    responseMessage,
    historyType,
    historyCount,
    isUserScrolling,
    currentModel,
    isPending,
    handleSubmit,
    deleteMessage,
    addBreak,
    retryMessage,
    stopChat,
    clearHistory,
    setIsUserScrolling,
  } = useChat(props.chat_id);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!isUserScrolling && messageListRef.current) {
      // Use requestAnimationFrame for smoother scrolling
      const scrollToBottom = () => {
        try {
          messageListRef.current?.scrollTo({
            top: messageListRef.current.scrollHeight
          });
        } catch (error) {
          console.error('Scroll error:', error);
        }
      };

      requestAnimationFrame(scrollToBottom);
    }
  }, [
    responseMessage.content,
    responseMessage.reasoningContent,
    responseMessage.mcpTools?.length,
    isUserScrolling,
    messageList.length
  ]);

  // Optimized scroll handler with useCallback and performance optimizations
  const handleScroll = useCallback(() => {
    const chatElement = messageListRef.current;
    if (!chatElement) return;

    try {
      const isNearBottom = chatElement.scrollHeight - chatElement.scrollTop <= chatElement.clientHeight + 20;
      setIsUserScrolling(!isNearBottom);
      
      // Only update scroll button state when needed
      if (responseStatus !== 'pending' || isUserScrolling) {
        setStableShowScrollButton(!isNearBottom && chatElement.scrollHeight > chatElement.clientHeight + 50);
      }
    } catch (error) {
      console.error('Scroll calculation error:', error);
    }
  }, [setIsUserScrolling, responseStatus, isUserScrolling]);

  // Create throttled scroll handler - prevent excessive calculations
  const throttledHandleScroll = useMemo(
    () => throttle(handleScroll, 100, { leading: true, trailing: true }),
    [handleScroll]
  );
  
  // Clean up throttle on unmount
  useEffect(() => {
    return () => {
      throttledHandleScroll.cancel();
    };
  }, [throttledHandleScroll]);

  // Initialize scroll button state
  useEffect(() => {
    const checkInitialScrollState = () => {
      const chatElement = messageListRef.current;
      if (!chatElement) return;
      
      try {
        // Use setTimeout to ensure DOM has updated
        setTimeout(() => {
          if (!messageListRef.current) return;
          
          const isNearBottom = chatElement.scrollHeight - chatElement.scrollTop <= chatElement.clientHeight + 20;
          const shouldShowButton = !isNearBottom &&
            chatElement.scrollHeight > chatElement.clientHeight + 50 &&
            responseStatus !== 'pending';
            
          setStableShowScrollButton(shouldShowButton);
        }, 100);
      } catch (error) {
        console.error('Initial scroll check error:', error);
      }
    };
    
    requestAnimationFrame(checkInitialScrollState);
  }, [messageList, responseStatus]);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTo({
        top: messageListRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);

  // Memoized message list rendering to prevent unnecessary re-computations
  const renderedMessageList = useMemo(() => {
    return messageList.map((item, index) => {
      let showLine = false;
      if (index < messageList.length - 1 && item.role === 'assistant' && messageList[index + 1]?.role === 'assistant') {
        showLine = true;
      }
      if (index === messageList.length - 1 && item.role === 'assistant' && responseStatus === 'pending') {
        showLine = true;
      }
      return (
        <MessageItem
          key={item.id || index}
          isConsecutive={showLine}
          role={item.role as 'assistant' | 'user' | 'system'}
          item={item}
          index={index}
          retryMessage={retryMessage}
          deleteMessage={deleteMessage}
        />
      );
    });
  }, [messageList, responseStatus, retryMessage, deleteMessage]);

  // Navigate to new chat
  const handleNewChat = useCallback(() => {
    router.push('/chat');
  }, [router]);

  return (
    <>
      {contextHolder}
      <ChatHeader />
      <div className="relative flex flex-col grow">
        <ScrollToBottomButton
          visible={stableShowScrollButton}
          onClick={scrollToBottom}
        />
        <div
          onScroll={throttledHandleScroll}
          ref={messageListRef}
          className='flex w-full flex-col h-0 px-2 grow py-6 relative overflow-y-auto leading-7 chat-list text-sm scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-rounded-full scrollbar-thumb-gray-300 scrollbar-track-gray-100'
        >
          {!isPending && chat?.prompt && <PromptSection prompt={chat.prompt} />}

          {isPending ? <LoadingSkeleton /> : renderedMessageList}

          <ResponsingMessage
            searchStatus={searchStatus}
            responseStatus={responseStatus}
            responseMessage={responseMessage}
            currentProvider={currentModel.provider.id}
          />

          {responseStatus === 'done' && !isPending && <NewChatButton onClick={handleNewChat} />}
        </div>
      </div>
      
      <ChatProvider
        chat_id={props.chat_id}
        responseStatus={responseStatus}
        historyType={historyType}
        historyCount={historyCount}
        currentModel={currentModel}
        handleSubmit={handleSubmit}
        addBreak={addBreak}
        stopChat={stopChat}
        clearHistory={clearHistory}
      >
        <InputArea />
      </ChatProvider>
    </>
  );
}
