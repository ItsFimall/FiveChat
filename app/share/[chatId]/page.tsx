'use client'

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Input, Button, Spin, Result, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { ChatType, MessageType } from '@/types/llm';
import MessageItem from '@/app/components/MessageItem';
import { useTranslations } from 'next-intl';

type ChatInfo = Omit<ChatType, 'messages'> & { hasPassword?: boolean };

const SharedChatPage = () => {
    const t = useTranslations('Chat');
    const params = useParams();
    const chatId = params.chatId as string;

    const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
    const [messages, setMessages] = useState<MessageType[]>([]);
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);


    useEffect(() => {
        if (!chatId) return;

        const fetchChatInfo = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(`/api/share/${chatId}`);
                if (response.ok) {
                    const data = await response.json();
                    setChatInfo(data);
                    if (!data.hasPassword) {
                        setIsAuthenticated(true);
                    }
                } else {
                    const errorText = await response.text();
                    setError(errorText || 'Failed to fetch chat information.');
                }
            } catch (err) {
                setError('An unexpected error occurred.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchChatInfo();
    }, [chatId]);

    useEffect(() => {
        if (isAuthenticated && chatInfo && !chatInfo.hasPassword) {
            const fetchChatContent = async () => {
                setIsLoading(true);
                try {
                    const response = await fetch(`/api/share/${chatId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ password: '' }), // No password needed if already authenticated
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
            }
            fetchChatContent();
        }
    }, [isAuthenticated, chatInfo, chatId]);

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
            }
            else {
                message.error('Failed to verify password.');
            }
        } catch (err) {
            message.error('An error occurred during verification.');
        } finally {
            setIsVerifying(false);
        }
    };

    if (isLoading && !chatInfo) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>;
    }

    if (error) {
        return <Result status="error" title={error} />;
    }

    if (!chatInfo) {
        return <Result status="404" title="Not Found" subTitle="Sorry, the chat you visited does not exist." />;
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
             <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>{chatInfo.title}</h1>
            <div>
                {messages.map((msg, index) => (
                    <MessageItem
                        key={msg.id || index}
                        message={{...msg}}
                        isLastMessage={index === messages.length - 1}
                        onRetry={() => {}}
                        onDelete={() => {}}
                    />
                ))}
            </div>
        </div>
    );
};

export default SharedChatPage; 