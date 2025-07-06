'use client';
import React, { useEffect } from 'react';
import useModelListStore from '@/app/store/modelList';
import { fetchAvailableLlmModels } from '@/app/admin/llm/actions';
import ChatNaming from '@/app/components/admin/ChatNaming';
import { Button } from 'antd';
import ToggleSidebar from "@/app/images/hideSidebar.svg";
import useAdminSidebarCollapsed from '@/app/store/adminSidebarCollapsed';
import DefaultChatModel from '@/app/components/admin/DefaultChatModel';
import { useTranslations } from 'next-intl';

const Userpage = () => {
  const t = useTranslations('Admin.System');
  const { initModelList } = useModelListStore();
  const { isSidebarCollapsed, toggleSidebar } = useAdminSidebarCollapsed();
  useEffect(() => {
    const initializeModelList = async () => {
      try {
        const remoteModelList = await fetchAvailableLlmModels(false);
        initModelList(remoteModelList);
      } catch (error) {
        console.error("Error fetching model list:", error);
      }
    };
    initializeModelList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className='flex flex-col w-full items-center'>
      <div className='flex flex-row w-full items-center h-10 px-1'>
        {isSidebarCollapsed &&
          <Button
            icon={<ToggleSidebar style={{ 'color': '#999', 'fontSize': '20px', 'verticalAlign': 'middle' }} />}
            type='text'
            onClick={toggleSidebar}
          />
        }
      </div>
      <div className='container max-w-4xl mb-6 px-4 md:px-2 pb-8 h-auto'>
        <div className='h-4 w-full mb-10'>
          <h2 className="text-xl font-bold mb-4 mt-6">默认模型</h2>
        </div>
        <DefaultChatModel />
        <ChatNaming />
        <div className='h-6'></div>
      </div>
    </div>
  )
}

export default Userpage