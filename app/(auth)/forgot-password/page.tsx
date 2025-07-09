"use client";

import { useState } from "react";
import Image from "next/image";
import Link from 'next/link';
import { Form, Input, Button, Alert, message } from 'antd';
import logo from "@/app/images/logo.png";
import Fivechat from "@/app/images/fivechat.svg";
import { useTranslations } from 'next-intl';
import { requestPasswordReset } from '../actions';

interface ForgotPasswordFormValues {
  usernameOrEmail: string;
  adminCode?: string;
}

export default function ForgotPasswordPage() {
  const t = useTranslations('Auth');
  const [form] = Form.useForm<ForgotPasswordFormValues>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(values: ForgotPasswordFormValues) {
    setLoading(true);
    setError("");
    
    try {
      const result = await requestPasswordReset(values.usernameOrEmail, values.adminCode);
      if (result.status === 'success') {
        setSuccess(true);
        message.success(t('passwordResetEmailSent'));
      } else {
        setError(result.message || t('passwordResetFail'));
      }
    } catch (err: any) {
      setError(err.message || t('passwordResetFail'));
    }
    
    setLoading(false);
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
          <h2 className="text-2xl">{t('passwordResetSent')}</h2>
          <p className="text-gray-600">{t('passwordResetSentDescription')}</p>
          <Link href='/login'>
            <Button type="primary" block>
              {t('backToLogin')}
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
        <h2 className="text-center text-2xl">{t('forgotPassword')}</h2>
        <p className="text-center text-gray-600">{t('forgotPasswordDescription')}</p>
        {error && <Alert message={error} type="error" />}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark='optional'
        >
          <Form.Item
            name="usernameOrEmail"
            label={<span className="font-medium">{t('usernameOrEmail')}</span>}
            validateTrigger='onBlur'
            rules={[{ required: true, message: t('usernameOrEmailNotice') }]}
          >
            <Input placeholder={t('usernameOrEmailPlaceholder')} />
          </Form.Item>
          <Form.Item
            name="adminCode"
            label={<span className="font-medium">Admin Code ({t('optional')})</span>}
          >
            <Input.Password placeholder={t('adminCodePlaceholder')} />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
            >
              {t('sendResetLink')}
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
