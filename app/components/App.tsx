'use client';
import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from "@/app/components/Sidebar";
import { LoginModalProvider } from '@/app/contexts/loginModalContext';
import LoginModal from '@/app/components/loginModal';
import useSidebarCollapsedStore from '@/app/store/sidebarCollapsed';
import usePreviewSidebarStore from '@/app/store/previewSidebar';
import PreviewSidebar from '@/app/components/artifact/PreviewSidebar';
import SpinLoading from '@/app/components/loading/SpinLoading';
import clsx from 'clsx';

const App: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasInstalled, setHasInstalled] = useState(false);
  const { isSidebarCollapsed, setIsSidebarCollapsed } = useSidebarCollapsedStore();
  const { isOpen: isPreviewSidebarOpen, width: previewSidebarWidth, setIsOpen: setPreviewSidebarOpen, resetActiveCard } = usePreviewSidebarStore();
  const pathname = usePathname();
  const [previousPath, setPreviousPath] = useState(pathname);

  // 监听路径变化，当对话切换时关闭预览侧边栏
  useEffect(() => {
    // 检查是否是对话切换
    const currentChatId = pathname.split("/").pop() || '';
    const previousChatId = previousPath.split("/").pop() || '';

    // 如果对话ID变化且侧边栏处于打开状态，则关闭侧边栏并清除高亮
    if (currentChatId !== previousChatId && isPreviewSidebarOpen) {
      setPreviewSidebarOpen(false);
      resetActiveCard();
    }

    setPreviousPath(pathname);
  }, [pathname, previousPath, isPreviewSidebarOpen, setPreviewSidebarOpen, resetActiveCard]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) { // 768 是常见的移动端断点宽度
        setIsSidebarCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [setIsSidebarCollapsed]);

  useEffect(() => {
    async function initData() {
      localStorage.setItem('hive_chat_app_status', 'installed');
      localStorage.setItem('hive_chat_app_version', '1.0.0');
    }
    const status = localStorage.getItem('hive_chat_app_status');
    if (status !== 'installed') {
      initData().then(() => {
        setHasInstalled(true);
      });
    } else {
      setHasInstalled(true);
    }
  }, []);

  if (!hasInstalled) {
    return (
      <main className="h-full flex justify-center items-center">
        <SpinLoading />
        <span className='ml-2 text-gray-600'>Loading ...</span>
      </main>
    )
  }
  return (
    <LoginModalProvider>
      <div className="flex h-dvh w-screen overflow-hidden">
        <Sidebar />
        <div
          className={clsx(
            "h-full w-0 relative grow flex flex-col transition-all duration-300 ease-in-out overflow-y-auto",
            {
              "md:w-full md:-ml-72": isSidebarCollapsed,
              "w-full": isSidebarCollapsed,
            }
          )}
          style={{
            width: '100%',
            paddingRight: isPreviewSidebarOpen ? `${previewSidebarWidth}px` : '0',
            transition: 'padding-right 0.1s ease-out', // 添加平滑过渡
          }}
        >
          {children}
        </div>
        <PreviewSidebar />
      </div>
      <LoginModal />
    </LoginModalProvider>
  )
}

export default App
