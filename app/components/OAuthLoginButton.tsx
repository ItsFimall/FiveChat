'use client';
import { useState } from 'react';
import { Button } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';

interface OAuthLoginButtonProps {
  provider: string;
  displayName: string;
  logoUrl?: string;
  authorizeUrl: string;
  loading?: boolean;
  onLoading?: (loading: boolean) => void;
}

export default function OAuthLoginButton({
  provider,
  displayName,
  logoUrl,
  authorizeUrl,
  loading = false,
  onLoading
}: OAuthLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  // 获取 Logo URL
  const getLogoUrl = () => {
    if (logoUrl) {
      return logoUrl;
    }

    // 从授权 URL 提取域名并生成 favicon URL
    try {
      const url = new URL(authorizeUrl);
      return `${url.protocol}//${url.hostname}/favicon.ico`;
    } catch {
      return '/default-oauth-icon.svg'; // 默认图标
    }
  };

  const handleSignIn = async () => {
    if (onLoading) onLoading(true);
    setIsLoading(true);

    try {
      // 构建 OAuth 授权 URL
      const baseUrl = window.location.origin;
      const redirectUri = `${baseUrl}/api/auth/callback/${provider}`;

      const authUrl = new URL(authorizeUrl);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('state', Math.random().toString(36).substring(7));

      // 重定向到 OAuth 授权页面
      window.location.href = authUrl.toString();
    } catch (error) {
      console.error(`Error signing in with ${provider}:`, error);
      if (onLoading) onLoading(false);
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSignIn}
      loading={loading || isLoading}
      size="large"
      block
      className="flex items-center justify-center gap-3 mb-3 h-12 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200"
      style={{
        backgroundColor: 'transparent',
        borderColor: '#e5e7eb',
        color: '#374151'
      }}
    >
      <img
        src={getLogoUrl()}
        alt={displayName}
        width={20}
        height={20}
        className="rounded"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (target.src !== window.location.origin + '/default-oauth-icon.svg') {
            target.src = '/default-oauth-icon.svg';
          }
        }}
      />
      <span className="font-medium">Continue with {displayName}</span>
    </Button>
  );
}
