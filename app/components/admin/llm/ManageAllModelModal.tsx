import React, { useState } from 'react';
import { Modal, Tooltip, Divider, Button } from 'antd';
import { PictureOutlined, MinusOutlined, PlusOutlined, SyncOutlined } from '@ant-design/icons';
import useModelListStore from '@/app/store/modelList';
import { LLMModel } from '@/types/llm';
import { changeModelSelectInServer, getRemoteModelsByProvider } from '@/app/admin/llm/actions';
import { useTranslations } from 'next-intl';

type ManageAllModelModalProps = {
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  providerId: string;
  providerName: string;
};

const ManageAllModelModal: React.FC<ManageAllModelModalProps> = ({
  isModalOpen,
  setIsModalOpen,
  providerId,
  providerName,
}) => {
  const t = useTranslations('Admin.Models');
  const { modelList, setModelList, changeSelect } = useModelListStore();
  const [isFetching, setIsFetching] = useState(false);

  const fetchRemoteModels = async () => {
    setIsFetching(true);
    const remoteModelsList = await getRemoteModelsByProvider(providerId);
    const filterModels = remoteModelsList.filter(i => i.object === 'model');

    // 合并 filterModels 和 modelList
    const modelListIds = new Set(modelList.map(model => model.id));
    const processedModels: LLMModel[] = filterModels.filter(model => !modelListIds.has(model.id)).map(i => {
      return {
        id: i.id,
        displayName: i.id,
        provider: {
          id: providerId,
          apiStyle: 'openai',
          providerName: providerId
        },
      }
    })
    const allModelList = [
      ...modelList,
      ...processedModels
    ];
    setModelList(allModelList);
    setIsFetching(false);
  }

  const handleChangeSelect = async (modelId: string, selected: boolean) => {
    changeSelect(modelId, selected);
    await changeModelSelectInServer({
      id: modelId,
      displayName: modelId,
      provider: {
        id: providerId,
        apiStyle: 'openai',
        providerName: providerName,
      }
    }, selected);
  }

  return (
    <Modal
      title="模型管理"
      centered={true}
      open={isModalOpen}
      onCancel={() => setIsModalOpen(false)}
      footer={
        <div className='flex flex-row justify-between'>
          <Button
            onClick={async () => {
              fetchRemoteModels()
            }}
            icon={<SyncOutlined />}
            loading={isFetching}
          >获取模型列表</Button>
          <Button onClick={() => setIsModalOpen(false)}>
            关闭
          </Button>
        </div>
      }
    >
      <div className='mt-4 max-h-96 pr-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-50 scrollbar-track-rounded-full scrollbar-thumb-rounded-full'>
        <div>
          <div className=''>
            {
              modelList.length === 0 && <div className='text-gray-500 text-xs w-full flex justify-center'>暂时无可添加模型</div>
            }
            {modelList.length > 0 &&
              modelList.map((item) => (
                <div
                  key={item.id}
                  className='flex flew-row h-10 hover:bg-gray-100 bg-gray-100 px-4 py-1 mt-2 rounded-md justify-between items-center'
                >
                  <div>
                    <span className='text-xs'>{item.displayName}</span>
                    <Divider type="vertical" />
                    <span className='text-gray-500' style={{ 'fontSize': '10px' }}>{item.id}</span>
                    {item.maxTokens && <>
                      <Divider type="vertical" />
                      <Tooltip title={`${t('conversationUpTo')} ${item.maxTokens} tokens`}>
                        <span className='text-gray-500' style={{ 'fontSize': '10px' }}>{(item.maxTokens as number) / 1024}K</span>
                      </Tooltip>
                    </>
                    }
                    {
                      item?.supportVision && <><Divider type="vertical" /><Tooltip title={t('supportVision')}>
                        <PictureOutlined style={{ color: '#888' }} />
                      </Tooltip></>
                    }</div>
                  {
                    item.selected ? <Button size="small" onClick={() => {
                      handleChangeSelect(item.id, false);
                    }}
                      icon={<MinusOutlined />} />
                      :
                      <Button size="small" type='primary' onClick={() => {
                        handleChangeSelect(item.id, true);
                      }}
                        icon={<PlusOutlined />} />
                  }
                </div>
              )
              )
            }
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ManageAllModelModal;