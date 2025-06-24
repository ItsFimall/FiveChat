import React, { useState, useEffect, memo, useMemo } from 'react';
import { Message } from '@/types/llm';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Button, Tooltip, message, Alert, Avatar, Popconfirm, Image as AntdImage } from "antd";
import { CopyOutlined, SyncOutlined, DeleteOutlined, DownOutlined, CheckCircleOutlined, CloseCircleOutlined, SearchOutlined } from '@ant-design/icons';
import useModelListStore from '@/app/store/modelList';
import ThinkingIcon from '@/app/images/thinking.svg';
import MarkdownRender from '@/app/components/Markdown';
import { useTranslations } from 'next-intl';

const MessageItem = memo((props: {
  item: Message,
  index: number,
  isConsecutive: boolean;
  role: 'assistant' | 'user' | 'system',
  retryMessage: (index: number) => void,
  deleteMessage: (index: number) => void,
  showActions?: boolean
}
) => {
  const t = useTranslations('Chat');
  const { allProviderListByKey } = useModelListStore();
  const [images, setImages] = useState<string[]>([]);
  const [plainText, setPlainText] = useState('');

  const showActions = props.showActions === undefined ? true : props.showActions;

  useEffect(() => {
    if (Array.isArray(props.item.content) && props.item.content.length > 0) {
      const images = props.item.content.filter((item: any) => item.type === 'image').map((item: any) => item.data);
      setImages(images);
      const plainText = props.item.content.filter((i) => i.type === 'text').map((it) => it.text).join('')
      setPlainText(plainText);
    } else {
      setPlainText(props.item.content as string);
    }
  }, [props.item]);

  const ProviderAvatar = useMemo(() => {
    if (allProviderListByKey) {
      return (allProviderListByKey && allProviderListByKey[props.item.providerId]?.providerLogo) ? <Avatar
        style={{ marginTop: '0.2rem', 'fontSize': '24px', 'border': '1px solid #eee', 'padding': '2px' }}
        src={allProviderListByKey![props.item.providerId].providerLogo}
      /> : <div className='bg-blue-500 flex mt-1 text-cyan-50 items-center justify-center rounded-full w-8 h-8'>
        {allProviderListByKey && allProviderListByKey[props.item.providerId].providerName.charAt(0)}</div>
    }
    else {
      return <div className='bg-blue-500 flex mt-1 text-cyan-50 items-center justify-center rounded-full w-8 h-8'>
        Bot</div>
    }
  }, [allProviderListByKey, props.item.providerId])

  if (props.item.type === 'error' && props.item.errorType === 'TimeoutError') {
    return (
      <div className="flex container mx-auto px-2 max-w-screen-md w-full flex-col justify-center items-center" >
        <div className='items-start flex  max-w-3xl text-justify w-full my-0 pt-0 pb-1 flex-row'>
          {ProviderAvatar}
          <div className='flex flex-col w-0 grow group max-w-80'>
            <Alert
              showIcon
              style={{ marginLeft: '0.75rem' }}
              message={t('apiTimeout')}
              type="warning"
            />
            <div className='invisible flex flex-row items-center ml-3 my-1 group-hover:visible'>
              <Tooltip title={t('deleteNotice')}>
                <Popconfirm
                  title={t('deleteNotice')}
                  description={t('currentMessageDelete')}
                  onConfirm={() => props.deleteMessage(props.index)}
                  okText={t('confirm')}
                  cancelText={t('cancel')}
                  placement='bottom'
                >
                  <Button type="text" size='small'>
                    <DeleteOutlined style={{ color: 'gray' }} />
                  </Button>
                </Popconfirm>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    )
  }
  if (props.item.type === 'error' && props.item.errorType === 'OverQuotaError') {
    return (
      <div className="flex container mx-auto px-2 max-w-screen-md w-full flex-col justify-center items-center" >
        <div className='items-start flex  max-w-3xl text-justify w-full my-0 pt-0 pb-1 flex-row'>
          {ProviderAvatar}
          <div className='flex flex-col w-0 grow group' style={{ maxWidth: '28rem' }}>
            <Alert
              showIcon
              style={{ marginLeft: '0.75rem' }}
              message="超出本月使用限额。请次月再重试，或联系管理员增加额度。"
              type="warning"
            />
            <div className='invisible flex flex-row items-center ml-3 my-1 group-hover:visible'>
              <Tooltip title={t('deleteNotice')}>
                <Popconfirm
                  title={t('deleteNotice')}
                  description={t('currentMessageDelete')}
                  onConfirm={() => props.deleteMessage(props.index)}
                  okText={t('confirm')}
                  cancelText={t('cancel')}
                  placement='bottom'
                >
                  <Button type="text" size='small'>
                    <DeleteOutlined style={{ color: 'gray' }} />
                  </Button>
                </Popconfirm>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    )
  }
  if (props.item.type === 'error' && props.item.errorType === 'InvalidAPIKeyError') {
    return (
      <div className="flex container mx-auto px-2 max-w-screen-md w-full flex-col justify-center items-center" >
        <div className='items-start flex  max-w-3xl text-justify w-full my-0 pt-0 pb-1 flex-row'>
          {ProviderAvatar}
          <div className='flex flex-col w-0 grow group max-w-96'>
            <Alert
              showIcon
              style={{ marginLeft: '0.75rem' }}
              message={t('apiKeyError')}
              type="warning"
            />
            <div className='invisible flex flex-row items-center ml-3 my-1 group-hover:visible'>
              <Tooltip title={t('deleteNotice')}>
                <Popconfirm
                  title={t('deleteNotice')}
                  description={t('currentMessageDelete')}
                  onConfirm={() => props.deleteMessage(props.index)}
                  okText={t('confirm')}
                  cancelText={t('cancel')}
                  placement='bottom'
                >
                  <Button type="text" size='small'>
                    <DeleteOutlined style={{ color: 'gray' }} />
                  </Button>
                </Popconfirm>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>);
  }
  if (props.item.type === 'break') {
    return <div className="flex container mx-auto px-2 max-w-screen-md w-full flex-col justify-center items-center" >
      <div className='items-start flex  max-w-3xl text-justify w-full my-0 pt-0 pb-1 flex-row'>
        <div className="relative w-full my-6">
          {/* Horizontal lines */}
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-200"></div>
          </div>

          {/* Text container */}
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs text-gray-400">{t('contextCleared')}</span>
          </div>
        </div>
      </div>
    </div>
  }
  if (props.role === 'user') {
    return <div className="flex container mx-auto px-2 max-w-screen-md w-full flex-col justify-center items-center" >
      <div className='items-start flex max-w-3xl text-justify w-full my-0 pt-0 pb-1 flex-row-reverse'>
        <div className='flex flex-col h-full'>
          <Avatar size={32} className='bg-blue-500 text-white'>U</Avatar>
          {props.isConsecutive && <div className="flex justify-center h-0 grow">
            <div className="h-full border-l border-dashed border-gray-300 my-1"></div>
          </div>}
        </div>
        <div className='flex flex-col w-0 grow group items-end'>
          <div className='pl-4 pr-2 py-2 mr-3 bg-blue-500 text-white w-fit markdown-body answer-content rounded-xl'>
            {images.length > 0 && (
              <AntdImage.PreviewGroup items={images}>
                <div className='flex flex-row flex-wrap'>
                  {images.map((image, index) => (
                    <div key={index} className='w-24 h-24 m-1 rounded-md overflow-hidden' >
                      <AntdImage
                        src={image}
                        alt="Uploaded image"
                        className='object-cover w-full h-full'
                      />
                    </div>
                  ))}
                </div>
              </AntdImage.PreviewGroup>
            )}
            <MarkdownRender content={plainText} />
          </div>
          <div className='invisible flex flex-row-reverse pr-1 mt-1 group-hover:visible'>
            {showActions && (
              <>
                <Tooltip title={t('delete')}>
                  <Popconfirm
                    title={t('deleteNotice')}
                    description={t('currentMessageDelete')}
                    onConfirm={() => props.deleteMessage(props.index)}
                    okText={t('confirm')}
                    cancelText={t('cancel')}
                    placement='bottom'
                  >
                    <Button type="text" size='small'>
                      <DeleteOutlined style={{ color: 'gray' }} />
                    </Button>
                  </Popconfirm>
                </Tooltip>
                <Tooltip title={t('retry')}>
                  <Button type="text" size='small'
                    onClick={() => {
                      props.retryMessage(props.index)
                    }}
                  >
                    <SyncOutlined style={{ color: 'gray' }} />
                  </Button>
                </Tooltip>
              </>
            )}
            <CopyToClipboard text={plainText} onCopy={() => {
              message.success(t('copySuccess'));
            }}>
              <Tooltip title={t('copy')}>
                <Button type="text" size='small'>
                  <CopyOutlined style={{ color: 'gray' }} />
                </Button>
              </Tooltip>
            </CopyToClipboard>
          </div>
        </div>
      </div>
    </div>;
  }
  if (props.role === 'assistant') {
    return (
      <div className="flex container mx-auto px-2 max-w-screen-md w-full flex-col justify-center items-center" >
        <div className='items-start flex max-w-3xl text-justify w-full my-0 pt-0 pb-1 flex-row'>
          <div className='flex flex-col h-full'>
            {ProviderAvatar}
            {props.isConsecutive && <div className="flex justify-center h-0 grow">
              <div className="h-full border-l border-dashed border-gray-300 my-1"></div>
            </div>}
          </div>
          <div className='flex flex-col w-0 grow group'>
            <div className='pl-3 pr-0 py-2 ml-2  bg-gray-100  text-gray-600 w-full grow markdown-body answer-content rounded-xl'>

              {props.item.searchStatus === "searching" && <div className='flex text-xs flex-row items-center  text-gray-800 bg-gray-100 rounded-md p-2 mb-4'>
                <SearchOutlined style={{ marginLeft: '4px' }} /> <span className='ml-2'>正在联网搜索...</span>
              </div>
              }
              {props.item.searchStatus === "error" && <div className='flex text-xs flex-row items-center  text-gray-800 bg-gray-100 rounded-md p-2 mb-4'>
                <SearchOutlined style={{ marginLeft: '4px' }} /> <span className='ml-2'>搜索出错，请联系管理员检查搜索引擎配置</span>
              </div>
              }
              {props.item.searchStatus === "done" && <div className='flex text-xs flex-row items-center  text-gray-800 bg-gray-100 rounded-md p-2 mb-4'>
                <SearchOutlined style={{ marginLeft: '4px' }} /> <span className='ml-2'>搜索完成</span>
              </div>
              }

              {props.item.reasoninContent &&
                <details open={true} className='text-sm mt-1 mb-4'>
                  <summary
                    className='flex text-xs flex-row items-center hover:bg-gray-200 text-gray-800 bg-gray-100 rounded-md p-2'
                    style={{ display: 'flex' }}
                  >
                    <ThinkingIcon width={16} height={16} style={{ 'fontSize': '10px' }} />
                    <span className='ml-1'>{t('thought')}</span>
                    <DownOutlined
                      className='ml-auto mr-1'
                      style={{
                        color: '#999',
                        transform: `rotate(0deg)`,
                        transition: 'transform 0.2s ease'
                      }}
                    />
                  </summary>
                  <div className='border-l-2 border-gray-200 px-2 mt-2 leading-5 text-gray-400'>
                    <MarkdownRender content={props.item.reasoninContent as string} />
                  </div>
                </details>}
              {typeof props.item.content === 'string' && <MarkdownRender content={props.item.content} />
              }

              {
                Array.isArray(props.item.content) && props.item.content.map((part, index) =>
                  <div key={index}>
                    {part.type === 'text' && <MarkdownRender content={part.text} />}
                    {part.type === 'image' && <AntdImage
                      className='cursor-pointer'
                      src={part.data}
                      preview={{ mask: false }}
                      style={{ maxWidth: '250px', borderRadius: '4px', boxShadow: '3px 4px 7px 0px #dedede' }} />}
                  </div>)
              }

              {
                props.item.mcpTools && props.item.mcpTools.map((mcp, index) => {
                  return <details open={false} key={index} className='flex flex-row bg-gray-100 hover:bg-slate-100 text-gray-800 rounded-md mb-3  border border-gray-200 text-sm'>

                    <summary
                      className='flex text-xs flex-row items-center rounded-md p-4'
                      style={{ display: 'flex' }}
                    >
                      <span className='mr-2'>{t('mcpCall')} {mcp.tool?.serverName} {t('sTool')}： {mcp.tool?.name}</span>
                      {
                        mcp.response?.isError ?
                          <div><CloseCircleOutlined style={{ color: 'red' }} /><span className='ml-1 text-red-600'>{t('mcpFailed')}</span></div>
                          : <div><CheckCircleOutlined style={{ color: 'green' }} /><span className='ml-1 text-green-700'>{t('mcpFinished')}</span></div>
                      }
                      <DownOutlined
                        className='ml-auto mr-1'
                        style={{
                          color: '#999',
                          transform: `rotate(-90deg)`,
                          transition: 'transform 0.2s ease'
                        }}
                      />
                    </summary>
                    <div className='p-4 pb-0 text-xs border-t'>
                      <span className='mb-2 font-medium'>{t('mcpInput')}</span>
                      <pre className='scrollbar-thin' style={{ marginTop: '6px' }}>{JSON.stringify(mcp.tool.inputSchema, null, 2)}</pre>
                      <span className='mb-2 font-medium'>{t('mcpOutput')}</span>
                      <pre className='scrollbar-thin bg-white' style={{ marginTop: '6px' }}>{JSON.stringify(mcp.response, null, 2)}</pre>
                    </div>
                  </details>
                })
              }
            </div>
            <div className='invisible flex flex-row items-center ml-3 my-1 group-hover:visible'>
              {showActions && (
                <Tooltip title={t('retry')}>
                  <Button type="text" size='small'
                    onClick={() => {
                      props.retryMessage(props.index)
                    }}
                  >
                    <SyncOutlined style={{ color: 'gray' }} />
                  </Button>
                </Tooltip>
              )}
              <CopyToClipboard text={props.item.content as string} onCopy={() => {
                message.success(t('copySuccess'));
              }}>
                <Tooltip title={t('copy')}>
                  <Button type="text" size='small'>
                    <CopyOutlined style={{ color: 'gray' }} />
                  </Button>
                </Tooltip>
              </CopyToClipboard>
              {showActions && (
                <Tooltip title={t('delete')}>
                  <Popconfirm
                    title={t('deleteNotice')}
                    description={t('currentMessageDelete')}
                    onConfirm={() => props.deleteMessage(props.index)}
                    okText={t('confirm')}
                    cancelText={t('cancel')}
                    placement='bottom'
                  >
                    <Button type="text" size='small'>
                      <DeleteOutlined style={{ color: 'gray' }} />
                    </Button>
                  </Popconfirm>
                </Tooltip>
              )}
              <div className='grow'></div>
              <div className='text-xs text-gray-400 mr-4'>
                {t('Tokens')}: {props.item.totalTokens ?? t('unknownUsage')}
                {props.item.inputTokens && ` ( ${t('Input')}: ${props.item.inputTokens} ${t('Output')}: ${props.item.outputTokens} )`}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
});

MessageItem.displayName = 'MessageItem';
export default MessageItem
