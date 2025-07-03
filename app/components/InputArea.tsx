'use client'
import React, { useState, memo, useCallback, useRef, useMemo } from 'react';
import { Button, Tooltip, Popover, Modal, message } from "antd";
import { PictureOutlined, ClearOutlined, FieldTimeOutlined, GlobalOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { Square } from '@icon-park/react';
import Eraser from '@/app/images/eraser.svg';
import McpIcon from "@/app/images/mcp.svg";
import ImageGeneration from "@/app/images/imageGeneration.svg";
import HistorySettings from '@/app/components/HistorySettings';
import McpServerSelect from '@/app/components/McpServerSelect';
import ImagePreviewArea from '@/app/components/ImagePreviewArea';
import useImageUpload from '@/app/hooks/chat/useImageUpload';
import useMcpServerStore from '@/app/store/mcp';
import useGlobalConfigStore from '@/app/store/globalConfig';
import useChatStore from '@/app/store/chat';
import { useTranslations } from 'next-intl';
import { fileToBase64 } from '@/app/utils';
import useChatContext from '@/app/context/ChatContext';

interface ChatInputProps {
  responseStatus: "done" | "pending";
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: (message: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
}

const ChatInput = memo(({
  responseStatus,
  onPaste,
  onSubmit,
  inputRef
}: ChatInputProps) => {
  const t = useTranslations('Chat');
  const [inputValue, setInputValue] = useState('');

  // Expose setInputValue to parent through ref
  React.useEffect(() => {
    if (inputRef.current) {
      // @ts-ignore - Adding custom property to the ref
      inputRef.current.clearInputValue = () => setInputValue('');
    }
  }, [inputRef]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;

    if (e.key === 'Enter') {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        // Command/Ctrl + Enter: 插入换行
        e.preventDefault();
        const target = e.currentTarget;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const newValue = target.value.substring(0, start) + '\n' + target.value.substring(end);
        setInputValue(newValue);
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = start + 1;
        }, 0);
        return;
      }

      e.preventDefault();
      if (inputValue.trim() === '' || responseStatus === 'pending') return;
      onSubmit(inputValue);
      setInputValue('');
    }
  }, [inputValue, responseStatus, onSubmit]);

  return (
    <div className='flex h-full max-w-3xl w-full relative pl-2 pr-2 pt-2'>
      <textarea
        ref={inputRef}
        onChange={handleInputChange}
        value={inputValue}
        autoFocus={true}
        onPaste={onPaste}
        onKeyDown={handleKeyDown}
        placeholder={t('inputPlaceholder')}
        className='m-2 w-full border-none outline-none resize-none scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-rounded-full scrollbar-thumb-gray-300 scrollbar-track-gray-100 scrollbar-rounded'
        style={{ border: 'none', resize: 'none', marginBottom: '0', scrollbarColor: '#eaeaea transparent' }}
      />


    </div>
  );
});

ChatInput.displayName = 'ChatInput';

