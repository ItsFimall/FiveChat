'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Empty, message, Modal, Space, Tag, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CopyOutlined, GlobalOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import { getAllOAuthProviders, deleteOAuthProvider, type OAuthProvider } from '@/app/admin/oauth/actions';
import OAuthProviderForm from './OAuthProviderForm';

const DynamicOAuthConfig = () => {
  const t = useTranslations('OAuth');
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [editingProvider, setEditingProvider] = useState<OAuthProvider | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingProvider, setDeletingProvider] = useState<OAuthProvider | null>(null);

  // 获取回调 URL
  const getCallbackUrl = (providerName: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
    return `${baseUrl}/api/auth/callback/${providerName}`;
  };

  // 复制回调 URL
  const copyCallbackUrl = (providerName: string) => {
    const callbackUrl = getCallbackUrl(providerName);
    navigator.clipboard.writeText(callbackUrl).then(() => {
      message.success(t('copyCallbackUrl') + ' ' + t('saveSuccess'));
    });
  };

  // 获取 Logo URL
  const getLogoUrl = (provider: OAuthProvider) => {
    if (provider.logoUrl) {
      return provider.logoUrl;
    }

    // 从授权 URL 提取域名并生成 favicon URL
    try {
      const url = new URL(provider.authorizeUrl);
      return `${url.protocol}//${url.hostname}/favicon.ico`;
    } catch {
      return '/default-oauth-icon.svg'; // 默认图标
    }
  };

  // 加载服务商列表
  const loadProviders = async () => {
    setLoading(true);
    try {
      const data = await getAllOAuthProviders();
      setProviders(data);
    } catch (error) {
      console.error('Failed to load providers:', error);
      message.error('Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  // 处理删除
  const handleDelete = async () => {
    if (!deletingProvider) return;

    try {
      const result = await deleteOAuthProvider(deletingProvider.id!);
      if (result.status === 'success') {
        message.success(t('deleteSuccess'));
        loadProviders();
      } else {
        message.error(result.message || t('deleteFailed'));
      }
    } catch (error) {
      console.error('Delete error:', error);
      message.error(t('deleteFailed'));
    } finally {
      setDeleteModalVisible(false);
      setDeletingProvider(null);
    }
  };

  // 处理表单成功
  const handleFormSuccess = () => {
    setFormVisible(false);
    setEditingProvider(null);
    loadProviders();
  };

  useEffect(() => {
    loadProviders();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">{t('title')}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {t('providers')} ({providers.length})
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingProvider(null);
            setFormVisible(true);
          }}
        >
          {t('addProvider')}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : providers.length === 0 ? (
        <Empty
          description={t('noProviders')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingProvider(null);
              setFormVisible(true);
            }}
          >
            {t('addFirstProvider')}
          </Button>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((provider) => (
            <Card
              key={provider.id}
              size="small"
              className="hover:shadow-md transition-shadow border border-gray-200"
              style={{ backgroundColor: 'transparent' }}
              actions={[
                <Tooltip title={t('editProvider')} key="edit">
                  <EditOutlined
                    onClick={() => {
                      setEditingProvider(provider);
                      setFormVisible(true);
                    }}
                  />
                </Tooltip>,
                <Tooltip title={t('copyCallbackUrl')} key="copy">
                  <CopyOutlined
                    onClick={() => copyCallbackUrl(provider.name)}
                  />
                </Tooltip>,
                <Tooltip title={t('deleteProvider')} key="delete">
                  <DeleteOutlined
                    onClick={() => {
                      setDeletingProvider(provider);
                      setDeleteModalVisible(true);
                    }}
                  />
                </Tooltip>
              ]}
            >
              <div className="space-y-3">
                {/* Logo 和标题 */}
                <div className="flex items-center space-x-3">
                  <img
                    src={getLogoUrl(provider)}
                    alt={provider.displayName}
                    className="w-8 h-8 rounded"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src !== window.location.origin + '/default-oauth-icon.svg') {
                        target.src = '/default-oauth-icon.svg';
                      }
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">
                      {provider.displayName}
                    </h4>
                    <p className="text-xs text-gray-500 truncate">
                      {provider.name}
                    </p>
                  </div>
                </div>

                {/* 状态标签 */}
                <div className="flex flex-wrap gap-1">
                  <Tag color={provider.enabled ? 'green' : 'default'}>
                    {provider.enabled ? t('enabled') : t('disabled')}
                  </Tag>
                  <Tag
                    color={provider.clientId && provider.clientSecret ? 'green' : 'red'}
                  >
                    {provider.clientId && provider.clientSecret ? t('configured') : t('notConfigured')}
                  </Tag>
                </div>

                {/* 回调 URL */}
                <div className="border border-gray-200 p-2 rounded text-xs"
                     style={{ backgroundColor: 'transparent' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{t('callbackUrl')}:</span>
                    <Button
                      type="link"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => copyCallbackUrl(provider.name)}
                      className="p-0 h-auto"
                    />
                  </div>
                  <code className="text-black break-all">
                    {getCallbackUrl(provider.name)}
                  </code>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 表单模态框 */}
      <Modal
        title={editingProvider ? t('editProvider') : t('addProvider')}
        open={formVisible}
        onCancel={() => {
          setFormVisible(false);
          setEditingProvider(null);
        }}
        footer={null}
        width={600}
        destroyOnClose
      >
        <OAuthProviderForm
          provider={editingProvider}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setFormVisible(false);
            setEditingProvider(null);
          }}
        />
      </Modal>

      {/* 删除确认模态框 */}
      <Modal
        title={t('confirmDelete')}
        open={deleteModalVisible}
        onOk={handleDelete}
        onCancel={() => {
          setDeleteModalVisible(false);
          setDeletingProvider(null);
        }}
        okText={t('delete')}
        cancelText={t('cancel')}
        okButtonProps={{ danger: true }}
      >
        <p>
          {t('deleteConfirmText', { name: deletingProvider?.displayName || '' })}
        </p>
      </Modal>
    </div>
  );
};

export default DynamicOAuthConfig;
