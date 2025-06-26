'use client';
import React, { useState } from 'react'
import { EmojiPicker } from '@/app/components/EmojiPicker';
import { Input, Form, message } from "antd";
import Link from 'next/link';
import { Button } from 'antd';
import { useRouter } from 'next/navigation';
import { LeftOutlined } from '@ant-design/icons';
import { addBotInServer } from '@/app/chat/actions/bot';
import { useTranslations } from 'next-intl';

const CreateBot = () => {
  const t = useTranslations('Chat');
  const [selectedEmoji, setSelectedEmoji] = useState('🤖');
  const [isPending, setIsPending] = useState(false);
  const [form] = Form.useForm();
  const router = useRouter();
  type FormValues = {
    avatar: string;
    name: string;
    desc: string;
    prompt: string;
  }
  const onFinish = async (values: FormValues) => {
    setIsPending(true);
    try {
      const result = await addBotInServer({
        title: values.name,
        avatar: selectedEmoji,
        desc: values.desc,
        prompt: values.prompt,
        avatarType: 'emoji',
      });
      if (result.status === 'success') {
        message.success('智能体创建成功！');
        router.push(`/chat/bot/${result.data?.id}`)
      } else {
        message.error(result.message || '创建失败，请稍后重试');
      }
    } catch (error) {
      console.error('Failed to create bot:', error);
      message.error('创建失败，请稍后重试');
    } finally {
      setIsPending(false);
    }
  };
  return (
    <div className="container max-w-4xl mx-auto items-center flex flex-col p-4">
      <div className='w-full'>
        <Link href='/chat/bot/discover'>
          <Button type='link' size='small' icon={<LeftOutlined />}>{t('back')}</Button>
        </Link>
      </div>

      <h1 className='text-xl mt-4'>{t('createBot')}</h1>
      <p className='text-gray-400 mb-8'>创建的智能体仅自己查看和使用</p>
      <EmojiPicker
        currentEmoji={selectedEmoji}
        onEmojiSelect={(emoji) => setSelectedEmoji(emoji)}
      />
      <Form
        layout="vertical"
        form={form}
        onFinish={onFinish}
        className='w-full'
      >
        <Form.Item
          label={<span className='font-medium'>{t('botName')}</span>}
          name='name'
          rules={[
            { required: true, message: '请输入智能体名称' },
            { min: 2, message: '智能体名称至少需要2个字符' },
            { max: 50, message: '智能体名称不能超过50个字符' },
            { pattern: /^[a-zA-Z0-9\u4e00-\u9fa5\s\-_]+$/, message: '智能体名称只能包含中英文、数字、空格、横线和下划线' }
          ]}
        >
          <Input size="large" placeholder={t('botNameNotice')} />
        </Form.Item>

        <Form.Item label={<span className='font-medium'>{t('botDesc')}</span>} name='desc'>
          <Input.TextArea size="large" placeholder={t('botDescNotice')} />
        </Form.Item>

        <Form.Item label={<span className='font-medium'>{t('prompt')}</span>} name='prompt'>
          <Input.TextArea
            size="large"
            autoSize={{ minRows: 5, maxRows: 12 }}
            placeholder={t('promptNotice')} />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            size='large'
            shape='round'
            className='w-full'
            htmlType="submit"
            loading={isPending}
          >
            {t('createBot')}
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}

export default CreateBot