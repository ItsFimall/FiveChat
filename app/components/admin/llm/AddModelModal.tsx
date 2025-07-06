import React from 'react';
import { Modal, Form, Input, InputNumber, Switch, message } from 'antd';
import useModelListStore from '@/app/store/modelList';
import { addCustomModelInServer } from '@/app/admin/llm/actions';
import { LLMModelProvider } from '@/types/llm';
import { useTranslations } from 'next-intl';

type CustomModelModalProps = {
  isCustomModelModalOpen: boolean;
  setIsCustomModelModalOpen: (open: boolean) => void;
  provider: LLMModelProvider;
};

const AddModelModal: React.FC<CustomModelModalProps> = ({
  isCustomModelModalOpen,
  setIsCustomModelModalOpen,
  provider
}) => {
  const t = useTranslations('Admin.Models');
  const [customModelForm] = Form.useForm();
  const { addCustomModel } = useModelListStore();

  const onModelFormSubmit = async (values: {
    modelId: string;
    modelDisplayName: string;
    modelMaxTokens: number;
    modelVisionSupport: boolean;
    modelToolSupport: boolean;
  }) => {

    const result = await addCustomModelInServer({
      name: values.modelId,
      displayName: values.modelDisplayName,
      maxTokens: values.modelMaxTokens * 1024,
      supportVision: values.modelVisionSupport,
      supportTool: values.modelToolSupport,
      selected: true,
      type: 'custom',
      providerId: provider.id,
      providerName: provider.providerName
    });
    if (result.status === 'success') {
      await addCustomModel({
        id: values.modelId,
        displayName: values.modelDisplayName,
        maxTokens: values.modelMaxTokens * 1024,
        supportVision: values.modelVisionSupport,
        supportTool: values.modelToolSupport,
        selected: true,
        type: 'custom',
        provider: {
          id: provider.id,
          apiStyle: provider.apiStyle,
          providerName: provider.providerName
        }
      });
      message.success(t('addModelSuccess'));
      customModelForm.resetFields();
      setIsCustomModelModalOpen(false);
    } else {
      message.error(result.message);
    }
  };

  return (
    <Modal
      title={t('addCustomModel')}
      maskClosable={false}
      keyboard={false}
      centered={true}
      okText={t('okText')}
      cancelText={t('cancelText')}
      open={isCustomModelModalOpen}
      onOk={() => customModelForm.submit()}
      onCancel={() => setIsCustomModelModalOpen(false)}
    >
      <div className='mt-4'>
        <Form
          layout="vertical"
          form={customModelForm}
          onFinish={onModelFormSubmit}
          initialValues={{
            modelMaxTokens: 32,
          }}
        >
          <Form.Item
            name='modelId'
            label={<span className='font-medium'>{t('modelId')}</span>}
            rules={[{ required: true, message: t('modelIdNotice') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name='modelDisplayName'
            label={<span className='font-medium'>{t('modelDisplayName')}</span>}
            rules={[{ required: true, message: t('modelDisplayNameNotice') }]}
          >
            <Input type='text' />
          </Form.Item>
          <Form.Item
            name='modelMaxTokens'
            label={<span className='font-medium'>{t('modelMaxToken')}</span>}
            rules={[{ required: true, message: t('modelMaxTokenNotice') }]}
          >
            <InputNumber addonAfter="K" />
          </Form.Item>
          <Form.Item
            name='modelVisionSupport'
            valuePropName="checked"
            label={<span className='font-medium'>{t('supportVision')}</span>}
          >
            <Switch defaultChecked={false} />
          </Form.Item>
          <Form.Item
            name='modelToolSupport'
            valuePropName="checked"
            label={<span className='font-medium'>支持工具调用</span>}
          >
            <Switch defaultChecked={false} />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};

export default AddModelModal;