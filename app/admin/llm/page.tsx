'use client';
import { Tabs } from 'antd';
import type { TabsProps } from 'antd';
import ProviderManagement from '@/app/components/admin/llm/ProviderManagement';
import UnifiedModelList from '@/app/components/admin/llm/UnifiedModelList';
import { useTranslations } from 'next-intl';

const LLMSettings = () => {
  const t = useTranslations('Admin.Models');

  const items: TabsProps['items'] = [
    {
      key: 'provider',
      label: t('providerManagement'),
      children: <ProviderManagement />,
    },
    {
      key: 'model',
      label: t('modelManagement'),
      children: <UnifiedModelList />,
    },
  ];

  return (
    <div className='container flex flex-col max-w-3xl h-full'>
      <Tabs defaultActiveKey="provider" items={items} />
    </div>
  )
}

export default LLMSettings;