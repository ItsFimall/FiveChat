'use client';
import React, { useState } from 'react';
import { Button, Input, message } from 'antd';
import Link from 'next/link';
import TavilySearch from '@/app/images/tavily.svg';
import { checkSearch } from '@/app/admin/search/actions';
import { useTranslations } from 'next-intl';

interface TavilySettingsProps {
  apiKey: string | null;
  onApiKeyChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onApiKeyBlur: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const TavilySettings: React.FC<TavilySettingsProps> = ({
  apiKey,
  onApiKeyChange,
  onApiKeyBlur,
}) => {
  const t = useTranslations('Admin.Search');
  const [isChecking, setIsChecking] = useState(false);
  const check = async () => {
    setIsChecking(true);
    const webSearchResult = await checkSearch('tavily', apiKey as string);
    setIsChecking(false);
    if (webSearchResult.valid) {
      message.success('校验成功');
    } else {
      message.error(webSearchResult.message);
    }
  }
  return (
    <div className='flex flex-col items-start mt-6 p-6 border border-gray-200 rounded-md'>
      <h3 className='text-base font-medium border-b w-full mb-4 pb-2'>
        <TavilySearch height={32} width={64} />
      </h3>
      <span className='text-sm font-medium'>{t('apikey')}</span>
      <div className='flex items-center my-2 w-full'>
        <Input
          name='apikey'
          value={apiKey || ''}
          onChange={onApiKeyChange}
          onBlur={onApiKeyBlur}
          placeholder={t('apikeyRequiredNotice')}
        />
        <Button
          className='ml-2 w-24'
          loading={isChecking}
          onClick={() => { check() }}
        >{t('check')}</Button>
      </div>
      <Link href="https://app.tavily.com/home" target='_blank'>
        <Button type='link' size='small' style={{ padding: 0 }}>{t('getApikey')}</Button>
      </Link>
    </div>
  );
};

export default TavilySettings; 