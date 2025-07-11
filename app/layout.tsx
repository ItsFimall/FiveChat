import React from 'react';
import type { Metadata } from "next";
import type { Viewport } from 'next'
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { SessionProvider } from 'next-auth/react';
import "./globals.css";

export const metadata: Metadata = {
  title: "FiveChat - Chatbot for Team",
  description: "同时和多个机器人聊天，最快获取最佳结果",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <SessionProvider>
            <AntdRegistry>
              <ConfigProvider
                theme={{
                  token: {
                    colorPrimary: '#000000',
                  },
                }}
              >
                {children}
              </ConfigProvider>
            </AntdRegistry>
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
