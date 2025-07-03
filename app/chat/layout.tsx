'use client';
import App from "@/app/components/App";
import ChatPrepare from "@/app/components/ChatPrepare";
import { App as AntdApp } from 'antd';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <div className="flex flex-col h-dvh">
      <ChatPrepare />
      <AntdApp>
        <App>{children}</App>
      </AntdApp>
    </div>
  )
}