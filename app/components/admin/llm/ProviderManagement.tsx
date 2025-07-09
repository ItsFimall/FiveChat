'use client';
import React, { useState, useEffect, useRef } from 'react';
import { fetchAllLlmSettings, saveProviderOrder, deleteCustomProviderInServer, syncAndGroupModels } from '@/app/admin/llm/actions';
import { PlusCircleOutlined } from '@ant-design/icons';
import { Button, Skeleton, Typography, message } from "antd";
import Link from 'next/link';
import useModelListStore from '@/app/store/modelList';
import AddCustomProvider from '@/app/components/admin/llm/AddCustomProvider';
import Sortable from 'sortablejs';
import ProviderItem from '@/app/components/ProviderItem';
import clsx from 'clsx';

const { Title, Text } = Typography;

const ProviderManagement = () => {
  const [isPending, setIsPending] = useState(true);
  const [syncingProviderId, setSyncingProviderId] = useState<string | null>(null);
  const [isAddProviderModalOpen, setIsAddProviderModalOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const sortableRef = useRef<Sortable | null>(null);

  const { allProviderList, setAllProviderList, initAllProviderList, deleteCustomProvider } = useModelListStore();

  useEffect(() => {
    const fetchLlmList = async (): Promise<void> => {
      const result = await fetchAllLlmSettings();
      const processedList = result.map(item => ({
        id: item.provider,
        providerName: item.providerName,
        providerLogo: item.logo || '',
        apiStyle: item.apiStyle,
        type: item.type,
        status: item.isActive || false,
      }));
      initAllProviderList(processedList);
      setIsPending(false);
    };
    fetchLlmList();
  }, [initAllProviderList]);

  const handleDeleteProvider = async (providerId: string) => {
    try {
      await deleteCustomProviderInServer(providerId);
      deleteCustomProvider(providerId);
      message.success('删除成功');
    } catch (error) {
      console.error('Failed to delete provider:', error);
      message.error('删除失败');
    }
  };

  const handleSyncModels = async (providerId: string) => {
    setSyncingProviderId(providerId);
    try {
      const result = await syncAndGroupModels(providerId);
      if (result.success) {
        message.success(result.message || '同步成功');
      } else {
        message.error(result.message || '同步失败');
      }
    } catch (error) {
      console.error('Failed to sync models:', error);
      message.error('同步失败');
    } finally {
      setSyncingProviderId(null);
    }
  };

  useEffect(() => {
    if (listRef.current) {
      sortableRef.current = Sortable.create(listRef.current, {
        animation: 300,
        handle: '.handle',
        onEnd: async (evt) => {
          if (evt.oldIndex === undefined || evt.newIndex === undefined) return;
          const newOrderProviderList = [...allProviderList];
          const [movedItem] = newOrderProviderList.splice(evt.oldIndex, 1);
          newOrderProviderList.splice(evt.newIndex, 0, movedItem);
          setAllProviderList(newOrderProviderList);
          const newOrder = newOrderProviderList.map((item, index) => ({ providerId: item.id, order: index }));
          try {
            await saveProviderOrder(newOrder);
          } catch (error) {
            console.error('Failed to update order:', error);
          }
        },
      });
    }

    return () => {
      sortableRef.current?.destroy();
    };
  }, [allProviderList, setAllProviderList]);

  return (
    <div>
      <Title level={4}>提供商管理</Title>
      <Text type="secondary">在这里添加、查看和管理您的模型提供商。您可以拖动列表项进行排序。</Text>
      <div className='w-full mt-4'>
        {isPending ? (
          <>
            <Skeleton.Node active style={{ width: '100%', height: '3rem', marginTop: '0.5rem' }} />
            <Skeleton.Node active style={{ width: '100%', height: '3rem', marginTop: '0.5rem' }} />
            <Skeleton.Node active style={{ width: '100%', height: '3rem', marginTop: '0.5rem' }} />
          </>
        ) : (
          <div ref={listRef}>
            {allProviderList.map((i) => (
              <ProviderItem
                key={i.id}
                className='mt-2 handle'
                data={{
                  id: i.id,
                  providerName: i.providerName,
                  status: i.status,
                }}
                onDelete={handleDeleteProvider}
                onSync={handleSyncModels}
                isSyncing={syncingProviderId === i.id}
              />
            ))}
          </div>
        )}
        <div
          className="flex grow-0 mt-2 flex-row just items-center justify-center border h-12 text-sm px-2 hover:bg-gray-200 cursor-pointer rounded-md"
          onClick={() => setIsAddProviderModalOpen(true)}
        >
          <PlusCircleOutlined style={{ fontSize: '16px' }} />
          <span className='ml-2'>添加服务商</span>
        </div>
      </div>
      <AddCustomProvider
        isModalOpen={isAddProviderModalOpen}
        setIsModalOpen={setIsAddProviderModalOpen}
      />
    </div>
  );
};

export default ProviderManagement; 