import { useEffect, useRef, useState, useCallback } from 'react';
import { Divider, Tooltip, Button, Popconfirm, message } from 'antd';
import { EyeInvisibleOutlined, DeleteOutlined, SettingOutlined, PictureOutlined, ToolOutlined, HolderOutlined } from '@ant-design/icons';
import useModelListStore from '@/app/store/modelList';
import { LLMModel } from '@/types/llm';
import { changeSelectInServer, deleteCustomModelInServer, saveModelsOrder } from '@/app/admin/llm/actions';
import ManageAllModelModal from '@/app/components/admin/llm/ManageAllModelModal';
import Sortable, { SortableEvent } from 'sortablejs';
import { useTranslations } from 'next-intl';

interface ModelListProps {
  providerId: string;
  providerName: string;
  setCurretEditModal: (model: LLMModel) => void;
  setIsEditModelModalOpen: (open: boolean) => void;
  setIsCustomModelModalOpen: (open: boolean) => void;
}

const ModelList: React.FC<ModelListProps> = ({
  providerId,
  providerName,
  setCurretEditModal,
  setIsEditModelModalOpen,
  setIsCustomModelModalOpen,
}) => {
  const t = useTranslations('Admin.Models');
  const [isManageAllModalOpen, setIsManageAllModalOpen] = useState(false);
  const [isSorting, setIsSorting] = useState(false);
  const { modelList, setModelList, changeSelect, deleteCustomModel } = useModelListStore();
  const listRef = useRef<HTMLDivElement>(null);
  const sortableRef = useRef<Sortable | null>(null);

  const handleSortEnd = useCallback(async (evt: SortableEvent) => {
    if (evt.oldIndex === undefined || evt.newIndex === undefined) {
      return;
    }

    setIsSorting(true);
    try {
      const newModels = modelList.filter(i => i.selected);
      const [movedItem] = newModels.splice(evt.oldIndex, 1);
      newModels.splice(evt.newIndex, 0, movedItem);

      const newOrder = newModels.map((model, index) => ({ modelId: model.id, order: index }));
      setModelList(newModels);
      await saveModelsOrder(providerId, newOrder);
      message.success(t('saveSuccess'));
    } catch (error) {
      console.error('Failed to update order:', error);
      message.error(t('saveFailed'));
      // Revert to original order if save fails
      setModelList([...modelList]);
    } finally {
      setIsSorting(false);
    }
  }, [modelList, setModelList, providerId, t]);

  useEffect(() => {
    if (listRef.current && !sortableRef.current) {
      sortableRef.current = Sortable.create(listRef.current, {
        animation: 200,
        handle: '.handle',
        onEnd: handleSortEnd,
        disabled: isSorting,
      });
    }

    return () => {
      if (sortableRef.current) {
        sortableRef.current.destroy();
        sortableRef.current = null;
      }
    };
  }, [handleSortEnd, isSorting]);

  const handleChangeSelect = async (modelName: string, selected: boolean) => {
    await changeSelectInServer(modelName, selected);
    changeSelect(modelName, selected);
  }

  const handleDeleteCustomModel = async (modelName: string,) => {
    await deleteCustomModelInServer(modelName);
    deleteCustomModel(modelName);
  }

  return (
    <>
      <div className='font-medium'>{t('models')}</div>
      <div
        ref={listRef}
        className='text-xs text-gray-700 my-2 pr-2 -ml-4 scrollbar-thin scrollbar-thumb-gray-300'>
        {modelList.filter(i => i.selected).map((item) => (
          <div key={item.id} className='flex flex-row'>
            <HolderOutlined className='cursor-move handle' style={{ color: '#999', cursor: 'move' }} />
            <div className='flex flex-row ml-1 group w-full my-1 items-center h-10 bg-gray-100 rounded-md pl-3 pr-1 justify-between'>
              <div>
                <span className=''>{item.displayName}</span>
                <Divider type="vertical" />
                <span className='text-gray-500' style={{ 'fontSize': '10px' }}>{item.id}</span>
                {
                  item.maxTokens && <>
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
                }
                {
                  item?.supportTool && <><Divider type="vertical" /><Tooltip title={t('supportTool')}>
                    <ToolOutlined style={{ color: '#888' }} />
                  </Tooltip></>
                }
              </div>
              <div className='invisible group-hover:visible'>
                <Tooltip title={t('hide')}>
                  <Button onClick={() => {
                    handleChangeSelect(item.id, false);
                  }} size='small' type='text' icon={<EyeInvisibleOutlined style={{ color: '#888' }} />} />
                </Tooltip>
                <Popconfirm
                  title={t('deleteCustomModel')}
                  description={t('currentModelWillbeDeleted')}
                  onConfirm={() => {
                    handleDeleteCustomModel(item.id);
                    message.success(t('deleteSuccess'))
                  }}
                  okText={t('confirm')}
                  cancelText={t('cancel')}
                >
                  <Button size='small' type='text' icon={<DeleteOutlined style={{ color: '#888' }} />} />
                </Popconfirm>

                <Tooltip title={t('settings')}>
                  <Button size='small' onClick={() => {
                    setCurretEditModal(item);
                    setIsEditModelModalOpen(true);
                  }} type='text' icon={<SettingOutlined style={{ color: '#888' }} />} />
                </Tooltip>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className='mb-4'>
        <Button
          size='small'
          style={{ 'fontSize': '11px' }}
          onClick={() => {
            setIsManageAllModalOpen(true);
          }}
        >管理模型</Button>
        <Button
          size='small'
          style={{ 'fontSize': '11px' }}
          className='ml-2'
          onClick={() => {
            setIsCustomModelModalOpen(true);
          }}
        >{t('customModel')}</Button>
      </div>
      <ManageAllModelModal
        isModalOpen={isManageAllModalOpen}
        setIsModalOpen={setIsManageAllModalOpen}
        providerId={providerId}
        providerName={providerName}
      />
    </>
  );
};

export default ModelList;