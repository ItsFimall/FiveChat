'use client';
import React, { useState, useEffect } from 'react';
import { Button, Table, Switch, message, Modal, Space, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ToggleSidebar } from '@/app/icons';
import { fetchAllOAuthConfigs, deleteOAuthConfig, updateOAuthConfig } from './actions';
import { oauthConfigType } from '@/app/db/schema';
import OAuthConfigModal from '@/app/components/admin/oauth/OAuthConfigModal';
import { useAdminSidebarCollapsed } from '@/app/store/adminSidebarCollapsed';
import { useTranslations } from 'next-intl';

const OAuthConfigPage = () => {
  const t = useTranslations('Admin.OAuth');
  const c = useTranslations('Common');
  const { isSidebarCollapsed, toggleSidebar } = useAdminSidebarCollapsed();
  const [configs, setConfigs] = useState<oauthConfigType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<oauthConfigType | null>(null);
  const [modal, contextHolder] = Modal.useModal();

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const data = await fetchAllOAuthConfigs();
      setConfigs(data);
    } catch (error) {
      message.error('获取配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleCreate = () => {
    setEditingConfig(null);
    setIsModalOpen(true);
  };

  const handleEdit = (config: oauthConfigType) => {
    setEditingConfig(config);
    setIsModalOpen(true);
  };

  const handleDelete = (config: oauthConfigType) => {
    modal.confirm({
      title: '确认删除',
      content: `确定要删除 "${config.name}" 吗？此操作不可恢复。`,
      okText: c('confirm'),
      cancelText: c('cancel'),
      onOk: async () => {
        try {
          const result = await deleteOAuthConfig(config.id);
          if (result.status === 'success') {
            message.success('删除成功');
            fetchConfigs();
          } else {
            message.error(result.message || '删除失败');
          }
        } catch (error) {
          message.error('删除失败');
        }
      }
    });
  };

  const handleToggleActive = async (config: oauthConfigType, checked: boolean) => {
    try {
      const result = await updateOAuthConfig(config.id, {
        name: config.name,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        homepage: config.homepage || undefined,
        description: config.description || undefined,
        callbackUrl: config.callbackUrl,
        isActive: checked,
      });

      if (result.status === 'success') {
        message.success(checked ? '已启用' : '已禁用');
        fetchConfigs();
      } else {
        message.error(result.message || '操作失败');
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleModalSuccess = () => {
    setIsModalOpen(false);
    fetchConfigs();
  };

  const columns = [
    {
      title: '应用名',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: 'Client ID',
      dataIndex: 'clientId',
      key: 'clientId',
      width: 200,
      render: (text: string) => (
        <Tooltip title={text}>
          <span className="font-mono text-xs">
            {text.length > 20 ? `${text.substring(0, 20)}...` : text}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '回调地址',
      dataIndex: 'callbackUrl',
      key: 'callbackUrl',
      width: 250,
      render: (text: string) => (
        <Tooltip title={text}>
          <span className="text-xs">
            {text.length > 30 ? `${text.substring(0, 30)}...` : text}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (isActive: boolean, record: oauthConfigType) => (
        <Switch
          checked={isActive}
          onChange={(checked) => handleToggleActive(record, checked)}
          size="small"
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: Date) => new Date(date).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record: oauthConfigType) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className='flex flex-col w-full items-center'>
      <div className='flex flex-row w-full items-center h-10 px-1'>
        {isSidebarCollapsed &&
          <Button
            icon={<ToggleSidebar style={{ 'color': '#999', 'fontSize': '20px', 'verticalAlign': 'middle' }} />}
            type='text'
            onClick={toggleSidebar}
          />
        }
      </div>
      <div className='container max-w-6xl mb-6 px-4 md:px-2 pb-8 h-auto'>
        <div className='flex justify-between items-center mb-6'>
          <h2 className="text-xl font-bold">OAuth 认证配置</h2>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            新增配置
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={configs}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          scroll={{ x: 1000 }}
        />

        <OAuthConfigModal
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          onSuccess={handleModalSuccess}
          editingConfig={editingConfig}
        />

        {contextHolder}
      </div>
    </div>
  );
};

export default OAuthConfigPage;
