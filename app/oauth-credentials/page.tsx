"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import Image from "next/image";
import Link from 'next/link';
import { Button, Modal, Typography, Space, message } from 'antd';
import { CopyOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import logo from "@/app/images/logo.png";
import Fivechat from "@/app/images/fivechat.svg";
import { useTranslations } from 'next-intl';

const { Title, Text, Paragraph } = Typography;

export default function OAuthCredentialsPage() {
  const t = useTranslations('Auth');
  const [showPassword, setShowPassword] = useState(false);
  const [modalOpen, setModalOpen] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const username = searchParams.get('username');
  const password = searchParams.get('password');

  useEffect(() => {
    // 如果没有凭据信息，重定向到聊天页面
    if (!username || !password) {
      router.push('/chat');
    }
  }, [username, password, router]);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success(t('copiedToClipboard', { type }));
    });
  };

  const handleContinue = () => {
    setModalOpen(false);
    router.push('/chat');
  };

  const handleChangePassword = () => {
    setModalOpen(false);
    router.push('/chat/settings/account');
  };

  if (!username || !password) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-slate-50">
      <div className="flex items-center flex-row mb-6">
        <Link href="/" className='flex items-center'>
          <Image src={logo} className="ml-1" alt="FiveChat logo" width={32} height={32} />
          <Fivechat className="ml-1" alt="FiveChat text" width={156} height={39} />
        </Link>
      </div>

      <Modal
        title={
          <div className="text-center">
            <Title level={3} className="mb-2">
              {t('oauthCredentialsTitle')}
            </Title>
          </div>
        }
        open={modalOpen}
        onCancel={handleContinue}
        footer={null}
        width={500}
        centered
        maskClosable={false}
      >
        <div className="text-center mb-6">
          <Paragraph className="text-gray-600">
            {t('oauthCredentialsDescription')}
          </Paragraph>
        </div>

        <div className="space-y-4 mb-6">
          {/* 用户名 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <Text strong>{t('username')}:</Text>
              <Button
                type="text"
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard(username, t('username'))}
                size="small"
              />
            </div>
            <div className="font-mono text-lg bg-white p-2 rounded border">
              {username}
            </div>
          </div>

          {/* 密码 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <Text strong>{t('password')}:</Text>
              <Space>
                <Button
                  type="text"
                  icon={showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  onClick={() => setShowPassword(!showPassword)}
                  size="small"
                />
                <Button
                  type="text"
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard(password, t('password'))}
                  size="small"
                />
              </Space>
            </div>
            <div className="font-mono text-lg bg-white p-2 rounded border">
              {showPassword ? password : '••••••••••••'}
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <Text className="text-yellow-800">
            <strong>{t('important')}:</strong> {t('oauthCredentialsWarning')}
          </Text>
        </div>

        <div className="flex flex-col space-y-3">
          <Button
            type="primary"
            block
            size="large"
            onClick={handleChangePassword}
          >
            {t('changePasswordNow')}
          </Button>
          <Button
            block
            size="large"
            onClick={handleContinue}
          >
            {t('continueToChat')}
          </Button>
        </div>
      </Modal>

      {/* 背景内容 */}
      <div className="w-full max-w-sm space-y-6 rounded-lg bg-white p-6 shadow-xl opacity-50">
        <h2 className="text-center text-2xl">{t('welcome')}</h2>
        <p className="text-center text-gray-600">{t('settingUpAccount')}</p>
      </div>
    </div>
  );
}
