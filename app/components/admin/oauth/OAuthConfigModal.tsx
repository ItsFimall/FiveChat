'use client';
import React, { useEffect } from 'react';
import { Modal, Form, Input, Switch, message, Button } from 'antd';
import { createOAuthConfig, updateOAuthConfig, OAuthConfigFormValues } from '@/app/admin/oauth/actions';
import { oauthConfigType } from '@/app/db/schema';

interface OAuthConfigModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  editingConfig?: oauthConfigType | null;
}

const OAuthConfigModal: React.FC<OAuthConfigModalProps> = ({
  open,
  onCancel,
  onSuccess,
  editingConfig
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  const isEditing = !!editingConfig;

  useEffect(() => {
    if (open) {
      if (editingConfig) {
        form.setFieldsValue({
          name: editingConfig.name,
          clientId: editingConfig.clientId,
          clientSecret: editingConfig.clientSecret,
          homepage: editingConfig.homepage,
          description: editingConfig.description,
          callbackUrl: editingConfig.callbackUrl,
          isActive: editingConfig.isActive,
        });
      } else {
        form.resetFields();
        // 设置默认回调地址
        const baseUrl = window.location.origin;
        form.setFieldsValue({
          callbackUrl: `${baseUrl}/api/auth/callback/custom-oauth`,
          isActive: true,
        });
      }
    }
  }, [open, editingConfig, form]);

  const handleSubmit = async (values: OAuthConfigFormValues) => {
    setLoading(true);
    try {
      let result;
      if (isEditing && editingConfig) {
        result = await updateOAuthConfig(editingConfig.id, values);
      } else {
        result = await createOAuthConfig(values);
      }

      if (result.status === 'success') {
        message.success(isEditing ? '更新成功' : '创建成功');
        onSuccess();
      } else {
        message.error(result.message || (isEditing ? '更新失败' : '创建失败'));
      }
    } catch (error) {
      message.error(isEditing ? '更新失败' : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={isEditing ? '编辑 OAuth 配置' : '新增 OAuth 配置'}
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark="optional"
      >
        <Form.Item
          name="name"
          label="应用名"
          rules={[{ required: true, message: '请输入应用名' }]}
        >
          <Input placeholder="例如：GitHub OAuth" />
        </Form.Item>

        <Form.Item
          name="clientId"
          label="Client ID"
          rules={[{ required: true, message: '请输入 Client ID' }]}
        >
          <Input placeholder="从第三方应用获取的 Client ID" />
        </Form.Item>

        <Form.Item
          name="clientSecret"
          label="Client Secret"
          rules={[{ required: true, message: '请输入 Client Secret' }]}
        >
          <Input.Password placeholder="从第三方应用获取的 Client Secret" />
        </Form.Item>

        <Form.Item
          name="homepage"
          label="应用主页"
        >
          <Input placeholder="https://example.com" />
        </Form.Item>

        <Form.Item
          name="description"
          label="应用描述"
        >
          <Input.TextArea 
            placeholder="简要描述此 OAuth 应用的用途"
            rows={3}
          />
        </Form.Item>

        <Form.Item
          name="callbackUrl"
          label="回调地址"
          rules={[
            { required: true, message: '请输入回调地址' },
            { type: 'url', message: '请输入有效的 URL' }
          ]}
          extra="OAuth 认证成功后的回调地址，需要在第三方应用中配置"
        >
          <Input placeholder="https://yourdomain.com/api/auth/callback/custom-oauth" />
        </Form.Item>

        <Form.Item
          name="isActive"
          label="启用状态"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <div className="flex justify-end space-x-2 mt-6">
          <Button onClick={handleCancel}>
            取消
          </Button>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
          >
            {isEditing ? '更新' : '创建'}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default OAuthConfigModal;
