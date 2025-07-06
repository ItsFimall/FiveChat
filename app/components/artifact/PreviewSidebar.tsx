'use client';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Segmented, Button, message } from 'antd';
import { CloseOutlined, CodeOutlined, EyeOutlined, DownloadOutlined, CopyOutlined } from '@ant-design/icons';
import usePreviewSidebarStore from '@/app/store/previewSidebar';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import clsx from 'clsx';

const PreviewSidebar: React.FC = () => {
  const {
    isOpen,
    content,
    contentType,
    activeTab,
    width,
    setIsOpen,
    setActiveTab,
    setWidth,
    resetActiveCard
  } = usePreviewSidebarStore();
  const [renderedContent, setRenderedContent] = useState<string>('');
  const [messageApi, contextHolder] = message.useMessage();
  const [isDragging, setIsDragging] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const dragStartXRef = useRef<number>(0);
  const dragStartWidthRef = useRef<number>(0);

  // 添加自适应 iframe 高度的函数，使用 useCallback 避免不必要的重新创建
  const resizeIframeToContent = useCallback(() => {
    if (!iframeRef.current || !iframeRef.current.contentWindow || contentType !== 'html') return;

    try {
      // 获取 iframe 内容的高度
      const doc = iframeRef.current.contentWindow.document;

      // 确保文档已经完全加载
      if (!doc || !doc.body) {
        // 如果文档还没准备好，延迟再试
        setTimeout(() => resizeIframeToContent(), 50);
        return;
      }
    } catch (e) {
      console.error('调整 iframe 高度失败:', e);
      // 出错时设置一个默认高度，确保用户至少能看到一些内容
      if (iframeRef.current) {
        iframeRef.current.style.height = '300px';
      }
    }
  }, [contentType]);

  useEffect(() => {
    // 当 content 变化时，更新渲染的内容
    if (content) {
      setRenderedContent(content);

      // 当内容更新时，如果当前是预览模式且侧边栏打开，确保在下一个渲染周期后调整 iframe 大小
      if (activeTab === 'preview' && isOpen && contentType === 'html') {
        // 使用两层 setTimeout 确保 DOM 完全更新后再调整大小
        setTimeout(() => {
          setTimeout(resizeIframeToContent, 50);
        }, 0);
      }
    }
  }, [content, activeTab, isOpen, contentType, resizeIframeToContent]);

  // 监听窗口大小变化，重新调整 iframe 大小
  useEffect(() => {
    if (!isOpen || activeTab !== 'preview' || contentType !== 'html') return;

    const handleResize = () => {
      // 延迟执行以确保 DOM 已更新
      setTimeout(resizeIframeToContent, 100);
    };

    window.addEventListener('resize', handleResize);

    // 初始调整
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, activeTab, contentType, resizeIframeToContent]);

  // 当切换到预览标签时，调整 iframe 大小
  useEffect(() => {
    if (activeTab === 'preview' && isOpen && contentType === 'html') {
      // 延迟执行以确保 DOM 已更新
      setTimeout(resizeIframeToContent, 100);
    }
  }, [activeTab, isOpen, contentType, resizeIframeToContent]);

  // 监听 iframe 发送的消息，确保内容加载完成后调整大小
  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      if (event.data === 'iframe-loaded' && activeTab === 'preview' && isOpen && contentType === 'html') {
        // 确保在 iframe 内容完全加载后调整大小
        setTimeout(resizeIframeToContent, 50);
      }
    };

    window.addEventListener('message', handleIframeMessage);

    return () => {
      window.removeEventListener('message', handleIframeMessage);
    };
  }, [activeTab, isOpen, contentType, resizeIframeToContent]);

  // 确保iframe在拖拽状态变化时正确更新样式
  useEffect(() => {
    if (iframeRef.current) {
      if (isDragging && activeTab === 'preview' && contentType === 'html') {
        iframeRef.current.style.pointerEvents = 'none';
      } else {
        iframeRef.current.style.pointerEvents = 'auto';
      }
    }
  }, [isDragging, activeTab, contentType]);

  // 组件卸载时清理iframe样式
  useEffect(() => {
    const iframe = iframeRef.current;
    return () => {
      if (iframe) {
        iframe.style.pointerEvents = 'auto';
      }
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    resetActiveCard(); // 关闭侧边栏时清除高亮状态
  };

  const handleDownload = () => {
    if (!content) return;

    const fileType = contentType === 'svg' ? 'image/svg+xml' : 'text/html';
    const fileExt = contentType === 'svg' ? 'svg' : 'html';

    const blob = new Blob([content], { type: fileType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `download.${fileExt}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    messageApi.success(`${contentType?.toUpperCase()} 已下载`);
  };

  const handleCopy = async () => {
    if (!content) return;

    try {
      await navigator.clipboard.writeText(content);
      messageApi.success(`${contentType?.toUpperCase()} 代码已复制到剪贴板`);
    } catch (err) {
      messageApi.error('复制失败，请重试');
      console.error('复制失败:', err);
    }
  };

  // 拖拽处理函数 - iframe兼容优化版本
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = width;

    let animationFrameId: number | null = null;
    let lastUpdateTime = 0;
    const throttleDelay = 16; // 约60fps

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const now = Date.now();
      if (now - lastUpdateTime < throttleDelay) {
        return;
      }
      lastUpdateTime = now;

      // 使用 requestAnimationFrame 来优化性能
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        const deltaX = dragStartXRef.current - e.clientX; // 向左拖拽为正值
        const newWidth = dragStartWidthRef.current + deltaX;

        // 提前计算限制，避免在 store 中重复计算
        const minWidth = 320; // 增加最小宽度以确保按钮可见
        const maxWidth = Math.floor(window.innerWidth * 0.8);
        const clampedWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));

        setWidth(clampedWidth);
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // 立即设置 isDragging 为 false，恢复iframe交互
      setIsDragging(false);

      // 取消待处理的动画帧
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      // 移除全局事件监听器
      document.removeEventListener('mousemove', handleMouseMove, { capture: true });
      document.removeEventListener('mouseup', handleMouseUp, { capture: true });

      // 恢复默认样式
      document.body.style.userSelect = '';
      document.body.style.cursor = '';

      // 确保iframe恢复正常交互
      if (iframeRef.current) {
        iframeRef.current.style.pointerEvents = 'auto';
      }
    };

    // 添加全局鼠标事件监听器，使用 capture 模式确保优先捕获
    document.addEventListener('mousemove', handleMouseMove, { capture: true });
    document.addEventListener('mouseup', handleMouseUp, { capture: true });

    // 防止文本选择
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    // 立即禁用iframe的鼠标事件，防止干扰拖拽
    if (iframeRef.current && activeTab === 'preview' && contentType === 'html') {
      iframeRef.current.style.pointerEvents = 'none';
    }
  }, [width, setWidth, activeTab, contentType]);

  // 根据内容类型确定语言
  const getLanguage = () => {
    return contentType === 'svg' ? 'xml' : 'html';
  };

  return (
    <>
      {contextHolder}
      <div
        className={clsx(
          'fixed top-0 right-0 h-full bg-white border-l border-gray-200 shadow-lg z-40 flex',
          {
            'opacity-0 pointer-events-none translate-x-full': !isOpen,
            'opacity-100 translate-x-0': isOpen,
          }
        )}
        style={{
          width: isOpen ? `${width}px` : '0',
          minWidth: isOpen ? '320px' : '0',
          transition: isDragging ? 'none' : 'width 0.2s ease-out, opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
        }}
      >
        {/* 拖拽手柄 */}
        {isOpen && (
          <div
            className={clsx(
              'absolute left-0 top-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 transition-colors duration-200 z-10',
              'flex items-center justify-center group',
              {
                'bg-blue-500': isDragging,
              }
            )}
            onMouseDown={handleMouseDown}
            style={{ left: '-2px' }}
          >
            <div className="w-0.5 h-8 bg-gray-400 group-hover:bg-white transition-colors duration-200" />
          </div>
        )}
        {/* 拖拽时的全局覆盖层，防止iframe捕获鼠标事件 */}
        {isDragging && (
          <div
            className="absolute inset-0 cursor-col-resize"
            style={{
              zIndex: 50,
              left: '4px', // 避免覆盖拖拽手柄
              backgroundColor: 'transparent',
              pointerEvents: 'all', // 关键：确保能够捕获鼠标事件
            }}
            onMouseMove={(e) => {
              // 防止事件冒泡，确保拖拽事件正常工作
              e.preventDefault();
              e.stopPropagation();
            }}
            onMouseUp={(e) => {
              // 防止事件冒泡
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        )}
        <div className="h-full flex flex-col flex-1 relative" style={{ minWidth: 0 }}>
          {/* 固定头部 */}
          <div
            className="flex justify-between items-center p-2 border-b bg-white relative z-20"
            style={{
              minWidth: '320px',
              flexShrink: 0,
            }}
          >
            <div className="flex-shrink-0 mr-2 overflow-hidden">
              <Segmented
                value={activeTab}
                onChange={(value) => setActiveTab(value as 'code' | 'preview')}
                options={[
                  {
                    value: 'preview',
                    icon: <EyeOutlined />,
                    label: <span className="hidden sm:inline">预览</span>
                  },
                  {
                    value: 'code',
                    icon: <CodeOutlined />,
                    label: <span className="hidden sm:inline">代码</span>
                  }
                ]}
              />
            </div>
            <div
              className="flex items-center space-x-1 flex-shrink-0"
              style={{
                minWidth: 'fit-content',
                position: 'relative',
                zIndex: 21,
              }}
            >
              <Button
                type="text"
                icon={<DownloadOutlined />}
                onClick={handleDownload}
                aria-label={`下载 ${contentType?.toUpperCase()}`}
                className="flex-shrink-0"
              >
                <span className="hidden sm:inline">下载</span>
              </Button>
              <Button
                type="text"
                icon={<CopyOutlined />}
                onClick={handleCopy}
                aria-label={`复制 ${contentType?.toUpperCase()} 代码`}
                className="flex-shrink-0"
              >
                <span className="hidden sm:inline">复制</span>
              </Button>
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={handleClose}
                aria-label="关闭预览"
                className="flex-shrink-0"
                style={{ minWidth: '32px' }}
              />
            </div>
          </div>
          {/* 内容区域 */}
          <div className="flex-grow relative" style={{ minHeight: 0 }}>
            {activeTab === 'preview' ? (
              <div className="absolute inset-0 flex justify-center items-center p-4 overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {renderedContent && contentType === 'svg' && (
                  <div
                    className="w-full h-full flex justify-center items-center p-4"
                    dangerouslySetInnerHTML={{ __html: renderedContent }}
                  />
                )}
                {renderedContent && contentType === 'html' && (
                  <div className="relative w-full h-full">
                    <iframe
                      ref={iframeRef}
                      className="w-full h-full border-0"
                      title="HTML Preview"
                      sandbox="allow-same-origin allow-scripts"
                      srcDoc={renderedContent}
                      onLoad={resizeIframeToContent}
                      style={{
                        pointerEvents: isDragging ? 'none' : 'auto', // 拖拽时禁用iframe的鼠标事件
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col">
                <div
                  className="flex-1 p-2 overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                  style={{
                    minHeight: 0,
                    contain: 'layout style paint',
                  }}
                >
                  <SyntaxHighlighter
                    language={getLanguage()}
                    style={tomorrow}
                    customStyle={{
                      backgroundColor: '#f9fafb',
                      borderRadius: '0.375rem',
                    }}
                    showLineNumbers={true}
                  >
                    {content || ''}
                  </SyntaxHighlighter>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PreviewSidebar;
