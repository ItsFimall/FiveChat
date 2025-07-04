"use client";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from 'next/link';
import { Form, Input, Button, Alert } from 'antd';
import logo from "@/app/images/logo.png";
import FiveChat from "@/app/images/fivechat.svg";

import { fetchAppSettings } from '@/app/admin/system/actions';
import { getActiveAuthProvides, getActiveOAuthConfigs } from '@/app/(auth)/actions';
import SpinLoading from '@/app/components/loading/SpinLoading';
import { useTranslations } from 'next-intl';
import { oauthConfigType } from '@/app/db/schema';

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
  const [oauthConfigs, setOauthConfigs] = useState<oauthConfigType[]>([]);
  const [error, setError] = useState("");

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
      const resultValue = await fetchAppSettings('isRegistrationOpen');
      setIsRegistrationOpen(resultValue === 'true');
      const activeAuthProvides = await getActiveAuthProvides();
      setAuthProviders(activeAuthProvides);
      const oauthConfigsData = await getActiveOAuthConfigs();
      setOauthConfigs(oauthConfigsData);
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
          <FiveChat className="ml-1" alt="FiveChat text" width={156} height={39} />
        </Link>
      </div>

      <div className="w-full  max-w-md rounded-lg bg-white p-8 shadow-xl">
        <h2 className="text-center text-2xl">{t('login')}</h2>
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

        {/* OAuth登录选项 */}
        {oauthConfigs.length > 0 && (
          <div className="mt-4">
            {authProviders.includes('email') && (
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">或</span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {oauthConfigs.map((config) => (
                <Button
                  key={config.id}
                  block
                  size="large"
                  onClick={() => {
                    window.location.href = `/api/auth/oauth-login?config_id=${config.id}`;
                  }}
                  className="flex items-center justify-center"
                >
                  使用 {config.name} 登录
                </Button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}