const InputArea = () => {
  const t = useTranslations('Chat');
  const {
    chat_id,
    responseStatus,
    historyType,
    historyCount,
    currentModel,
    handleSubmit,
    addBreak,
    stopChat,
    clearHistory
  } = useChatContext();

  const [historySettingOpen, setHistorySettingOpen] = useState(false);
  const [mcpServerSelectOpen, setMcpServerSelectOpen] = useState(false);
  const { hasUseMcp, hasMcpSelected } = useMcpServerStore();
  const { searchEnable: remoteSearchEnable } = useGlobalConfigStore();
  const { webSearchEnabled, setWebSearchEnabled, builtInImageGen, setBuiltInImageGen } = useChatStore();
  const { uploadedImages, maxImages, handleImageUpload, removeImage, setUploadedImages } = useImageUpload();

  const inputRef = useRef<HTMLTextAreaElement & { clearInputValue?: () => void }>(null);

  const handleHistorySettingOpenChange = useCallback((open: boolean) => {
    setHistorySettingOpen(open);
  }, []);

  const [modal, contextHolder] = Modal.useModal();

  const handleClearHistory = useCallback((): void => {
    modal.confirm({
      title: t('confirmClearHistoryMessage'),
      content: t('clearHistoryMessageNotice'),
      okText: t('confirm'),
      cancelText: t('cancel'),
      onOk() {
        clearHistory();
      },
      onCancel() { },
    });
  }, [modal, t, clearHistory]);

  const handleSubmitMessage = useCallback(async (message: string) => {
    let messageContent;
    if (uploadedImages.length > 0) {
      const imageMessages = await Promise.all(uploadedImages
        .filter(img => img.file)
        .map(async (img) => ({
          type: 'image' as const,
          mimeType: img.file!.type,
          data: await fileToBase64(img.file!)
        })));

      messageContent = [
        { type: 'text' as const, text: message },
        ...imageMessages
      ];
    } else {
      messageContent = message;
    }

    handleSubmit(messageContent).then(() => {
      setUploadedImages([]);
    });
  }, [uploadedImages, handleSubmit, setUploadedImages]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData.files.length > 0) {
      e.preventDefault();

      const files = Array.from(e.clipboardData.files);
      const imageFiles = files.filter(file => file.type.startsWith('image/'));

      if (imageFiles.length > 0) {
        if (!currentModel.supportVision) {
          message.warning(t('notSupportVision'));
          return;
        }
        if (uploadedImages.length + imageFiles.length > maxImages) {
          message.warning(t('maxImageCount', { maxImages: maxImages }));
          return;
        }

        for (const file of imageFiles) {
          const url = URL.createObjectURL(file);
          handleImageUpload(file, url);
        }
      }
    }
  }, [currentModel, t, uploadedImages, maxImages, handleImageUpload]);

  const handleClearMemory = useCallback(() => {
    addBreak();
  }, [addBreak]);

  // WebSearchButton component
  const WebSearchButton = useMemo(() => {
    if (!remoteSearchEnable) return null;

    if (webSearchEnabled) {
      return (
        <Button
          type="text"
          size="small"
          className="mx-1"
          onClick={() => setWebSearchEnabled(!webSearchEnabled)}
          color="primary"
          variant="filled"
        >
          <GlobalOutlined style={{ width: '12px', height: '12px' }} />
          <span className="text-xs -ml-1 hidden sm:inline">{t('webSearch')}</span>
        </Button>
      );
    } else {
      return (
        <Button
          type="text"
          size="small"
          className="mx-1"
          onClick={() => setWebSearchEnabled(!webSearchEnabled)}
        >
          <GlobalOutlined style={{ color: 'gray', width: '12px', height: '12px' }} />
          <span className="text-xs -ml-1 text-gray-500 hidden sm:inline">{t('webSearch')}</span>
        </Button>
      );
    }
  }, [remoteSearchEnable, webSearchEnabled, setWebSearchEnabled, t]);

  return (
    <>
      <ImagePreviewArea
        uploadedImages={uploadedImages}
        removeImage={removeImage}
      />
      <div className="flex h-36 pb-3 container bg-white mx-auto justify-center pt-1 px-2">
        {contextHolder}
        <div className='flex mx-2 mt-0 h-full flex-col w-full border max-w-3xl border-gray-200 rounded-2xl'>
          <ChatInput
            responseStatus={responseStatus}
            onPaste={handlePaste}
            onSubmit={handleSubmitMessage}
            inputRef={inputRef}
          />
          <div className='flex flex-row justify-between h-10 max-w-3xl w-full relative p-2'>
            <div className='flex flex-row'>
              {currentModel.supportVision && (
                <Tooltip title={t('image')} placement='bottom' arrow={false}>
                  <Button type="text" size='small' onClick={() => handleImageUpload()}>
                    <PictureOutlined style={{ color: 'gray' }} />
                    <span className='text-xs -ml-1 text-gray-500 hidden sm:inline'>{t('image')}</span>
                  </Button>
                </Tooltip>
              )}

              {!currentModel.supportVision && (
                <Tooltip title={t('unsupportImage')} placement='bottom' arrow={false}>
                  <Button type="text" size='small' disabled>
                    <PictureOutlined style={{ color: '#ddd' }} />
                    <span className='text-xs -ml-1 text-gray-300 hidden sm:inline'>{t('image')}</span>
                  </Button>
                </Tooltip>
              )}

              {WebSearchButton}

              {hasUseMcp && currentModel.supportTool && (
                <Popover
                  content={<McpServerSelect chat_id={chat_id} />}
                  trigger="click"
                  open={mcpServerSelectOpen}
                  onOpenChange={setMcpServerSelectOpen}
                >
                  <Tooltip title={t('mcpServer')} placement='bottom' arrow={false} >
                    {hasMcpSelected ? (
                      <Button type="text" size='small' color="primary" className='ml-1' variant="filled">
                        <McpIcon style={{ width: '13px', height: '13px' }} />
                        <span className='text-xs -ml-1 hidden sm:inline'>{t('mcpTool')}</span>
                      </Button>
                    ) : (
                      <Button type="text" size='small' className='ml-1'>
                        <McpIcon style={{ width: '13px', height: '13px' }} />
                        <span className='text-xs -ml-1 text-gray-500 hidden sm:inline'>{t('mcpTool')}</span>
                      </Button>
                    )}
                  </Tooltip>
                </Popover>
              )}

              <Popover
                content={<HistorySettings chat_id={chat_id} changeVisible={handleHistorySettingOpenChange} />}
                title={t('historyMessageCount')}
                trigger="click"
                open={historySettingOpen}
                onOpenChange={handleHistorySettingOpenChange}
              >
                <Tooltip title={t('historyMessageCount')} placement='bottom' arrow={false}>
                  <Button className='mx-1' type="text" size='small'>
                    <FieldTimeOutlined style={{ color: 'gray' }} />
                    <span className='text-xs -ml-1 text-gray-500'>
                      {historyType === 'all' && <>{t('historyMessageCountAllShot')}</>}
                      {historyType === 'none' && <>{t('historyMessageCountNone')}</>}
                      {historyType === 'count' && <>{historyCount} {t('piece')}</>}
                    </span>
                  </Button>
                </Tooltip>
              </Popover>

              <Button type="text" size='small' onClick={handleClearMemory}>
                <Eraser alt="Eraser" width="15" height="15" />
                <span className='text-xs -ml-1 text-gray-500 hidden sm:inline'>{t('clearMemory')}</span>
              </Button>
              <Tooltip title={t('clearHistoryMessage')}>
                <Button onClick={handleClearHistory} className='ml-1' type="text" size='small'>
                  <ClearOutlined style={{ color: 'gray' }} />
                  <span className='text-xs -ml-1 text-gray-500 hidden sm:inline'>{t('clearHistoryMessageShort')}</span>
                </Button>
              </Tooltip>
            </div>

            <div>
              {responseStatus === 'done' && (
                <Button
                  type="primary"
                  size='small'
                  shape="circle"
                  onClick={() => {
                    const message = inputRef.current?.value || '';
                    if (message.trim() !== '') {
                      handleSubmitMessage(message);
                      // Clear input using the method attached to the ref
                      if (inputRef.current?.clearInputValue) {
                        inputRef.current.clearInputValue();
                      }
                    }
                  }}
                  icon={<ArrowUpOutlined />}
                />
              )}

              {responseStatus === 'pending' && (
                <Button
                  type="primary"
                  size='small'
                  shape="circle"
                  onClick={stopChat}
                  icon={<Square theme="filled" size="12" fill="#ffffff" />}
                />
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default InputArea;
