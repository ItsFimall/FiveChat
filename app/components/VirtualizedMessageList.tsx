'use client'
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import MessageItem from '@/app/components/MessageItem';
import ResponsingMessage from '@/app/components/ResponsingMessage';
import { MessageType } from '@/types/llm';

interface VirtualizedMessageListProps {
  messageList: MessageType[];
  responseMessage: any;
  responseStatus: string;
  onDeleteMessage: (messageId: number) => void;
  onRetryMessage: (messageId: number) => void;
  onAddBreak: (messageId: number) => void;
}

const ITEM_HEIGHT = 120; // 估计的消息项高度

const VirtualizedMessageList: React.FC<VirtualizedMessageListProps> = ({
  messageList,
  responseMessage,
  responseStatus,
  onDeleteMessage,
  onRetryMessage,
  onAddBreak,
}) => {
  const listRef = useRef<List>(null);
  const [containerHeight, setContainerHeight] = useState(600);
  const containerRef = useRef<HTMLDivElement>(null);

  // 监听容器大小变化
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    if (listRef.current && messageList.length > 0) {
      listRef.current.scrollToItem(messageList.length - 1, 'end');
    }
  }, [messageList.length, responseMessage.content]);

  // 渲染单个消息项
  const renderItem = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const message = messageList[index];
    
    return (
      <div style={style}>
        <MessageItem
          key={message.id}
          item={message}
          onDelete={() => onDeleteMessage(message.id)}
          onRetry={() => onRetryMessage(message.id)}
          onAddBreak={() => onAddBreak(message.id)}
        />
      </div>
    );
  }, [messageList, onDeleteMessage, onRetryMessage, onAddBreak]);

  // 计算总项目数（包括响应消息）
  const itemCount = useMemo(() => {
    return messageList.length + (responseStatus === 'pending' ? 1 : 0);
  }, [messageList.length, responseStatus]);

  // 渲染项目（消息或响应）
  const renderItemWithResponse = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    if (index < messageList.length) {
      return renderItem({ index, style });
    } else if (responseStatus === 'pending') {
      return (
        <div style={style}>
          <ResponsingMessage responseMessage={responseMessage} />
        </div>
      );
    }
    return null;
  }, [messageList.length, responseStatus, renderItem, responseMessage]);

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden">
      <List
        ref={listRef}
        height={containerHeight}
        itemCount={itemCount}
        itemSize={ITEM_HEIGHT}
        overscanCount={5} // 预渲染5个项目以提升滚动性能
      >
        {renderItemWithResponse}
      </List>
    </div>
  );
};

export default React.memo(VirtualizedMessageList);
