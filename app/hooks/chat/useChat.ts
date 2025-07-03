import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Message, ResponseContent, ChatOptions, LLMApi, RequestMessage, MessageContent, MCPTool } from '@/types/llm';
import useChatStore from '@/app/store/chat';
import useChatListStore from '@/app/store/chatList';
import useMcpServerStore from '@/app/store/mcp';
import { generateTitle, getProviderInstance } from '@/app/utils';
import useModelListStore from '@/app/store/modelList';
import { getChatInfoInServer } from '@/app/chat/actions/chat';
import { addMessageInServer, getMessagesInServer, deleteMessageInServer, clearMessageInServer, updateMessageWebSearchInServer } from '@/app/chat/actions/message';
import useGlobalConfigStore from '@/app/store/globalConfig';
import { getSearchResult } from '@/app/chat/actions/chat';
import { searchResultType, WebSearchResponse } from '@/types/search';
import { REFERENCE_PROMPT } from '@/app/config/prompts';
import { useRouter } from 'next/navigation'

const useChat = (chatId: string) => {
  const { currentModel, setCurrentModelExact, modelList } = useModelListStore();
  const [messageList, setMessageList] = useState<Message[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [responseStatus, setResponseStatus] = useState<"done" | "pending">("done");
  const [searchStatus, setSearchStatus] = useState<searchResultType>("none");
  const [chatBot, setChatBot] = useState<LLMApi | null>(null);
  const [responseMessage, setResponseMessage] = useState<ResponseContent>({ content: '', reasoningContent: '' });
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [userSendCount, setUserSendCount] = useState(0);
  const { chat, initializeChat, setWebSearchEnabled, builtInImageGen, webSearchEnabled, historyType, historyCount } = useChatStore();
  const { setNewTitle } = useChatListStore();
  const { chatNamingModel } = useGlobalConfigStore();
  const { selectedTools } = useMcpServerStore();
  const router = useRouter();

  useEffect(() => {
    const llmApi = getProviderInstance(currentModel.provider.id, currentModel.provider.apiStyle);
    setChatBot(llmApi);

    return () => {
      // 清理 chatBot
      if (llmApi) {
        llmApi.stopChat?.(() => { });
        setChatBot(null);
      }
    };
  }, [currentModel]);

  const chatNamingModelStable = useMemo(() => chatNamingModel, [chatNamingModel]);
  const shouldSetNewTitle = useCallback((messages: RequestMessage[]) => {
    if (userSendCount === 0 && !chat?.isWithBot) {
      if (chatNamingModelStable !== 'none') {
        let renameModel = currentModel;
        if (chatNamingModelStable !== 'current') {
          const [providerId, modelId] = chatNamingModelStable.split('|');
          const foundModel = modelList.find(m => m.id === modelId && m.provider.id === providerId);
          if (foundModel) {
            renameModel = foundModel;
          }
        }
        generateTitle(messages, renameModel, (message: string) => {
          setNewTitle(chatId, message);
        }, () => { })
      }
    }
  }, [
    chat,
    chatId,
    currentModel,
    userSendCount,
    chatNamingModelStable,
    modelList,
    setNewTitle,
  ]);

  const sendMessage = useCallback(async (
    messages: RequestMessage[],
    searchResultStatus?: searchResultType,
    searchResponse?: WebSearchResponse,
    buildinTools?: any[],
    mcpTools?: MCPTool[]
  ) => {
    setResponseStatus("pending");
    const options: ChatOptions = {
      messages: messages,
      config: { model: currentModel.id },
      chatId: chatId,
      buildinTools,
      mcpTools,
      onUpdate: (responseContent: ResponseContent) => {
        setResponseMessage(responseContent);
      },
      onFinish: async (responseContent: ResponseContent, shouldContinue?: boolean) => {
        const respMessage: Message = {
          id: responseContent.id,
          role: "assistant",
          chatId: chatId,
          content: responseContent.content,
          reasoninContent: responseContent.reasoningContent,
          searchStatus: searchResultStatus,
          inputTokens: responseContent.inputTokens,
          outputTokens: responseContent.outputTokens,
          totalTokens: responseContent.totalTokens,
          mcpTools: responseContent.mcpTools,
          providerId: currentModel.provider.id,
          model: currentModel.id,
          type: 'text',
          createdAt: new Date()
        };
        setMessageList(prevList => [...prevList, respMessage]);
        setSearchStatus('none');
        setResponseMessage({ content: '', reasoningContent: '', mcpTools: [] });
        if (!shouldContinue) {
          setResponseStatus("done");
        }
        // 将 searchResponse 同步到数据库的 message 表下， id= responseContent.id 的记录
        if (responseContent.id) {
          await updateMessageWebSearchInServer(
            responseContent.id,
            (searchResultStatus && searchResultStatus !== 'none') ? true : false,
            searchResultStatus || 'none',
            searchResponse);
        }
      },
      onError: async (error) => {
        const respMessage: Message = {
          role: "assistant",
          chatId: chatId,
          content: error?.message || '',
          searchEnabled: (searchResultStatus && searchResultStatus !== 'none') ? true : false,
          searchStatus: searchResultStatus,
          webSearch: searchResponse,
          providerId: currentModel.provider.id,
          model: currentModel.id,
          type: 'error',
          errorType: error?.name || 'unknown error',
          errorMessage: error?.message || '',
          createdAt: new Date()
        };
        setMessageList((m) => ([...m, respMessage]));
        setResponseStatus("done");
        setSearchStatus('none');
        setResponseMessage({ content: '', reasoningContent: '' });
      }
    }
    chatBot?.chat(options);
  }, [
    chatBot,
    chatId,
    currentModel,
  ]);

  const stopChat = () => {
    setResponseStatus("done");
    chatBot?.stopChat((responseContent: ResponseContent) => {
      if (responseContent.content || responseContent.reasoningContent) {
        const respMessage: Message = {
          role: "assistant",
          chatId: chatId,
          content: responseContent.content,
          searchStatus: searchStatus,
          mcpTools: responseContent.mcpTools,
          reasoninContent: responseContent.reasoningContent,
          inputTokens: responseContent.inputTokens,
          outputTokens: responseContent.outputTokens,
          totalTokens: responseContent.totalTokens,
          providerId: currentModel.provider.id,
          model: currentModel.id,
          type: 'text',
        };
        setMessageList((m) => ([...m, { ...respMessage, createdAt: new Date() }]));
        addMessageInServer(respMessage);
      }
      setSearchStatus('none');
      setResponseMessage({ content: '', reasoningContent: '' });
    });
  }

  const deleteMessage = (index: number) => {
    deleteMessageInServer(messageList[index].id as number);
    setMessageList(messageList.filter((_, i) => i !== index));
  }

  const clearHistory = () => {
    clearMessageInServer(chatId).then(() => {
      setMessageList([])
    });
  }

  const addBreak = async () => {
    if (messageList.length > 0 && messageList.at(-1)?.type === 'break') {
      return;
    }
    const toAddMessage = {
      role: "system",
      chatId: chatId,
      content: '上下文已清除',
      providerId: currentModel.provider.id,
      model: currentModel.id,
      type: 'break' as 'break',
    };
    addMessageInServer(toAddMessage);
    setMessageList((m) => ([...m, { ...toAddMessage, createdAt: new Date() }]));
  }

  const prepareMessage = useCallback((newMessage: RequestMessage): RequestMessage[] => {
    let messages: RequestMessage[] = [];
    let tmpMessages = [];

    const validMessageType = ['text', 'image'];
    const breakIndex = messageList.findLastIndex(item => item.type === 'break');

    if (breakIndex > -1) {
      tmpMessages = messageList.slice(breakIndex)
    } else {
      tmpMessages = messageList;
    }
    messages = tmpMessages.filter((item) => validMessageType.includes(item.type))
      .map(({ content, role }) => ({ content, role: role as 'assistant' | 'user' | 'system' }));

    if (historyType === 'all') {
      messages = messages;
    }
    if (historyType === 'none') {
      messages = [];
    }
    if (historyType === 'count') {
      if (historyCount > messages.length) {
        messages = messages;
      } else {
        messages = messages.slice(-historyCount);
      }
    }
    messages.push(newMessage);
    if (chat?.prompt) {
      messages.unshift({ role: 'system', content: chat?.prompt })
    }
    return messages;
  }, [
    chat,
    historyCount,
    historyType,
    messageList
  ]);

  const handleWebSearch = useCallback(async (message: MessageContent) => {
    let realSendMessage = message;
    let searchStatus: searchResultType = 'none';
    let searchResponse: WebSearchResponse | undefined;

    try {
      setSearchStatus("searching");
      const textContent = typeof message === 'string' ? message : '';
      if (textContent) {
        const searchResult = await getSearchResult(textContent);

        if (searchResult.status === 'success') {
          searchResponse = searchResult.data || undefined;
          const referenceContent = `\`\`\`json\n${JSON.stringify(searchResult, null, 2)}\n\`\`\``;
          realSendMessage = REFERENCE_PROMPT.replace('{question}', textContent).replace('{references}', referenceContent);
          setSearchStatus("done");
          searchStatus = 'done';
        } else {
          setSearchStatus("error");
          searchStatus = 'error';
        }
      }
    } catch (error) {
      console.error('handleWebSearch - error:', error);
      setSearchStatus("error");
      searchStatus = 'error';
    }

    return {
      realSendMessage,
      searchStatus,
      searchResponse
    };
  }, []);

  const handleSubmit = useCallback(async (message: MessageContent) => {
    if (responseStatus === 'pending') {
      return;
    }
    setResponseStatus("pending");
    setIsUserScrolling(false);

    const currentMessage = {
      role: "user",
      chatId: chatId,
      content: message,
      searchEnabled: webSearchEnabled,
      providerId: currentModel.provider.id,
      model: currentModel.id,
      type: 'text' as const,
    };

    setMessageList((m) => ([...m, { ...currentMessage, createdAt: new Date() }]));
    addMessageInServer(currentMessage);
    setUserSendCount(userSendCount + 1);

    let realSendMessage = message;
    let searchStatus: searchResultType = 'none';
    let searchResponse: WebSearchResponse | undefined = undefined;
    if (webSearchEnabled) {
      const result = await handleWebSearch(message);
      realSendMessage = result.realSendMessage;
      searchStatus = result.searchStatus;
      searchResponse = result.searchResponse;
    }
    const messages = prepareMessage({
      role: "user",
      content: realSendMessage,
    })
    let buildinTools: any[] = [];
    if (builtInImageGen) {
      buildinTools = [{ type: "image_generation", quality: 'low' }];
    }
    sendMessage(messages, searchStatus, searchResponse, buildinTools, selectedTools);
  }, [
    chatId,
    responseStatus,
    currentModel,
    userSendCount,
    selectedTools,
    webSearchEnabled,
    builtInImageGen,
    prepareMessage,
    sendMessage,
    handleWebSearch,
  ]);

  const prepareMessageFromIndex = (index: number): RequestMessage[] => {
    let messages: RequestMessage[] = [];
    if (historyType === 'all') {
      messages = messageList
        .slice(0, index)
        .filter((item) => item.type !== 'error')
        .map(({ content, role }) => ({ content, role: role as 'assistant' | 'user' | 'system' }));
    }
    if (historyType === 'none') {
      // 从 index 向前寻找一天正常的用户发送的消息。
      const tmpMessage = messageList.slice(index, index + 1);
      if (tmpMessage[0]?.type === 'error') {
        messages = messageList
          .slice(index - 1, index)
          .map(({ content, role }) => ({ content, role: role as 'assistant' | 'user' | 'system' }));
      } else {
        messages = tmpMessage
          .map(({ content, role }) => ({ content, role: role as 'assistant' | 'user' | 'system' }));
      }
    }
    if (historyType === 'count') {
      if (historyCount > messageList.length) {
        messages = messageList
          .slice(0, index)
          .filter((item) => item.type !== 'error')
          .map(({ content, role }) => ({ content, role: role as 'assistant' | 'user' | 'system' }));
      } else {
        messages = messageList
          .slice(0, index)
          .filter((item) => item.type !== 'error')
          .slice(-historyCount)
          .map(({ content, role }) => ({ content, role: role as 'assistant' | 'user' | 'system' }));
      }
    }
    return messages;
  }
  const retryMessage = (index: number, addNew: boolean = true) => {
    if (addNew) {
      const message = messageList[index];
      handleSubmit(message.content);
    } else {
      // 单独处理重试的逻辑
      setResponseStatus("pending");
      const messages: RequestMessage[] = prepareMessageFromIndex(index);
      sendMessage(messages);
      shouldSetNewTitle(messages)
    }
  }

  useEffect(() => {
    const initializeChatData = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const fromHome = urlParams.get('f') === 'home';
        if (!fromHome) {
          setIsPending(true);
        };
        const { status, data } = await getChatInfoInServer(chatId);
        if (status === 'success') {
          initializeChat(data!);
          if (data?.defaultProvider && data?.defaultModel) {
            setCurrentModelExact(data.defaultProvider, data.defaultModel);
          }
        }

        let messageList: Message[] = [];
        const result = await getMessagesInServer(chatId);
        if (result.status === 'success') {
          messageList = result.data as Message[];
        }
        setMessageList(messageList);

        // 计算用户消息数量
        const userMessageCount = messageList.filter(item => item.role === "user").length;
        setUserSendCount(userMessageCount);
      } catch (error) {
        console.error('Error in chat initialization:', error);
      } finally {
        setIsPending(false);
      }
    };

    initializeChatData();
  }, [chatId, initializeChat, setCurrentModelExact]);

  const shouldSetNewTitleRef = useRef(shouldSetNewTitle);
  const processedMessageIds = useRef(new Set<string>());
  const hasInitialized = useRef(false);

  useEffect(() => {
    const handleInitialResponse = async () => {
      if (hasInitialized.current) {
        return;
      }

      try {
        // 使用URL查询参数检测是否来自首页
        const urlParams = new URLSearchParams(window.location.search);
        const fromHome = urlParams.get('f') === 'home';
        if (!fromHome) return;

        // 清除URL参数
        router.replace(`/chat/${chatId}`);

        // 检查是否有未回复的用户消息
        if (messageList.length === 1 && messageList[0].role === 'user') {
          const userMessage = messageList[0];
          // 创建一个消息标识符
          const messageId = `${userMessage.id || '-'}`;

          // 检查是否已处理过这条消息
          if (processedMessageIds.current.has(messageId)) {
            return;
          }

          // 标记消息为已处理
          processedMessageIds.current.add(messageId);
          hasInitialized.current = true;

          const _searchEnabled = userMessage.searchEnabled || false;
          const question = userMessage.content;

          // 处理请求发送
          let realSendMessage = question;
          let searchStatus: searchResultType = 'none';
          let searchResponse = undefined;

          if (_searchEnabled) {
            setResponseStatus('pending');
            try {
              const result = await handleWebSearch(question);
              realSendMessage = result.realSendMessage;
              searchStatus = result.searchStatus;
              searchResponse = result.searchResponse;
            } catch (error) {
              console.error('handleInitialResponse - web search error:', error);
              searchStatus = 'error';
            }
          }

          const messages = [{ role: 'user' as const, content: realSendMessage }];
          await sendMessage(messages, searchStatus, searchResponse, [], selectedTools);
          shouldSetNewTitleRef.current([{ role: 'user' as const, content: question }]);
        }
      } catch (error) {
        console.error('handleInitialResponse - error:', error);
      }
    };

    if (messageList.length > 0) {
      handleInitialResponse();
    }
  }, [messageList, chatId, selectedTools, router, sendMessage, handleWebSearch]);

  return {
    chat,
    messageList,
    searchStatus,
    responseStatus,
    responseMessage,
    historyType,
    historyCount,
    isUserScrolling,
    currentModel,
    isPending,
    handleSubmit,
    sendMessage,
    shouldSetNewTitle,
    deleteMessage,
    clearHistory,
    stopChat,
    retryMessage,
    addBreak,
    setIsUserScrolling,
  };
};

export default useChat;