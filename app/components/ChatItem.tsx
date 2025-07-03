import React, { ReactNode } from 'react';
import clsx from 'clsx';
import { ChatType } from '@/types/llm';
import type { MenuProps } from 'antd';
import { Dropdown, message } from 'antd';
import { More } from '@icon-park/react';

interface ChatItemProps {
  chat: ChatType;
  isActive: boolean;
  isHighlighted: boolean;
  onOpenChange: (isOpen: boolean, chatId: string) => void;
  onAction: (action: string, chatId: string) => void;
  menuItems: MenuProps['items'];
  className?: string;
  children: ReactNode;
}

const ChatItem = ({ 
  chat, 
  isActive, 
  isHighlighted, 
  onOpenChange, 
  onAction,
  menuItems,
  className,
  children
}: ChatItemProps) => {
  return (
    <li
      style={{ fontSize: '13px' }}
      className={clsx(
        { "bg-white hover:bg-white font-medium text-gray-800": isActive }, 
        { "bg-gray-200": isHighlighted }, 
        "pr-2 py-1.5 rounded-xl text-gray-500 relative group mt-1 hover:bg-gray-200",
        className
      )}>
      <div className="flex items-center justify-between w-full grow">
        {children}
        <Dropdown
          menu={{
            items: menuItems,
            onClick: (e) => {
              e.domEvent.preventDefault();
              onAction(e.key, chat.id);
            }
          }}
          onOpenChange={(isOpen) => onOpenChange(isOpen, chat.id)}
          trigger={['click']}>
          <div onClick={(e) => e.preventDefault()} className={clsx({ 'bg-gray-100': isHighlighted }, 'rounded hover:bg-gray-100')} >
            <More
              theme="outline"
              size="20"
              className={clsx({ "visible": isHighlighted, "invisible": !isHighlighted }, 'h-5 w-5 group-hover:visible hover:bg-gray-100')}
              fill="#9ca3af"
              strokeWidth={2} />
          </div>
        </Dropdown>
      </div>
    </li>
  );
};

export default ChatItem;