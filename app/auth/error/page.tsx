'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button, Result, Alert } from 'antd';
import { ReloadOutlined, HomeOutlined } from '@ant-design/icons';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<string>('');

  useEffect(() => {
    const errorParam = searchParams.get('error');
    
    if (errorParam) {
      // 根据错误类型设置用户友好的错误信息
      switch (errorParam) {
        case 'CallbackRouteError':
          setError('登录连接失败');
          setErrorDetails('无法连接到认证服务器，这通常是网络连接问题导致的。');
          break;
        case 'OAuthCallbackError':
          setError('第三方登录失败');
          setErrorDetails('第三方认证服务返回错误，请稍后重试。');
          break;
        case 'AccessDenied':
          setError('访问被拒绝');
          setErrorDetails('您没有权限访问此应用，请联系管理员。');
          break;
        case 'Verification':
          setError('验证失败');
          setErrorDetails('验证链接已过期或无效，请重新发起登录。');
          break;
        default:
          setError('登录失败');
          setErrorDetails('登录过程中出现未知错误，请稍后重试。');
      }
    } else {
      setError('未知错误');
      setErrorDetails('发生了未知的认证错误。');
    }
  }, [searchParams]);

  const handleRetry = () => {
    router.push('/');
  };

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Result
          status="error"
          title={error}
          subTitle={errorDetails}
          extra={[
            <Button 
              type="primary" 
              key="retry" 
              icon={<ReloadOutlined />}
              onClick={handleRetry}
            >
              重新登录
            </Button>,
            <Button 
              key="home" 
              icon={<HomeOutlined />}
              onClick={handleGoHome}
            >
              返回首页
            </Button>,
          ]}
        />
        
        {/* 针对钉钉登录的特殊提示 */}
        {error.includes('连接失败') && (
          <Alert
            message="网络连接提示"
            description={
              <div>
                <p>如果您正在使用钉钉登录，请尝试以下解决方案：</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>检查网络连接是否稳定</li>
                  <li>稍等片刻后重新尝试登录</li>
                  <li>如果问题持续存在，请联系系统管理员</li>
                </ul>
              </div>
            }
            type="info"
            showIcon
            className="mt-4"
          />
        )}
      </div>
    </div>
  );
}
