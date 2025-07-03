import React from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import useModelListStore from '@/app/store/modelList';
import { addCustomProviderInServer } from '@/app/admin/llm/actions';
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';


type AddCustomProviderModalProps = {
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
};

const AddCustomProvider: React.FC<AddCustomProviderModalProps> = ({
  isModalOpen,
  setIsModalOpen
}) => {
  const t = useTranslations('Admin.Models');
  const router = useRouter();
  const [addCustomProviderForm] = Form.useForm();
  const { addCustomProvider } = useModelListStore();

  const onModelFormSubmit = async (values: {
    provider: string;
    providerName: string;
    endpoint: string;
    apiStyle: 'openai' | 'openai_response' | 'claude' | 'gemini'
    apikey: string
  }) => {
    addCustomProvider({
      id: values.provider,
      providerName: values.providerName,
      status: true,
      apiStyle: values.apiStyle,
      type: 'custom',
    })
    const result = await addCustomProviderInServer(values);
    if (result.status === 'success') {
      // 路由跳转
      message.success('添加成功');
      addCustomProviderForm.resetFields();
      setIsModalOpen(false);
      router.push(`/admin/llm/${values.provider}`);
    } else {
      message.error(result.message);
    }
  };

  return (
    <Modal
      title='添加 AI 服务商'
      maskClosable={false}
      keyboard={false}
      centered={true}
      okText={t('okText')}
      cancelText={t('cancelText')}
      open={isModalOpen}
      onOk={() => addCustomProviderForm.submit()}
      onCancel={() => setIsModalOpen(false)}
    >
      <div className='mt-4'>
        <Form
          layout="vertical"
          form={addCustomProviderForm}
          onFinish={onModelFormSubmit}
          initialValues={{
            apiStyle: 'openai',
          }}
        >
          <Form.Item
            name='provider'
            label={<span className='font-medium'>服务商 ID</span>}
            rules={[{ required: true, message: '此项为必填', }, { pattern: /^[a-zA-Z0-9_]+$/, message: '仅允许字母、数字和下划线' }]}
            extra="作为服务商唯一标识，创建后将不可修改"
            validateTrigger='onBlur'
          >
            <Input />
          </Form.Item>
          <Form.Item
            name='providerName'
            label={<span className='font-medium'>服务商显示名称</span>}
            rules={[{ required: true, message: '此项为必填' }]}
            extra="服务商显示名称，方便用户识别"
          >
            <Input type='text' />
          </Form.Item>
          <Form.Item
            name='endpoint'
            label={<span className='font-medium'>服务地址</span>}
            rules={[{ required: true, message: '此项为必填' }]}
          >
            <Input type='text' />
          </Form.Item>

          <Form.Item
            name='apiStyle'
            label={<span className='font-medium'>API 请求格式</span>}
          >
            <Select
              options={
                [{
                  value: 'openai',
                  label: 'Open AI',
                },
                {
                  value: 'openai_response',
                  label: 'Open AI Response',
                },
                {
                  value: 'claude',
                  label: 'Anthropic',
                }
                ]
              }
            />
          </Form.Item>
          <Form.Item
            name='apikey'
            label={<span className='font-medium'>API Key</span>}
          >
            <Input type='text' />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};

export default AddCustomProvider;