"use client";
import React, { useEffect, useState } from 'react'
import useChatListStore from '@/app/store/chatList';
import { useRouter } from 'next/navigation';
import { Alert } from 'antd';
import useModelListStore from '@/app/store/modelList';
import ChatHeader from '@/app/components/ChatHeader';
import { MessageContent, ChatType } from '@/types/llm';
import AdaptiveTextarea from '@/app/components/AdaptiveTextarea';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { useLoginModal } from '@/app/contexts/loginModalContext';
import { addChatInServer } from '@/app/chat/actions/chat';
import { addMessageInServer } from '@/app/chat/actions/message';
import { fetchAppSettings } from '@/app/chat/actions/chat';
import useChatStore from '@/app/store/chat';

const Home = () => {
  const t = useTranslations('Chat');
  const router = useRouter();
  const { status } = useSession();
  const { visible, showLogin, hideLogin } = useLoginModal();
  const { setWebSearchEnabled } = useChatStore();
  const { modelList, currentModel, setCurrentModelExact, isPending } = useModelListStore();
  const { chatList, setChatList } = useChatListStore();
  const [greetingText, setGreetingText] = useState('');
  const [showGuideAlert, setShowGuideAlert] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      showLogin();
    }
  }, [status, showLogin]);

  useEffect(() => {
    if (!isPending && modelList.length === 0 && status === 'authenticated') {
      setShowGuideAlert(true);
    } else {
      setShowGuideAlert(false);
    }
  }, [isPending, modelList, status]);

  useEffect(() => {
    const fetchDefaultChatModel = async () => {
      const resultValue = await fetchAppSettings('defaultChatModel');

      if (resultValue && resultValue !== 'lastSelected') {
        const [providerId, modelId] = resultValue.split('|');
        // 检查获取的模型是否在当前可用的模型列表中
        const modelExists = modelList.some(model =>
          model.id === modelId && model.provider.id === providerId
        );

        if (modelExists) {
          setCurrentModelExact(providerId, modelId);
          return;
        }
      }

      const lastSelectedModel = localStorage.getItem('lastSelectedModel');
      if (lastSelectedModel) {
        const [providerId, modelId] = lastSelectedModel.split('|');
        const matchedModel = modelList.find(model =>
          model.id === modelId && model.provider.id === providerId
        );
        if (matchedModel) {
          setCurrentModelExact(providerId, modelId);
        } else {
          setCurrentModelExact(modelList[0].provider.id, modelList[0].id);
        }
      } else {
        setCurrentModelExact(modelList[0].provider.id, modelList[0].id);
      }
    }
    if (modelList.length > 0) {
      fetchDefaultChatModel();
    }
  }, [setCurrentModelExact, modelList]);

  useEffect(() => {
    function getGreeting(): string {
      const currentHour = new Date().getHours();
      if (currentHour >= 5 && currentHour < 12) {
        return "goodMorning";
      } else if (currentHour >= 12 && currentHour < 14) {
        return "goodAfternoon";
      } else if (currentHour >= 14 && currentHour < 18) {
        return "goodEvening";
      } else {
        return "goodNight";
      }
    }
    setGreetingText(t(getGreeting()));
    setWebSearchEnabled(false)
  }, [t, setWebSearchEnabled]);

  const newChat = async (
    text: string,
    attachments?: Array<{ mimeType: string; data: string }>,
    searchEnabled?: boolean,
  ) => {
    let content: MessageContent;
    if (attachments && attachments?.length > 0) {
      const attachmentsMessages = attachments.map((attachment) => {
        return {
          "type": "image" as "image",
          "mimeType": attachment.mimeType,
          "data": attachment.data,
        };
      });
      content = [
        {
          "type": "text",
          "text": text
        },
        ...attachmentsMessages
      ]
    } else {
      content = text;
    }

    const result = await addChatInServer({
      title: t('defaultChatName'),
      defaultModel: currentModel.id,
      searchEnabled: searchEnabled,
      defaultProvider: currentModel.provider.id,
    });
    if (result.status === 'success') {
      const initInfo = {
        id: result.data?.id,
        title: t('defaultChatName'),
        defaultModel: 'gpt',
        searchEnabled: searchEnabled,
        createdAt: new Date(),
      };
      setChatList([initInfo as ChatType, ...chatList]);
      const toAddMessage = {
        chatId: result.data?.id!,
        content: content,
        role: 'user',
        type: 'text' as const,
        model: currentModel.id,
        searchEnabled: searchEnabled,
        providerId: currentModel.provider.id,
        createdAt: new Date(),
      };
      await addMessageInServer(toAddMessage);
      router.push(`/chat/${result.data?.id}?f=home`);
    }
  };

  return (
    <>
      <ChatHeader isActionsHidden={true} />
      {showGuideAlert &&
        <div className='m-6'>
          <Alert message={t('guideAlertText')}
            type='warning'
            showIcon={true}
          />
        </div>
      }
      <div className='flex w-full grow flex-col items-center justify-center h-full'>
        <div className='container max-w-3xl mx-auto -mt-16 relative items-center justify-center'>
          <h2 className='text-2xl font-bold text-center mb-8'>{greetingText && <>👋 {greetingText}{t('welcomeNotice')}</>}&nbsp;</h2>
          <AdaptiveTextarea model={currentModel} submit={newChat} />
        </div>
      </div>
    </>
  )
}

export default Home