'use client'
import React from 'react';
import { useTranslations } from 'next-intl';
import NewChatIcon from '@/app/images/newChat.svg';

const NewChatButton = React.memo(({ onClick }: { onClick: () => void }) => {
  const t = useTranslations('Chat');
  
  return (
    <div className='md:hidden flex justify-center items-center mt-2'>
      <div
        onClick={onClick}
        className='flex flex-row px-3 py-2 items-center cursor-pointer justify-center border border-gray-300 text-gray-500 text-xs rounded-2xl hover:bg-gray-100 transition-colors duration-200'
      >
        <NewChatIcon />
        <span className='ml-1'>{t('startNewChat')}</span>
      </div>
    </div>
  );
});

NewChatButton.displayName = 'NewChatButton';

export default NewChatButton; 