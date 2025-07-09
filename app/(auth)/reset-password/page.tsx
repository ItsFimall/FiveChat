"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from 'next/navigation';
import Image from "next/image";
import Link from 'next/link';
import { Form, Input, Button, Alert, message } from 'antd';
import logo from "@/app/images/logo.png";
import Fivechat from "@/app/images/fivechat.svg";
import { useTranslations } from 'next-intl';
import { resetPassword, verifyResetToken } from '../actions';

interface ResetPasswordFormValues {
  password: string;
  repeatPassword: string;
}

export default function ResetPasswordPage() {
  const t = useTranslations('Auth');
  const [form] = Form.useForm<ResetPasswordFormValues>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      return;
    }

    const checkToken = async () => {
      try {
        const result = await verifyResetToken(token);
        setTokenValid(result.valid);
        if (!result.valid) {
          setError(result.message || t('invalidResetToken'));
        }
      } catch (err) {
        setTokenValid(false);
        setError(t('invalidResetToken'));
      }
    };

    checkToken();
  }, [token, t]);

  async function handleSubmit(values: ResetPasswordFormValues) {
    if (!token) return;
    
    setLoading(true);
    setError("");
    
    if (values.password.length < 8) {
      setError(t('passwordLengthLimit'));
      setLoading(false);
      return;
    }
    
    if (values.password !== values.repeatPassword) {
      setError(t('passwordNotSame'));
      setLoading(false);
      return;
    }
    
    try {
      const result = await resetPassword(token, values.password);
      if (result.status === 'success') {
        setSuccess(true);
        message.success(t('passwordResetSuccess'));
      } else {
        setError(result.message || t('passwordResetFail'));
      }
    } catch (err: any) {
      setError(err.message || t('passwordResetFail'));
    }
    
    setLoading(false);
  }

  if (tokenValid === null) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">{t('verifyingToken')}</p>
        </div>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center flex-row mb-6">
          <Link href="/" className='flex items-center'>
            <Image src={logo} className="ml-1" alt="FiveChat logo" width={32} height={32} />
            <Fivechat className="ml-1" alt="FiveChat text" width={156} height={39} />
          </Link>
        </div>
        <div className="w-full max-w-sm space-y-6 rounded-lg bg-white p-6 shadow-xl text-center">
          <h2 className="text-2xl text-red-600">{t('invalidResetToken')}</h2>
          <p className="text-gray-600">{t('invalidResetTokenDescription')}</p>
          <Link href='/forgot-password'>
            <Button type="primary" block>
              {t('requestNewResetLink')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center flex-row mb-6">
          <Link href="/" className='flex items-center'>
            <Image src={logo} className="ml-1" alt="FiveChat logo" width={32} height={32} />
            <Fivechat className="ml-1" alt="FiveChat text" width={156} height={39} />
          </Link>
        </div>
        <div className="w-full max-w-sm space-y-6 rounded-lg bg-white p-6 shadow-xl text-center">
          <h2 className="text-2xl text-green-600">{t('passwordResetSuccess')}</h2>
          <p className="text-gray-600">{t('passwordResetSuccessDescription')}</p>
          <Link href='/login'>
            <Button type="primary" block>
              {t('loginWithNewPassword')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-slate-50">
      <div className="flex items-center flex-row mb-6">
        <Link href="/" className='flex items-center'>
          <Image src={logo} className="ml-1" alt="FiveChat logo" width={32} height={32} />
          <Fivechat className="ml-1" alt="FiveChat text" width={156} height={39} />
        </Link>
      </div>
      <div className="w-full max-w-sm space-y-6 rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-center text-2xl">{t('resetPassword')}</h2>
        <p className="text-center text-gray-600">{t('resetPasswordDescription')}</p>
        {error && <Alert message={error} type="error" />}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark='optional'
        >
          <Form.Item
            name="password"
            label={<span className="font-medium">{t('newPassword')}</span>}
            rules={[{ required: true, message: t('passwordNotice') }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="repeatPassword"
            label={<span className="font-medium">{t('repeatPassword')}</span>}
            rules={[{ required: true, message: t('passwordNotice') }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
            >
              {t('resetPassword')}
            </Button>
          </Form.Item>
          <div className='text-center'>
            <Link href='/login'>
              <Button
                type='link'
                className='text-sm text-gray-400'
                style={{ 'padding': '0' }}
              >{t('backToLogin')}</Button>
            </Link>
          </div>
        </Form>
      </div>
    </div>
  );
}
