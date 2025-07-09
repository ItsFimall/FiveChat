import React from 'react'
import { Avatar, Button, Popconfirm } from "antd";
import useModelListStore from '@/app/store/modelList';
import { DeleteOutlined, SyncOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

const ProviderItem = (props: {
  className?: string,
  data: {
    id: string;
    providerName: string;
    status?: boolean;
  },
  onDelete?: (id: string) => void,
  onSync?: (id: string) => void,
  isSyncing?: boolean,
}) => {
  const t = useTranslations('Admin.Models');
  const { allProviderListByKey } = useModelListStore();

  const handleDelete = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    props.onDelete?.(props.data.id);
  };

  const handleSync = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    props.onSync?.(props.data.id);
  };

  return (
    <div className={`group flex flex-row items-center h-12 px-2 justify-between hover:bg-gray-200 cursor-pointer rounded-md ${props.className || ''}`}>
      <Link href={`/admin/llm/${props.data.id}`} className='flex-grow flex flex-row items-center h-full'>
        {allProviderListByKey && allProviderListByKey[props.data.id]?.providerLogo ?
          <Avatar
            style={{ border: '1px solid #ddd', padding: '0.2rem' }}
            src={allProviderListByKey[props.data.id].providerLogo}
          />
          :
          <Avatar
            style={{ backgroundColor: '#1c78fa' }}
          >{allProviderListByKey && allProviderListByKey[props.data.id].providerName.charAt(0)}</Avatar>
        }
        <span className='ml-2'>{props.data?.providerName}</span>
      </Link>
      <div className='flex items-center opacity-0 group-hover:opacity-100 transition-opacity'>
        {
          props.onSync && (
            <Button
              icon={<SyncOutlined spin={props.isSyncing} />}
              type='text'
              onClick={handleSync}
              disabled={props.isSyncing}
            />
          )
        }
        {
          props.onDelete && (
            <div>
              <Popconfirm
                title={t('deleteProviderTitle')}
                description={t('deleteProviderDesc')}
                onConfirm={handleDelete}
                okText={t('confirm')}
                cancelText={t('cancel')}
              >
                <Button
                  icon={<DeleteOutlined />}
                  type='text'
                  danger
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                />
              </Popconfirm>
            </div>
          )
        }
      </div>
      <div className='flex items-center'>
        {
          props.data?.status ?
            <div className='w-2 h-2 bg-green-500 rounded m-2'></div>
            :
            <div className='w-2 h-2 bg-gray-400 rounded m-2'></div>
        }
      </div>
    </div>
  )
}

export default ProviderItem;