"use client";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from 'next/link';
import { Form, Input, Button, Alert } from 'antd';
import logo from "@/app/images/logo.png";
import Fivechat from "@/app/images/fivechat.svg";

import { fetchAppSettings } from '@/app/admin/system/actions';
import { getActiveAuthProvides } from '@/app/(auth)/actions';
import SpinLoading from '@/app/components/loading/SpinLoading';
import OAuthLoginButton from '@/app/components/OAuthLoginButton';
import { getAllOAuthProviders } from '@/app/admin/oauth/actions';
import { useTranslations } from 'next-intl';

interface LoginFormValues {
  email: string;
  password: string;
}

export default function LoginPage() {
  const t = useTranslations('Auth');
  const [form] = Form.useForm<LoginFormValues>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [authProviders, setAuthProviders] = useState<string[]>([]);
  const [oauthProviders, setOauthProviders] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  async function handleSubmit(values: LoginFormValues) {
    setLoading(true);
    const response = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });
    setLoading(false);
    if (response?.error) {
      console.log(response?.error);
      setError(t('passwordError'));
      return;
    }
    router.push("/chat");
  }

  useEffect(() => {
    const fetchSettings = async () => {
      const [resultValue, activeAuthProvides, oauthProvidersData] = await Promise.all([
        fetchAppSettings('isRegistrationOpen'),
        getActiveAuthProvides(),
        getAllOAuthProviders()
      ]);
      setIsRegistrationOpen(resultValue === 'true');
      setAuthProviders(activeAuthProvides);

      // 过滤出启用的 OAuth 提供商
      const enabledOAuthProviders = oauthProvidersData.filter(provider =>
        provider.enabled && provider.clientId && provider.clientSecret
      );
      setOauthProviders(enabledOAuthProviders);
    }
    fetchSettings().then(() => {
      setIsFetching(false);
    });
  }, []);

  if (isFetching) {
    return (
      <main className="h-dvh flex justify-center items-center">
        <SpinLoading />
        <span className='ml-2 text-gray-600'>Loading ...</span>
      </main>
    )
  }
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-slate-50">
      <div className="flex items-center flex-row  mb-6">
        <Link href="/" className='flex items-center'>
          <Image src={logo} className="ml-1" alt="FiveChat logo" width={32} height={32} />
          <Fivechat className="ml-1" alt="FiveChat text" width={156} height={39} />
        </Link>
      </div>

      <div className="w-full  max-w-md rounded-lg bg-white p-8 shadow-xl">
        <h2 className="text-center text-2xl mb-6">{t('login')}</h2>

        {/* OAuth Login Buttons */}
        <div className="mb-6">
          {oauthProviders.map((provider) => (
            <OAuthLoginButton
              key={provider.id}
              provider={provider.name}
              displayName={provider.displayName}
              logoUrl={provider.logoUrl}
              authorizeUrl={provider.authorizeUrl}
              loading={oauthLoading === provider.name}
              onLoading={(loading) => setOauthLoading(loading ? provider.name : null)}
            />
          ))}
        </div>

        {/* Divider if both OAuth and email are available */}
        {oauthProviders.length > 0 && authProviders.includes('email') && (
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>
        )}

        {authProviders.includes('email') &&
          <>
            {error && <Alert message={error} type="error" />}
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              requiredMark='optional'
            >
              <Form.Item
                name="email"
                label={<span className="font-medium">Email</span>}
                validateTrigger='onBlur'
                rules={[{ required: true, type: 'email', message: t('emailNotice') }]}
              >
                <Input size='large' />
              </Form.Item>
              <Form.Item
                name="password"
                label={<span className="font-medium">{t('password')}</span>}
                rules={[{ required: true, message: t('passwordNotice') }]}
              >
                <Input.Password size='large' />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={loading}
                  size='large'
                >
                  {t('login')}
                </Button>
              </Form.Item>
              {isRegistrationOpen && <div className='flex -mt-4'>
                <Link href='/register'>
                  <Button
                    type='link'
                    className='text-sm text-gray-400'
                    style={{ 'padding': '0' }}
                  >{t('register')}</Button>
                </Link>
              </div>
              }
            </Form>
          </>
        }

      </div>
    </div>
  );
}