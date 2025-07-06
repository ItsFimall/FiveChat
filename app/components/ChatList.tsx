import React, { useState, useEffect, useMemo } from 'react';
import Image from "next/image";
import Link from 'next/link';
import clsx from 'clsx';
import { Modal, Input, Skeleton } from 'antd';
import { ChatType } from '@/types/llm';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import { message } from 'antd';
import ChatItem from './ChatItem';
import MessageIcon from "@/app/images/message.svg";
import TopIcon from "@/app/images/top.svg";
import CancelTopIcon from "@/app/images/cancelTop.svg";
import DeleteIcon from "@/app/images/delete.svg";
import ThumbtackIcon from "@/app/images/thumbtack.svg";
import PlusIcon from "@/app/images/plus.svg";
import Spark from "@/app/images/spark.svg";
import useChatListStore from '@/app/store/chatList';
import MenuSection from '@/app/components/SidebarMenuSection';
import { getChatListInServer, deleteChatInServer, updateChatInServer } from '@/app/chat/actions/chat';
import { useTranslations } from 'next-intl';
import useChatStore from '@/app/store/chat';
import { useSession } from 'next-auth/react';

const ChatList = () => {
  const t = useTranslations('Chat');
  const pathname = usePathname();
  const router = useRouter();
  const currentChatId = pathname.split("/").pop() || '';
  const [highlightedChat, setHighlightedChat] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const [renameChatId, setRenameChatId] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [chatListStatus, setChatListStatus] = useState('init');

  const { chatList, setChatList, updateChat, setNewTitle } = useChatListStore();
  const { chat, setChat } = useChatStore();
  const { status } = useSession();

  const { top8ChatsWithoutBot, isOver8, botChats } = useMemo(() => {
    const nonBotChats = chatList.filter(chat => !chat.isWithBot);
    const top8 = nonBotChats.slice(0, 8);
    const isOver = nonBotChats.length > 8;

    const sortedBotChats = chatList
      .filter(chat => chat.isWithBot)
      .sort((a, b) => {
        if (a?.isStar && a.starAt && b?.isStar && b.starAt) {
          return new Date(b.starAt).getTime() - new Date(a.starAt).getTime();
        }
        if (a?.isStar && !b?.isStar) {
          return -1;
        }
        if (!a?.isStar && b?.isStar) {
          return 1;
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    return {
      top8ChatsWithoutBot: top8,
      isOver8: isOver,
      botChats: sortedBotChats
    };
  }, [chatList]);

  useEffect(() => {
    const fetchAllChats = async () => {
      try {
        const result = await getChatListInServer();
        if (result.status === 'success') {
          setChatList(result.data as ChatType[]);
        } else {
          setChatList([]);
        }
      } catch (error) {
        console.error("Failed to fetch chats:", error);
        message.error(t('fetchFailed'));
      } finally {
        setChatListStatus('done');
      }
    };
    fetchAllChats();
  }, [status, setChatList, t]);

  const handleOpenChange = (isOpen: boolean, chatId: string) => {
    setHighlightedChat(isOpen ? chatId : '');
  };

  const deleteChat = async (chat_id: string) => {
    try {
      const result = await deleteChatInServer(chat_id);
      if (result.status === 'success') {
        message.success(t('deleteSuccess'));
        const chatListresult = await getChatListInServer();
        setChatList(chatListresult.data as ChatType[]);

        if (currentChatId === chat_id) {
          if (chatListresult.data && chatListresult.data?.length > 0) {
            router.push(`/chat/${chatListresult.data[0]['id']}`)
          } else {
            router.push(`/chat/`)
          }
        }
      } else {
        message.error(t('deleteFail'));
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
      message.error(t('deleteFail'));
    }
  };

  const toggleStar = async (chat_id: string, is_star: boolean) => {
    try {
      await updateChatInServer(chat_id, { isStar: is_star, starAt: new Date() })
      if (currentChatId === chat_id && chat) {
        setChat({ ...chat, isStar: !Boolean(chat.isStar), starAt: new Date() });
      }
      updateChat(chat_id, { isStar: is_star, starAt: new Date() });
    } catch (error) {
      console.error("Failed to toggle star:", error);
      message.error(t('updateFailed'));
    }
  }

  const handleChatAction = (action: string, chatId: string) => {
    if (action === 'delete') {
      deleteChat(chatId);
    } else if (action === 'edit') {
      const chat = chatList.find(c => c.id === chatId);
      setNewChatName(chat?.title || '');
      setRenameChatId(chatId);
      setIsEditModalOpen(true);
    } else if (action === 'top') {
      const chat = chatList.find(c => c.id === chatId);
      toggleStar(chatId, !chat?.isStar);
    }
  };

  const handleSaveTitle = () => {
    if (newChatName.trim()) {
      setNewTitle(renameChatId, newChatName);
      setIsEditModalOpen(false);
    }
  };

  // 常规聊天的菜单项
  const getStandardMenuItems = (isStar: boolean): MenuProps['items'] => {
    return [
      {
        label: t('rename'),
        icon: <EditOutlined />,
        key: 'edit',
      },
      {
        type: 'divider',
      },
      {
        label: t('delete'),
        key: 'delete',
        icon: <DeleteOutlined />,
      },
    ];
  };

  // 机器人聊天的菜单项
  const getBotActionItems = (isTop: boolean): MenuProps['items'] => {
    return [
      {
        label: isTop ? t('unPin') : t('pin'),
        icon: isTop ? <CancelTopIcon width={18} height={18} /> : <TopIcon width={20} height={20} />,
        key: 'top',
      },
      {
        type: 'divider',
      },
      {
        label: t('delete'),
        key: 'delete',
        icon: <DeleteIcon width={20} height={20} />,
      },
    ];
  };

  return (
    <>
      <div className="flex flex-col box-border pt-2 pl-0 pr-4">
        <Link href='/chat'>
          <div className="w-full border rounded-xl text-center p-2 text-sm new-chat-button whitespace-nowrap">
            <PlusOutlined className='mr-2' style={{ color: '#0057ff' }} />{t('newChat')}
          </div>
        </Link>
      </div>

      <div className="flex flex-col flex-grow rounded-xl h-0  mt-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {/* 最近聊天部分 */}
        <MenuSection
          title={t('recentChat')}
          icon={<MessageIcon width='20' height='20' />}
          defaultExpanded={true}>

          {chatListStatus !== 'done' ? (
            <div className='pl-8 py-4 pr-6'>
              <Skeleton title={false} paragraph={{ rows: 6, width: ['60%', '70%', '70%', '60%', '70%', '70%'] }} active />
            </div>
          ) : (
            <>
              {top8ChatsWithoutBot.length === 0 && (
                <div className='flex flex-col'>
                  <span className='my-2 text-xs text-gray-400 ml-8'>{t('historyNotice')}</span>
                </div>
              )}

              <ul className="pr-4">
                {top8ChatsWithoutBot.map((chat) => (
                  <Link key={chat.id} href={`/chat/${chat.id}`}>
                    <ChatItem
                      chat={chat}
                      isActive={chat.id === currentChatId}
                      isHighlighted={highlightedChat === chat.id}
                      onOpenChange={handleOpenChange}
                      onAction={handleChatAction}
                      menuItems={getStandardMenuItems(Boolean(chat.isStar))}
                      className="ml-5 pl-3"
                    >
                      <div className="whitespace-nowrap w-0 grow overflow-hidden text-ellipsis">
                        {chat.title}
                      </div>
                    </ChatItem>
                  </Link>
                ))}

                {isOver8 && (
                  <Link href='/chat/thread/list'>
                    <li
                      style={{ fontSize: '13px' }}
                      className={clsx(
                        { "bg-white hover:bg-white font-medium text-gray-800": '/chat/thread/list' === pathname },
                        "pr-2 ml-5 pl-3 py-1.5 rounded-xl text-gray-500 relative group mt-1 hover:bg-gray-200"
                      )}>
                      <div className="flex items-center justify-between w-full grow">
                        <div className="whitespace-nowrap w-0 grow overflow-hidden text-ellipsis">
                          {t('viewAll')}...
                        </div>
                      </div>
                    </li>
                  </Link>
                )}
              </ul>
            </>
          )}
        </MenuSection>

        <MenuSection
          title={t('myBots')}
          icon={<Spark width={20} height={20} alt='spark' />}
          defaultExpanded={false}
        >
          <ul className="pr-4">
            <Link href={`/chat/bot/discover`}>
              <li
                style={{ fontSize: '13px' }}
                className={clsx(
                  { 'bg-white font-medium text-gray-800': pathname === '/bot/discover' },
                  "pr-2 ml-0 pl-2 py-2 rounded-xl text-gray-500 relative group mt-1 hover:bg-gray-200"
                )}>
                <div className="flex items-center justify-between w-full grow">
                  <div style={{ width: '20px', height: '20px' }} className="flex items-center justify-center">
                    <PlusIcon width={18} height={18} alt='add' />
                  </div>
                  <div className="ml-1 whitespace-nowrap w-0 grow overflow-hidden text-ellipsis">
                    {t('discoverBots')}
                  </div>
                </div>
              </li>
            </Link>

            {botChats.map((chat) => (
              <Link key={chat.id} href={`/chat/${chat.id}`}>
                <ChatItem
                  chat={chat}
                  isActive={chat.id === currentChatId}
                  isHighlighted={highlightedChat === chat.id}
                  onOpenChange={handleOpenChange}
                  onAction={handleChatAction}
                  menuItems={getBotActionItems(Boolean(chat.isStar))}
                  className="ml-0 pl-2"
                >
                  <div style={{ width: '22px', height: '22px' }} className="flex items-center justify-center bg-slate-200 rounded-full">
                    {chat.avatarType === 'emoji' && (
                      <span className='text-base'>{chat.avatar}</span>
                    )}
                    {chat.avatarType === 'url' && (
                      <Image
                        src={chat.avatar as string}
                        unoptimized
                        className='rounded-full'
                        width={20}
                        height={20}
                        alt='chat bot'
                      />
                    )}
                  </div>
                  <div className="ml-1 flex flex-row whitespace-nowrap w-0 grow">
                    <span className='text-ellipsis overflow-hidden'>{chat.title}</span>
                    {chat?.isStar && <ThumbtackIcon className='ml-2' width={16} height={16} alt='thumbtack' />}
                  </div>
                </ChatItem>
              </Link>
            ))}
          </ul>
        </MenuSection>
      </div>

      {/* 编辑聊天名称的弹窗 */}
      <Modal
        title={t('editChatName')}
        open={isEditModalOpen}
        onOk={handleSaveTitle}
        onCancel={() => setIsEditModalOpen(false)}
        cancelText={t('cancel')}
        okText={t('save')}
      >
        <Input
          value={newChatName}
          onChange={(e) => setNewChatName(e.target.value)}
          placeholder={t('chatNameplaceholder')}
          style={{ marginTop: '1em', marginBottom: '1em' }}
        />
      </Modal>
    </>
  );
};

export default ChatList;