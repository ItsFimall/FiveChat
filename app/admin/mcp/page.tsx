'use client';
import React, { useEffect, useState } from 'react';
import { MCPTool } from '@/types/llm';
import { getMcpServerList, addMcpServer, updateMcpServer, deleteMcpServer, fetchToolList } from './actions';
import { Tag, Button, Modal, Form, Input, Switch, Divider, message, Skeleton, Radio } from 'antd';
import { useTranslations } from 'next-intl';
type FormValues = {
  id?: string;
  name: string;
  description: string | null;
  type: 'sse' | 'streamableHttp';
  isActive: boolean;
  baseUrl: string;
}

const McpPage = () => {
  const t = useTranslations('Admin.Mcp');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [toolModalLoading, setToolModalLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isToolsModalOpen, setIsToolsModalOpen] = useState(false);
  const [mcpServerList, setMcpServerList] = useState<FormValues[]>([]);
  const [mcpTools, setMcpTools] = useState<MCPTool[]>([]);
  const [fetchStatus, setFetchStatus] = useState(true);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  useEffect(() => {
    const fetchMcpServerList = async (): Promise<void> => {
      const mcpServerList = await getMcpServerList();
      setMcpServerList(mcpServerList);
      setFetchStatus(false)
    };
    fetchMcpServerList();
  }, []);

  const showAddMcpServerModal = () => {
    setIsModalOpen(true);
  };

  const handleOk = () => {
    form.submit();
  };

  const handleEditOk = () => {
    editForm.submit();
  };

  const handleCancel = () => {
    form.resetFields();
    setIsModalOpen(false);
  };

  const handleEditUserModalCancel: () => void = () => {
    editForm.resetFields();
    setIsEditModalOpen(false);
  };

  const onFinish = async (values: FormValues) => {
    setConfirmLoading(true);
    const result = await addMcpServer({
      ...values,
      description: values.description || undefined,
    });
    if (result.success) {
      setConfirmLoading(false);
      setIsModalOpen(false);
      const mcpServerList = await getMcpServerList();
      setMcpServerList(mcpServerList);
      message.success("添加成功");
      form.resetFields();
    } else {
      message.error(result.message);
      setConfirmLoading(false);
    }
  };

  const onEditFinish = async (values: FormValues) => {
    setConfirmLoading(true);
    const result = await updateMcpServer(values.id!, {
      ...values,
      description: values.description || undefined
    });
    if (result.success) {
      setConfirmLoading(false);
      setIsEditModalOpen(false);
      const mcpServerList = await getMcpServerList();
      setMcpServerList(mcpServerList);
      message.success("更新成功");
      editForm.resetFields();
    } else {
      message.error(result.message);
      setConfirmLoading(false);
    }
  };

  const handleEditMcpServer = async (mcpInfo: FormValues) => {
    editForm.setFieldsValue(mcpInfo)
    setIsEditModalOpen(true);
  }

  const handleDeleteMcpServer = async (name: string) => {
    if (confirm('确认要删除吗')) {
      const result = await deleteMcpServer(name);
      if (result.success) {
        const mcpServerList = await getMcpServerList();
        setMcpServerList(mcpServerList);
        message.success('删除成功');
      } else {
        message.error(result.message)
      }
    }
  }

  const handleShowToolModal = async (mcpServerName: string) => {
    setToolModalLoading(true);
    setIsToolsModalOpen(true);
    const tools = await fetchToolList(mcpServerName);
    setMcpTools(tools);
    setToolModalLoading(false);
  }
  return (
    <div className='container max-w-4xl mb-6 px-4 md:px-0 pt-6'>
      <div className='h-4 w-full mb-10'>
        <h2 className="text-xl font-bold mb-4 mt-6">{t('mcpServers')}</h2>
      </div>
      <div className='w-full mb-6 flex flex-row justify-between items-center'>
        <Button type='primary' onClick={showAddMcpServerModal}>{t('addMcpServer')}</Button>
      </div>
      {fetchStatus ? <><Skeleton active /></> :
        <><div className="overflow-hidden rounded-lg border border-slate-300">
          <table className='border-collapse w-full'>
            <thead>
              <tr className="bg-slate-100 text-sm">
                <th className='border-r border-slate-300 p-2 w-72'>{t('name')}</th>
                <th className='border-r border-slate-300 p-2'>{t('description')}</th>
                <th className='border-r border-slate-300 p-2 w-28'>{t('status')}</th>
                <th className='border-slate-300 p-2 w-36'>{t('action')}</th>
              </tr>
            </thead>
            <tbody>
              {mcpServerList.map((mcpServer, index) => (
                <tr key={mcpServer.name} className="hover:bg-slate-50">
                  <td className='border-t  border-r text-sm border-slate-300 p-2 pl-0'>
                    <div className='flex justify-between'>
                      <Button size='small' type='link' onClick={() => { handleShowToolModal(mcpServer.name) }}>{mcpServer.name}</Button>
                      {mcpServer.type === 'streamableHttp' ?
                        <Tag style={{ margin: 0 }}>Streamable HTTP</Tag>
                        : <Tag style={{ margin: 0 }}>SSE</Tag>
                      }
                    </div>
                  </td>
                  <td className='border-t border-r text-sm border-slate-300 p-2'>{mcpServer.description}</td>
                  <td className='border-t border-r text-sm border-slate-300 p-2 text-center'>{mcpServer.isActive ?
                    <div className='flex flex-row items-center justify-center'>
                      <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                      <span className='ml-2 text-sm'>{t('enabled')}</span>
                    </div> :
                    <div className='flex flex-row items-center justify-center'>
                      <div className='w-2 h-2 bg-gray-400 rounded-full'></div>
                      <span className='ml-2 text-sm'>{t('disabled')}</span>
                    </div>
                  }</td>
                  <td className='border-t text-center text-sm w-36 border-slate-300 p-2'>
                    <Button
                      size='small'
                      className='text-sm'
                      type='link'
                      onClick={() => {
                        handleEditMcpServer(mcpServer)
                      }}
                    >{t('edit')}</Button>
                    <Divider type="vertical" />
                    <Button
                      size='small'
                      className='text-sm'
                      type='link'
                      onClick={() => {
                        handleDeleteMcpServer(mcpServer.name)
                      }}
                    >{t('delete')}</Button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
          <div className='h-8'></div>
        </>
      }
      <Modal
        title={t('addMcpServer')}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        confirmLoading={confirmLoading}
      >
        <Form
          layout="vertical"
          form={form}
          onFinish={onFinish}
          validateTrigger='onBlur'

        >
          <Form.Item label={<span className='font-medium'>{t('name')}</span>} name='name'
            validateTrigger='onBlur'
            rules={[{ required: true, message: t('fieldRequired') }]}>
            <Input type='text' />
          </Form.Item>
          <Form.Item label={<span className='font-medium'>{t('description')}</span>} name='description'>
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item
            name="type"
            label={<label htmlFor="mcpType">{t('type')}</label>}
            initialValue="sse"
            rules={[{ required: true, message: t('fieldRequired') }]}
          >
            <Radio.Group id="mcpType">
              <Radio value="sse">{t('sse')}</Radio>
              <Radio value="streamableHttp">{t('streamableHTTP')}</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item label={<span className='font-medium'>URL</span>}
            name='baseUrl'
            validateTrigger='onBlur'
            rules={[{ required: true, message: t('fieldRequired') }]}>
            <Input type='url' />
          </Form.Item>
          <Form.Item label={<span className='font-medium'>{t('isEnable')}</span>} name='isActive'>
            <Switch defaultChecked={false} value={false} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('editMcpServer')}
        open={isEditModalOpen}
        onOk={handleEditOk}
        onCancel={handleEditUserModalCancel}
        confirmLoading={confirmLoading}
      >
        <Form
          layout="vertical"
          form={editForm}
          onFinish={onEditFinish}
          validateTrigger='onBlur'
        >
          <Form.Item label={<span className='font-medium'>{t('name')}</span>} name='name'>
            <Input type='text' disabled />
          </Form.Item>
          <Form.Item name="id" hidden>
            <Input type="hidden" />
          </Form.Item>
          <Form.Item label={<span className='font-medium'>{t('description')}</span>} name='description'>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="type"
            label={t('type')}
            rules={[{ required: true, message: t('fieldRequired') }]}
          >
            <Radio.Group>
              <Radio value="sse">{t('sse')}</Radio>
              <Radio value="streamableHttp">{t('streamableHTTP')}</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label={<span className='font-medium'>URL</span>}
            name='baseUrl'
            validateTrigger='onBlur'
            rules={[{ required: true, message: t('fieldRequired') }]}>
            <Input type='url' />
          </Form.Item>
          <Form.Item label={<span className='font-medium'>{t('isEnable')}</span>} name='isActive'>
            <Switch defaultChecked={false} value={false} />
          </Form.Item>
        </Form>
      </Modal>


      <Modal
        title={t('tools')}
        open={isToolsModalOpen}
        onOk={handleOk}
        loading={toolModalLoading}
        onCancel={() => setIsToolsModalOpen(false)}
        width={{
          xs: '80%',
          sm: '70%',
          md: '70%',
          lg: '60%',
          xl: '60%',
          xxl: '60%',
        }}
        footer={<Button onClick={() => setIsToolsModalOpen(false)}>关闭</Button>}
      >
        <div className="rounded-lg overflow-hidden border border-slate-300">
          <table className='border-collapse w-full'>
            <thead>
              <tr className="bg-slate-100">
                <th className='border-b border-r border-slate-300 p-2 w-32'>{t('name')}</th>
                <th className='border-b  border-slate-300 p-2 w-72'>{t('description')}</th>
              </tr>
            </thead>
            <tbody>
              {
                mcpTools.map((tool) => (
                  <tr key={tool.name} className="hover:bg-slate-50">
                    <td className='border-t border-r text-sm border-slate-300 w-32 p-2'>{tool.name}</td>
                    <td className='border-t text-sm border-slate-300 w-72 p-2'>{tool.description}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </Modal >
    </div >
  );
};

export default McpPage;