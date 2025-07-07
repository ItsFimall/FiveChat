'use client';

import { useState, useEffect } from 'react';
import { Form, Input, Switch, Button, Space, message, Alert, Select } from 'antd';
import { SaveOutlined, GlobalOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import { createOAuthProvider, updateOAuthProvider, validateOAuthProvider, type OAuthProvider } from '@/app/admin/oauth/actions';

interface OAuthProviderFormProps {
  provider?: OAuthProvider | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const OAuthProviderForm: React.FC<OAuthProviderFormProps> = ({
  provider,
  onSuccess,
  onCancel
}) => {
  const t = useTranslations('OAuth');
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');

  const isEditing = !!provider;

  // 常见 OAuth 服务商模板
  const oauthTemplates = [
    {
      value: 'custom',
      label: '自定义配置',
      config: null
    },
    {
      value: 'keycloak',
      label: 'Keycloak',
      config: {
        authorizeUrl: 'https://your-keycloak.com/auth/realms/your-realm/protocol/openid-connect/auth',
        tokenUrl: 'https://your-keycloak.com/auth/realms/your-realm/protocol/openid-connect/token',
        userInfoUrl: 'https://your-keycloak.com/auth/realms/your-realm/protocol/openid-connect/userinfo',
        scope: 'openid profile email'
      }
    },
    {
      value: 'auth0',
      label: 'Auth0',
      config: {
        authorizeUrl: 'https://your-domain.auth0.com/authorize',
        tokenUrl: 'https://your-domain.auth0.com/oauth/token',
        userInfoUrl: 'https://your-domain.auth0.com/userinfo',
        scope: 'openid profile email'
      }
    },
    {
      value: 'okta',
      label: 'Okta',
      config: {
        authorizeUrl: 'https://your-domain.okta.com/oauth2/default/v1/authorize',
        tokenUrl: 'https://your-domain.okta.com/oauth2/default/v1/token',
        userInfoUrl: 'https://your-domain.okta.com/oauth2/default/v1/userinfo',
        scope: 'openid profile email'
      }
    }
  ];

  // 获取回调 URL
  const getCallbackUrl = (providerName: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
    return `${baseUrl}/api/auth/callback/${providerName}`;
  };

  // 应用模板配置
  const applyTemplate = (templateValue: string) => {
    const template = oauthTemplates.find(t => t.value === templateValue);
    if (template?.config) {
      form.setFieldsValue(template.config);
    }
  };

  // 生成 Logo 预览
  const generateLogoPreview = (logoUrl: string, authorizeUrl: string) => {
    if (logoUrl) {
      return logoUrl;
    }
    
    if (authorizeUrl) {
      try {
        const url = new URL(authorizeUrl);
        return `${url.protocol}//${url.hostname}/favicon.ico`;
      } catch {
        return '/favicon.ico';
      }
    }
    
    return '/favicon.ico';
  };

  // 处理表单值变化
  const handleValuesChange = (changedValues: any, allValues: any) => {
    if (changedValues.logoUrl !== undefined || changedValues.authorizeUrl !== undefined) {
      const preview = generateLogoPreview(allValues.logoUrl, allValues.authorizeUrl);
      setLogoPreview(preview);
    }
  };

  // 处理表单提交
  const handleSubmit = async (values: any) => {
    setLoading(true);
    
    try {
      // 验证表单数据
      const validation = await validateOAuthProvider(values);
      if (validation.status === 'fail') {
        validation.errors.forEach(error => message.error(error));
        return;
      }

      let result;
      if (isEditing) {
        result = await updateOAuthProvider(provider!.id!, values);
      } else {
        result = await createOAuthProvider(values);
      }

      if (result.status === 'success') {
        message.success(t('saveSuccess'));
        onSuccess();
      } else {
        message.error(result.message || t('saveFailed'));
      }
    } catch (error) {
      console.error('Form submit error:', error);
      message.error(t('saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 初始化表单
  useEffect(() => {
    if (provider) {
      form.setFieldsValue({
        name: provider.name,
        displayName: provider.displayName,
        clientId: provider.clientId,
        clientSecret: '', // 不显示现有密钥
        logoUrl: provider.logoUrl,
        authorizeUrl: provider.authorizeUrl,
        tokenUrl: provider.tokenUrl,
        userInfoUrl: provider.userInfoUrl,
        scope: provider.scope,
        enabled: provider.enabled
      });
      
      const preview = generateLogoPreview(provider.logoUrl || '', provider.authorizeUrl);
      setLogoPreview(preview);
    } else {
      // 新建时的默认值
      form.setFieldsValue({
        enabled: true,
        scope: 'openid profile email'
      });
    }
  }, [provider, form]);

  const currentName = Form.useWatch('name', form);

  return (
    <div className="space-y-4">
      {/* 回调 URL 提示 */}
      {currentName && (
        <Alert
          message={t('callbackUrlNotice')}
          description={
            <div className="mt-2">
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                {getCallbackUrl(currentName)}
              </code>
              <Button
                type="link"
                size="small"
                icon={<GlobalOutlined />}
                onClick={() => {
                  navigator.clipboard.writeText(getCallbackUrl(currentName));
                  message.success(t('copyCallbackUrl') + ' ' + t('saveSuccess'));
                }}
                className="ml-2"
              >
                {t('copyCallbackUrl')}
              </Button>
            </div>
          }
          type="info"
          showIcon
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onValuesChange={handleValuesChange}
        className="space-y-4"
      >
        {/* 基本信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            name="name"
            label={t('providerName')}
            rules={[
              { required: true, message: t('nameRequired') },
              { pattern: /^[a-z0-9_-]+$/, message: 'Only lowercase letters, numbers, hyphens and underscores allowed' }
            ]}
          >
            <Input
              placeholder={t('providerNamePlaceholder')}
              disabled={isEditing}
            />
          </Form.Item>

          <Form.Item
            name="displayName"
            label={t('displayName')}
            rules={[{ required: true, message: t('displayNameRequired') }]}
          >
            <Input placeholder={t('displayNamePlaceholder')} />
          </Form.Item>
        </div>

        {/* Logo 配置 */}
        <Form.Item
          name="logoUrl"
          label={t('logoUrl')}
        >
          <div className="flex items-center space-x-3">
            <Input 
              placeholder={t('logoUrlPlaceholder')}
              className="flex-1"
            />
            {logoPreview && (
              <img
                src={logoPreview}
                alt="Logo Preview"
                className="w-8 h-8 rounded border"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/favicon.ico';
                }}
              />
            )}
          </div>
        </Form.Item>

        {/* 快速配置模板 */}
        {!isEditing && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2">
              <ThunderboltOutlined className="text-black" />
              <h4 className="font-medium text-black">快速配置</h4>
            </div>
            <Select
              placeholder="选择常见的 OAuth 服务商模板"
              style={{ width: '100%' }}
              onChange={applyTemplate}
              options={oauthTemplates}
            />
            <div className="text-sm text-gray-700">
              选择模板后会自动填充常见的端点 URL，您只需要修改域名部分即可。
            </div>
          </div>
        )}

        {/* OAuth 端点配置 - 简化版本 */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">OAuth 端点配置</h4>

          <Form.Item
            name="authorizeUrl"
            label={t('authorizeUrl')}
            rules={[
              { required: true, message: t('authorizeUrlRequired') },
              { type: 'url', message: t('invalidUrl') }
            ]}
          >
            <Input placeholder="https://your-domain.com/oauth/authorize" />
          </Form.Item>

          <Form.Item
            name="tokenUrl"
            label={t('tokenUrl')}
            rules={[
              { required: true, message: t('tokenUrlRequired') },
              { type: 'url', message: t('invalidUrl') }
            ]}
          >
            <Input placeholder="https://your-domain.com/oauth/token" />
          </Form.Item>

          <Form.Item
            name="userInfoUrl"
            label={t('userInfoUrl')}
            rules={[
              { required: true, message: t('userInfoUrlRequired') },
              { type: 'url', message: t('invalidUrl') }
            ]}
          >
            <Input placeholder="https://your-domain.com/api/user" />
          </Form.Item>

          <Form.Item
            name="scope"
            label={t('scope')}
            extra="权限范围，多个用空格分隔"
          >
            <Input placeholder="read write" />
          </Form.Item>
        </div>

        {/* 客户端配置 */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">客户端配置</h4>
          
          <Form.Item
            name="clientId"
            label={t('clientId')}
            rules={[{ required: true, message: t('clientIdRequired') }]}
          >
            <Input placeholder={t('clientIdPlaceholder')} />
          </Form.Item>

          <Form.Item
            name="clientSecret"
            label={t('clientSecret')}
            rules={[{ required: !isEditing, message: t('clientSecretRequired') }]}
            extra={isEditing ? t('leaveEmptyToKeep') : undefined}
          >
            <Input.Password placeholder={t('clientSecretPlaceholder')} />
          </Form.Item>
        </div>

        {/* 启用状态 */}
        <Form.Item
          name="enabled"
          valuePropName="checked"
        >
          <div className="flex items-center space-x-2">
            <Switch />
            <span>{t('enable')}</span>
          </div>
        </Form.Item>

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button onClick={onCancel}>
            {t('cancel')}
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<SaveOutlined />}
          >
            {t('save')}
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default OAuthProviderForm;
