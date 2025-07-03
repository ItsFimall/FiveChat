import React, { useEffect } from 'react'
import { Select, Avatar, message } from "antd";
import { StopOutlined } from '@ant-design/icons';
import useModelListStore from '@/app/store/modelList';
import { adminAndSetAppSettings, fetchAppSettings } from '@/app/admin/system/actions';
import useGlobalConfigStore from '@/app/store/globalConfig';
import Spark from "@/app/images/spark.svg";

const ChatNaming = () => {
  const { chatNamingModel, setChatNamingModel } = useGlobalConfigStore();
  const { modelList, providerList } = useModelListStore();

  useEffect(() => {
    const fetchSettings = async () => {
      const resultValue = await fetchAppSettings('chatNamingModel');
      if (resultValue) {
        setChatNamingModel(resultValue);
      }
    }
    fetchSettings();
  }, [setChatNamingModel]);

  const handleChangeModel = (value: string) => {
    setChatNamingModel(value);
    adminAndSetAppSettings('chatNamingModel', value);
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
        <span className='text-sm'>对话自动命名</span>
        <span className='text-gray-400 text-xs'>指定用于对话自动重命名的模型</span>
      </div>
      <div className='flex items-center'>
        <Select
          value={chatNamingModel}
          onChange={handleChangeModel}
          style={{ width: 230 }}
          listHeight={320}
          options={[{
            label: '其他',
            title: '其他',
            options: [{
              label: <div className='flex flex-row items-center'>
                <Spark width={22} height={22} style={{ 'color': '#666' }} />
                <span className='ml-1'>对话所使用的模型</span>
              </div>,
              value: 'current'
            },
            {
              label: <div className='flex flex-row items-center'>
                <StopOutlined style={{ width: '22px', height: '22px', 'marginLeft': '4px', 'color': '#666' }} />
                <span className='ml-1'>不进行命名</span>
              </div>,
              value: 'none'
            }
            ]
          }, ...options]}
        />
      </div>
    </div>
  )
}

export default ChatNaming