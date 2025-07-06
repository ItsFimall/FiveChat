import React, { useMemo, useState, useCallback } from 'react';
import MarkdownRender from '@/app/components/Markdown';
import { Avatar, Image as AntdImage } from "antd";
import { ResponseContent } from '@/types/llm';
import DotsLoading from '@/app/components/loading/DotsLoading';
import BallsLoading from '@/app/components/loading/BallsLoading';
import { CheckCircleOutlined, RedoOutlined, DownOutlined, CloseCircleOutlined, SearchOutlined } from '@ant-design/icons';
import ThinkingIcon from '@/app/images/thinking.svg';
import useModelListStore from '@/app/store/modelList';
import { useTranslations } from 'next-intl';

// 将搜索状态提示抽离为独立组件
const SearchStatusIndicator = React.memo(({ status }: { status: "none" | "searching" | "error" | "done" }) => {
  if (status === "none") return null;

  const statusMessages = {
    searching: "正在联网搜索...",
    error: "搜索出错，请联系管理员检查搜索引擎配置",
    done: "搜索完成"
  };

  return (
    <div className='flex text-xs flex-row items-center text-gray-800 bg-gray-100 rounded-md p-2 mb-4'>
      <SearchOutlined style={{ marginLeft: '4px' }} />
      <span className='ml-2'>{statusMessages[status]}</span>
    </div>
  );
});
SearchStatusIndicator.displayName = 'SearchStatusIndicator';

// 将工具调用详情抽离为独立组件
const ToolInvocationDetails = React.memo(({
  mcp,
  isOpen,
  toolId,
  onToggle
}: {
  mcp: any,
  isOpen: boolean,
  toolId: string,
  onToggle: (id: string) => void
}) => {
  return (
    <details open={false} className='flex flex-row bg-gray-100 hover:bg-slate-100 text-gray-800 rounded-md mb-3 border border-gray-200 text-sm'>
      <summary
        className='flex text-xs flex-row items-center rounded-md p-4'
        style={{ display: 'flex' }}
        onClick={(e) => {
          e.preventDefault();
          onToggle(toolId);
        }}
      >
        <span className='mr-2'>调用 {mcp.tool.serverName} 的工具： {mcp.tool.name}</span>
        {mcp.status === 'done' && mcp.response?.isError &&
          <div><CloseCircleOutlined style={{ color: 'red' }} /><span className='ml-1 text-red-600'>调用失败</span></div>
        }
        {mcp.status === 'done' && !mcp.response?.isError &&
          <div><CheckCircleOutlined style={{ color: 'green' }} /><span className='ml-1 text-green-700'>已完成</span></div>
        }
        {mcp.status === 'invoking' &&
          <div>
            <RedoOutlined spin={true} style={{ color: 'green' }} /><span className='ml-1 text-green-700'>执行中</span>
          </div>
        }
        <DownOutlined
          className='ml-auto mr-1'
          style={{
            color: '#999',
            transform: `rotate(${isOpen ? -90 : 0}deg)`,
            transition: 'transform 0.2s ease'
          }}
        />
      </summary>
      <div className='p-4 pb-0 text-xs border-t'>
        <pre className='scrollbar-thin'>{JSON.stringify(mcp.response, null, 2)}</pre>
      </div>
    </details>
  );
});
ToolInvocationDetails.displayName = 'ToolInvocationDetails';

const ResponsingMessage = (props: {
  searchStatus: "none" | "searching" | "error" | "done",
  responseStatus: string,
  responseMessage: ResponseContent,
  currentProvider: string,
}) => {
  const { allProviderListByKey } = useModelListStore();
  const [openToolIds, setOpenToolIds] = useState<Record<string, boolean>>({});
  const t = useTranslations('Chat');

  const handleToggle = useCallback((toolId: string) => {
    setOpenToolIds(prev => ({
      ...prev,
      [toolId]: !prev[toolId]
    }));
  }, []);

  const providerAvatar = useMemo(() => {
    if (allProviderListByKey && allProviderListByKey[props.currentProvider]?.providerLogo) {
      return (
        <Avatar
          style={{ marginTop: '0.2rem', 'fontSize': '24px', 'border': '1px solid #eee', 'padding': '2px' }}
          src={allProviderListByKey[props.currentProvider].providerLogo}
        />
      );
    }
    return (
      <div className='bg-blue-500 flex mt-1 text-cyan-50 items-center justify-center rounded-full w-8 h-8'>
        {allProviderListByKey && allProviderListByKey[props.currentProvider]?.providerName?.charAt(0)}
      </div>
    );
  }, [props.currentProvider, allProviderListByKey]);

  if (props.responseStatus !== "pending") return null;

  return (
    <div className="flex container mx-auto px-2 max-w-screen-md w-full flex-col justify-center items-center pointer-events-auto">
      <div className='items-start flex max-w-3xl text-justify w-full my-0 pt-0 pb-1 flex-row pointer-events-auto'>
        {providerAvatar}
        <div className='flex flex-col w-0 grow pointer-events-auto'>
          <div className='px-3 py-2 ml-2 bg-gray-100 text-gray-600 w-full grow markdown-body answer-content rounded-xl pointer-events-auto'>
            <SearchStatusIndicator status={props.searchStatus} />

            {props.responseMessage.reasoningContent && (
              <div className='text-sm mb-4'>
                <div className='flex text-xs flex-row items-center text-gray-800 bg-gray-100 rounded-md p-2'>
                  <ThinkingIcon width={16} height={16} style={{ 'fontSize': '10px' }} />
                  <span className='ml-1'>
                    {props.responseMessage.content ? t('thought') : t('thinking')}
                  </span>
                </div>
                <div className='border-l-2 border-gray-200 px-2 mt-2 leading-5 text-gray-400'>
                  <MarkdownRender content={props.responseMessage.reasoningContent as string} />
                </div>
              </div>
            )}

            <div className="pointer-events-auto">
              {typeof props.responseMessage.content === 'string' && <MarkdownRender content={props.responseMessage.content} />}

              {
                Array.isArray(props.responseMessage.content) && props.responseMessage.content.map((part, index) =>
                  <div key={index}>
                    {part.type === 'text' && <MarkdownRender content={part.text} />}
                    {part.type === 'image' && <AntdImage
                      className='cursor-pointer'
                      src={part.data}
                      preview={{ mask: false }}
                      style={{ maxWidth: '250px', borderRadius: '4px', boxShadow: '3px 4px 7px 0px #dedede' }} />}
                  </div>)
              }
            </div>

            <div className="pointer-events-auto">
              {props.responseMessage.mcpTools?.map((mcp, index) => {
                const toolId = `${mcp.tool.serverName}-${mcp.tool.name}-${index}`;
                const isOpen = !!openToolIds[toolId];

                return (
                  <ToolInvocationDetails
                    key={toolId}
                    mcp={mcp}
                    isOpen={isOpen}
                    toolId={toolId}
                    onToggle={handleToggle}
                  />
                );
              })}
            </div>

            {(props.responseMessage.content === "" && props.responseMessage.reasoningContent === "") && <DotsLoading />}
          </div>

          {(props.responseMessage.content !== "" || props.responseMessage.reasoningContent !== "") && (
            <div className='px-3'>
              <BallsLoading />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ResponsingMessage);