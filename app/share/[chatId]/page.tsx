import React from 'react';
import { db } from '@/app/db';
import { chats }s from '@/app/db/schema';
import { eq, and, or, isNull, gt } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import { Result } from 'antd';
import ShareChatClient from './ShareChatClient';

const SharedChatPage = async ({ params }: { params: { chatId: string } }) => {
  const t = await getTranslations('Chat');
  const { chatId } = params;

  if (!chatId) {
    return <Result status="404" title="Not Found" subTitle={t('shareNotExist')} />;
  }

  const chat = await db.query.chats.findFirst({
    where: and(
      eq(chats.id, chatId),
      eq(chats.isShared, true),
      or(isNull(chats.shareExpiresAt), gt(chats.shareExpiresAt, new Date()))
    ),
    columns: {
      title: true,
      sharePassword: true,
    },
  });

  if (!chat) {
    return <Result status="404" title={t('shareNotExist')} />;
  }

  const hasPassword = !!chat.sharePassword;

  return (
    <ShareChatClient
      chatId={chatId}
      chatTitle={chat.title}
      hasPassword={hasPassword}
    />
  );
};

export default SharedChatPage; 