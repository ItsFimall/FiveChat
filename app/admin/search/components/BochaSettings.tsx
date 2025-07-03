'use client';
import React, { useState } from 'react';
import { Button, Input, message } from 'antd';
import Link from 'next/link';
import { checkSearch } from '@/app/admin/search/actions';
import { useTranslations } from 'next-intl';

interface BochaSettingsProps {
  apiKey: string | null;
  onApiKeyChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onApiKeyBlur: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const JinaSettings: React.FC<BochaSettingsProps> = ({
  apiKey,
  onApiKeyChange,
  onApiKeyBlur,
}) => {
  const t = useTranslations('Admin.Search');
  const [isChecking, setIsChecking] = useState(false);
  const check = async () => {
    setIsChecking(true);
    const webSearchResult = await checkSearch('bocha', apiKey as string);
    setIsChecking(false);
    if (webSearchResult.valid) {
      message.success('校验成功');
    } else {
      message.error(webSearchResult.message);
    }
  }
  return (
    <div className='flex flex-col items-start mt-6 p-6 border border-gray-200 rounded-md'>
      <div className='flex flex-row text-base font-medium border-b items-center w-full mb-4 pb-2'>
        <h3>博查</h3>
      </div>
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
      <Link href="https://open.bochaai.com/?utm_source=hivechat" target='_blank'>
        <Button type='link' size='small' style={{ padding: 0 }}>{t('getApikey')}</Button>
      </Link>
    </div>
  );
};

export default JinaSettings; 