'use client';
import React, { useState, useEffect, useRef } from 'react'
import { fetchAllLlmSettings, saveProviderOrder } from '@/app/admin/llm/actions';
import { PlusCircleOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import { Button, Skeleton } from "antd";
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import ToggleSidebar from "@/app/images/hideSidebar.svg";
import useAdminSidebarCollapsed from '@/app/store/adminSidebarCollapsed';
import ProviderItem from '@/app/components/ProviderItem';
import Link from 'next/link';
import useModelListStore from '@/app/store/modelList';
import AddCustomProvider from '@/app/components/admin/llm/AddCustomProvider';
import Sortable from 'sortablejs';

export default function LLMLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {

  const t = useTranslations('Admin.Models');
  const [isPending, setIsPending] = useState(true);
  const [isAddProviderModalOpen, setIsAddProviderModalOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const sortableRef = useRef<Sortable | null>(null);

  const pathname = usePathname();
  const providerId = pathname.split("/").pop() || '';
  const { allProviderList, setAllProviderList, initAllProviderList } = useModelListStore();
  const { isSidebarCollapsed, toggleSidebar } = useAdminSidebarCollapsed();
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

      initAllProviderList(processedList)
      setIsPending(false);
    };
    fetchLlmList();
  }, [initAllProviderList]);

  useEffect(() => {
    if (listRef.current) {
      sortableRef.current = Sortable.create(listRef.current, {
        animation: 300,
        handle: '.handle',
        onStart: (evt) => {
        },
        onEnd: async (evt) => {
          const newOrderProviderList = [...allProviderList];
          const [movedItem] = newOrderProviderList.splice(evt.oldIndex!, 1);
          newOrderProviderList.splice(evt.newIndex!, 0, movedItem);
          setAllProviderList(newOrderProviderList)
          const newOrder = newOrderProviderList.map((item, index) => ({ providerId: item.id, order: index }));
          try {
            saveProviderOrder(newOrder)
          } catch (error) {
            console.error('Failed to update order:', error);
          }
        },
      });
    }

    return () => {
      if (sortableRef.current) {
        sortableRef.current.destroy();
      }
    };
  }, [allProviderList, setAllProviderList]);

  return (
    <div className='flex flex-col w-full'>
      {isSidebarCollapsed &&
        <div className='flex flex-row w-full items-center h-12 border-b border-slate-100 px-2 fixed z-50 py-2 bg-slate-50'>
          <Button
            icon={<ToggleSidebar style={{ 'color': '#999', 'fontSize': '20px', 'verticalAlign': 'middle' }} />}
            type='text'
            onClick={toggleSidebar}
          />
        </div>}
      <div className='w-full flex flex-row' >
        <div className='w-72 bg-slate-50 p-4 pt-2 border-l h-dvh overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent'>
          {isPending ? <>
            <Skeleton.Node active style={{ width: 250, height: '3rem', marginTop: '0.5rem' }} />
            <Skeleton.Node active style={{ width: 250, height: '3rem', marginTop: '0.5rem' }} />
            <Skeleton.Node active style={{ width: 250, height: '3rem', marginTop: '0.5rem' }} />
            <Skeleton.Node active style={{ width: 250, height: '3rem', marginTop: '0.5rem' }} />
            <Skeleton.Node active style={{ width: 250, height: '3rem', marginTop: '0.5rem' }} />
            <Skeleton.Node active style={{ width: 250, height: '3rem', marginTop: '0.5rem' }} />
            <Skeleton.Node active style={{ width: 250, height: '3rem', marginTop: '0.5rem' }} />
            <Skeleton.Node active style={{ width: 250, height: '3rem', marginTop: '0.5rem' }} />
          </>
            :
            <div ref={listRef} className={clsx({ 'mt-12': isSidebarCollapsed })} >
              {
                allProviderList.map((i) => (
                  <Link key={i.id} className='handle relative' href={`/admin/llm/${i.id}`}>
                    <ProviderItem
                      className={clsx('mt-2', { 'bg-gray-200': providerId === i.id })}
                      data={{
                        id: i.id,
                        providerName: i.providerName,
                        status: i.status,
                      }}
                    />
                  </Link>
                ))
              }
            </div>
          }
          <div className="flex grow-0 mt-2 flex-row just items-center justify-center border h-10 text-sm px-2 hover:bg-gray-200 cursor-pointer rounded-md"
            onClick={() => {
              setIsAddProviderModalOpen(true)
            }}
          >
            <PlusCircleOutlined style={{ 'fontSize': '14px' }} />
            <span className='ml-2'>添加服务商</span>
          </div>
        </div>
        <div className='w-0 grow overflow-y-auto'>
          {
            isPending ? <>Loading</>
              :
              <div className={clsx('container mx-auto max-w-2xl p-6 h-dvh', { 'pt-12': isSidebarCollapsed })}>
                {children}
              </div>
          }

        </div>
        <AddCustomProvider
          isModalOpen={isAddProviderModalOpen}
          setIsModalOpen={setIsAddProviderModalOpen}
        />
      </div>
    </div>
  )
}