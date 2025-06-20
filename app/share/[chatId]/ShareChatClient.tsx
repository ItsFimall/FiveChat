'use client';

import React, { useState, useEffect } from 'react';
import { Input, Button, Spin, Result, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { Message } from '@/types/llm';
import MessageItem from '@/app/components/MessageItem';
import { useTranslations } from 'next-intl';

interface ShareChatClientProps {
  chatId: string;
  chatTitle: string;
  hasPassword?: boolean;
}

const ShareChatClient = ({ chatId, chatTitle, hasPassword }: ShareChatClientProps) => {
  const t = useTranslations('Chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(!hasPassword);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(!hasPassword);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !hasPassword) {
      const fetchChatContent = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/share/${chatId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: '' }),
          });
          if (response.ok) {
            const data = await response.json();
            setMessages(data.messages || []);
          } else {
            setError('Failed to fetch chat content.');
          }
        } catch (err) {
          setError('An unexpected error occurred.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchChatContent();
    }
  }, [isAuthenticated, hasPassword, chatId]);

  const handlePasswordSubmit = async () => {
    if (!password) {
      message.error('Please enter the password.');
      return;
    }
    setIsVerifying(true);
    try {
      const response = await fetch(`/api/share/${chatId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setIsAuthenticated(true);
      } else if (response.status === 403) {
        message.error('Incorrect password.');
      } else {
        message.error('Failed to verify password.');
      }
    } catch (err) {
      message.error('An error occurred during verification.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>;
  }

  if (error) {
    return <Result status="error" title={error} />;
  }

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '20px' }}>
        <h2>{t('passwordRequired')}</h2>
        <Input.Password
          placeholder={t('enterPassword')}
          prefix={<LockOutlined />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onPressEnter={handlePasswordSubmit}
          style={{ width: 300 }}
        />
        <Button type="primary" onClick={handlePasswordSubmit} loading={isVerifying}>
          {t('submit')}
        </Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>{chatTitle}</h1>
      <div>
        {messages.map((msg, index) => (
          <MessageItem
            key={msg.id || index}
            item={msg}
            index={index}
            isConsecutive={false}
            role={msg.role as 'assistant' | 'user' | 'system'}
            retryMessage={() => {}}
            deleteMessage={() => {}}
          />
        ))}
      </div>
    </div>
  );
};

export default ShareChatClient; 