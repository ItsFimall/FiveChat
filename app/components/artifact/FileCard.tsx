'use client';
import React, { useEffect, useState } from 'react';
import { Card } from 'antd';
import usePreviewSidebarStore, { ContentType } from '@/app/store/previewSidebar';
import clsx from 'clsx';

interface FileCardProps {
  content: string;
  cardId: string;
  contentType: ContentType;
}

const FileCard: React.FC<FileCardProps> = ({ content, cardId, contentType }) => {
  const {
    setIsOpen,
    setContent,
    setActiveTab,
    activeCardId,
    setActiveCardId
  } = usePreviewSidebarStore();
  const [cleanedContent, setCleanedContent] = useState(content);
  const isActive = activeCardId === cardId;

  // 清理内容，确保它是有效的
  useEffect(() => {
    let cleaned = content;

    // 针对SVG内容进行特殊处理
    if (contentType === 'svg') {
      // 移除可能的 HTML 标签包装，提取SVG标签
      const svgRegex = /(<svg[\s\S]*?<\/svg>)/;
      const match = svgRegex.exec(cleaned);
      if (match) {
        cleaned = match[1];
      }
    }

    setCleanedContent(cleaned);
  }, [content, contentType]);

  const handlePreviewClick = () => {
    setContent(cleanedContent, contentType);
    setActiveTab('preview');
    setIsOpen(true);
    setActiveCardId(cardId);
  };

  return (
    <Card
      className={clsx(
        "my-4 border",
        isActive
          ? "!border-blue-300"
          : "border-gray-200 hover:border-blue-300"
      )}
      styles={{ body: { padding: '12px' } }}
    >
      <div className="flex items-center justify-between cursor-pointer pointer-events-auto" onClick={handlePreviewClick}>
        <div className="flex items-center">
          <div className={clsx(
            "w-8 h-8 rounded-md flex items-center justify-center mr-3 transition-colors",
          )}>
            {contentType === 'svg' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <path d="M4 12s1.5 1 4 1 5-2 8-2 4 1 4 1"></path>
                <path d="M4 18s1.5 1 4 1 5-2 8-2 4 1 4 1"></path>
                <line x1="4" y1="15" x2="4" y2="15"></line>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <line x1="10" y1="9" x2="8" y2="9"></line>
              </svg>
            )}
          </div>
          <div>
            <div className="font-medium">
              {contentType === 'svg' ? 'SVG 图像' : 'HTML 代码'}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default FileCard;
