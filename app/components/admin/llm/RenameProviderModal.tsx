import React from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import useModelListStore from '@/app/store/modelList';
import { saveToServer } from '@/app/admin/llm/actions';
import { useTranslations } from 'next-intl';

type RenameProviderModalProps = {
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  providerId: string;
  providerName: string;
};

const RenameProviderModal: React.FC<RenameProviderModalProps> = ({
  isModalOpen,
  setIsModalOpen,
  providerId,
  providerName,
}) => {
  const t = useTranslations('Admin.Models');
  const [renameProviderForm] = Form.useForm();
  const { renameProvider } = useModelListStore();

  const onModelFormSubmit = async (values: {
    providerId: string;
    providerName: string;
  }) => {
    renameProvider(values.providerId, values.providerName)
    const result = await saveToServer(values.providerId, { providerName: values.providerName });
    message.success('修改成功');
    setIsModalOpen(false);
  };

  return (
    <Modal
      title='服务商重命名'
      maskClosable={false}
      keyboard={false}
      centered={true}
      okText={t('okText')}
      cancelText={t('cancelText')}
      open={isModalOpen}
      onOk={() => renameProviderForm.submit()}
      onCancel={() => setIsModalOpen(false)}
    >
      <div className='mt-4'>
        <Form
          layout="vertical"
          form={renameProviderForm}
          onFinish={onModelFormSubmit}
          initialValues={{
            providerId: providerId,
            providerName: providerName,
          }}
        >
          <Form.Item
            name='providerId'
            label={<span className='font-medium'>服务商 ID</span>}
          >
            <Input disabled />
          </Form.Item>
          <Form.Item
            name='providerName'
            label={<span className='font-medium'>服务商名称</span>}
            rules={[{ required: true, message: '此项为必填' }]}
            extra="服务商显示名称，方便用户识别"
          >
            <Input type='text' />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};

export default RenameProviderModal;