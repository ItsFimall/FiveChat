'use client';
import Image from 'next/image';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { BotType } from '@/app/db/schema';
import { getBotListInServer } from '@/app/admin/bot/action';
import { Button, Skeleton } from 'antd';
import { useTranslations } from 'next-intl';

const BotDiscover = () => {
  const t = useTranslations('Chat');
  const [botList, setBotList] = useState<BotType[]>([]);
  const [isPending, setIsPending] = useState(true);
  useEffect(() => {
    async function getBotsList() {
      const bots = await getBotListInServer()
      setBotList(bots.data as BotType[]);
      setIsPending(false);
    }
    getBotsList();
  }, []);

  return (
    <div className="container max-w-4xl mx-auto p-4">
      <div className='w-full flex flex-row justify-between items-center'>
        <h1 className='text-xl font-bold mb-4 mt-6'>智能体管理</h1>
        <Link href='/admin/bot/create'>
          <Button type="primary" icon={<PlusOutlined />} shape='round'>
            <div className='flex flex-row'>
              {t('createBot')}
            </div>
          </Button>
        </Link>
      </div>
      <div className='text-sm text-gray-500 mb-4'>
        <span>所有用户在
          <Button type="link" style={{padding:0}}>
            <Link href='/chat/bot/discover'>「发现智能体」</Link>
          </Button>
          页面都可以查看和使用以下的智能体。</span>
      </div>
      {isPending ?
        <div className="grid grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        :
        <div className="grid grid-cols-2 gap-4">
          {botList.map((item, index) => (
            <ServiceCard key={index} bot={item} />
          ))}
        </div>
      }
    </div>
  )
};

const SkeletonCard = () => {
  return (
    <div className="bg-white rounded-xl border-gray-200 border p-4 shadow-sm hover:shadow-md transition-shadow duration-200 w-full">
      <div className="flex items-start gap-4">
        <Skeleton.Avatar active size={48} style={{ borderRadius: 8 }} shape='square' />
        <div className="flex flex-col w-full">
          <Skeleton.Node active style={{ width: 160, height: 22 }} />
          <Skeleton.Node active style={{ width: '90%', height: 16, marginTop: 8 }} />
        </div>
      </div>
    </div>
  )
}
const ServiceCard = (props: { bot: BotType }) => {
  return (
    <div className="bg-white rounded-xl border-gray-200 border p-4 shadow-sm hover:shadow-md transition-shadow duration-200 w-full">
      <Link href={`/admin/bot/${props.bot.id}`}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg flex bg-slate-200 items-center justify-center  overflow-hidden flex-shrink-0">
            {props.bot.avatarType === 'emoji' && <span className="text-4xl">{props.bot.avatar}</span>}
            {props.bot.avatarType === 'url' &&
              <Image
                src={props.bot.avatar}
                alt={props.bot.title}
                width={52}
                height={52}
                className="w-full h-full object-cover"
                unoptimized
              />}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-gray-900 font-medium text-lg mb-1 truncate">
              {props.bot.title}
            </h3>
            <p className="text-gray-500 text-sm line-clamp-2">
              {props.bot.desc}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default BotDiscover;
