import React, { useEffect, useState } from 'react'
import { Select, Avatar, message } from "antd";
import useModelListStore from '@/app/store/modelList';
import { adminAndSetAppSettings, fetchAppSettings } from '@/app/admin/system/actions';
import Spark from "@/app/images/spark.svg";

const DefaultChatModel = () => {
  const { modelList, setCurrentModelExact, providerList } = useModelListStore();
  const [modelSelectValue, setModelSelectValue] = useState('lastSelected');

  useEffect(() => {
    const fetchSettings = async () => {
      const resultValue = await fetchAppSettings('defaultChatModel');
      if (!resultValue) {
        setModelSelectValue('lastSelected');
      } else if (resultValue === 'lastSelected') {
        setModelSelectValue('lastSelected');
      } else {
        setModelSelectValue(resultValue);
        const [providerId, modelId] = resultValue.split('|');
        setCurrentModelExact(providerId, modelId);
      }
    }
    fetchSettings();
  }, [setCurrentModelExact]);

  const handleChangeModel = (value: string) => {
    setModelSelectValue(value);
    const [providerId, modelId] = value.split('|');
    setCurrentModelExact(providerId, modelId);
    adminAndSetAppSettings('defaultChatModel', value);
    message.success('保存成功');
  };
  const options = providerList.map((provider) => {
    return {
      label: <span>{provider.providerName}</span>,
      title: provider.providerName,
      options: modelList.filter((model) => model.provider.id === provider.id && model.selected).map((model) => ({
        label: (<div className='flex flex-row items-center'>
          {provider?.providerLogo ?
            <Avatar
              size={20}
              src={provider.providerLogo}
            />
            :
            <Avatar
              size={20}
              style={{ backgroundColor: '#1c78fa' }}
            >{provider.providerName.charAt(0)}</Avatar>
          }

          <span className='ml-1'>{model.displayName}</span>
        </div>),
        value: `${model.provider.id}|${model.id}`,
      }))
    }
  });

  return (

    <div className='flex flex-row justify-between mt-6 p-6 border border-gray-200 rounded-md'>
      <div className='flex flex-col '>
        <span className='text-sm'>对话默认模型</span>
        <span className='text-gray-400 text-xs'>新建对话时默认使用的模型，如果用户没有权限，自动使用上一次对话使用的模型</span>
      </div>
      <div className='flex items-center'>
        <Select
          value={modelSelectValue}
          onChange={handleChangeModel}
          style={{ width: 230 }}
          listHeight={320}
          options={[{
            label: '其他',
            title: '其他',
            options: [{
              label: <div className='flex flex-row items-center'>
                <Spark width={22} height={22} style={{ 'color': '#666' }} />
                <span className='ml-1'>用户上次对话使用的模型</span>
              </div>,
              value: 'lastSelected'
            }
            ]
          }, ...options]}
        />
      </div>
    </div>
  )
}

export default DefaultChatModel