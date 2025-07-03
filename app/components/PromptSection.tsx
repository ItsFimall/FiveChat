'use client'
import React, { useRef, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import MarkdownRender from '@/app/components/Markdown';

const PromptSection = React.memo(({ prompt }: { prompt: string }) => {
  const t = useTranslations('Chat');
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [showExpand, setShowExpand] = useState(false);
  const [maxHeight, setMaxHeight] = useState('400px');

  useEffect(() => {
    if (contentRef.current) {
      setShowExpand(contentRef.current.scrollHeight > 400);
    }
  }, [prompt]);

  useEffect(() => {
    if (expanded && contentRef.current) {
      setMaxHeight(`${contentRef.current.scrollHeight}px`);
      // 动画结束后设为 none，内容高度自适应
      const timer = setTimeout(() => setMaxHeight('none'), 300);
      return () => clearTimeout(timer);
    } else {
      setMaxHeight('400px');
    }
  }, [expanded, prompt]);

  return (
    <div className="flex container mx-auto max-w-screen-md mb-4 w-full flex-col justify-center items-center">
      <div className='flex max-w-3xl text-justify w-full my-0 pt-0 pb-1 flex-col pr-4 pl-4'>
        <div className='flex flex-row items-center mb-2'>
          <span className='text-2xl leading-8'>✨</span>
          <span className='text-sm leading-8 ml-1 font-medium'>{t('prompt')}</span>
        </div>
        <div
          ref={contentRef}
          className={`w-fit p-6 markdown-body !min-w-4 !bg-gray-100 text-base rounded-xl ml-10 transition-all duration-300 overflow-hidden relative`}
          style={{ maxHeight, transition: 'max-height 0.3s' }}
        >
          <MarkdownRender content={prompt} />
          {showExpand && !expanded && (
            <div
              className="absolute left-0 bottom-0 w-full h-16 pointer-events-none"
              style={{
                background: 'linear-gradient(to top, rgba(255,255,255,0.8), rgba(255,255,255,0))',
                borderBottomLeftRadius: '0.75rem',
                borderBottomRightRadius: '0.75rem',
              }}
            />
          )}
          {showExpand && (
            <button
              className="absolute left-1/2 rounded-full -translate-x-1/2 bottom-2 z-10 px-4 py-1 text-sm bg-gray-800 bg-opacity-60 text-white hover:bg-opacity-70 transition-colors"
              onClick={() => setExpanded((prev) => !prev)}
              style={{ pointerEvents: 'auto' }}
            >
              {expanded ? <UpOutlined /> : <DownOutlined />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

PromptSection.displayName = 'PromptSection';

export default PromptSection; 