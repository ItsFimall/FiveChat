'use client';
import React, { useEffect } from 'react'
import useMcpServerStore from '@/app/store/mcp';
import useGlobalConfigStore from '@/app/store/globalConfig';
import { fetchSettingsByKeys, getMcpServersAndAvailableTools } from '@/app/chat/actions/chat';
import useModelListStore from '@/app/store/modelList';
import { fetchAvailableLlmModels, fetchAllProviders } from '@/app/admin/llm/actions';

const AppPrepare = () => {
  const { setHasUseMcp, setHasMcpSelected, setMcpServers, setAllTools } = useMcpServerStore();
  const { setChatNamingModel, setSearchEnable } = useGlobalConfigStore();
  useEffect(() => {
    const initializeMcpInfo = async () => {
      const { mcpServers, tools } = await getMcpServersAndAvailableTools();
      setHasMcpSelected(false);
      if (mcpServers.length > 0) {
        setHasUseMcp(true);
        setMcpServers(mcpServers.map(server => ({
          ...server,
          type: server.type || 'sse',
          description: server.description ?? undefined,
        })));
        setAllTools(tools.map(tool => {
          const server = mcpServers.find(s => s.id === tool.serverId);
          return {
            id: tool.name,
            name: tool.name,
            serverName: server?.name || '',
            description: tool.description || undefined,
            inputSchema: JSON.parse(tool.inputSchema),
          };
        }));
      } else {
        setHasUseMcp(false);
        setMcpServers([]);
        setAllTools([]);
      }
    }
    initializeMcpInfo();
  }, [setHasUseMcp, setMcpServers, setHasMcpSelected, setAllTools]);

  const { initModelList, setCurrentModel, setIsPending, initAllProviderList } = useModelListStore();
  useEffect(() => {
    const initializeModelList = async () => {
      try {
        const remoteModelList: any = await fetchAvailableLlmModels();
        initModelList(remoteModelList);
        const allProviderSettings = await fetchAllProviders();
        const processedList = allProviderSettings.map(item => ({
          id: item.provider,
          providerName: item.providerName,
          apiStyle: item.apiStyle,
          providerLogo: item.logo || '',
          status: item.isActive || false,
        }));
        initAllProviderList(processedList)
        setIsPending(false);
      } catch (error) {
        console.error('Error initializing model list:', error);
      }
    };

    initializeModelList();
  }, [initModelList, setCurrentModel, setIsPending, initAllProviderList]);
  
  useEffect(() => {
    const initializeAppSettings = async () => {
      const results = await fetchSettingsByKeys(['chatNamingModel', 'searchEnable']);
      if (results.chatNamingModel) {
        setChatNamingModel(results.chatNamingModel)
      } else {
        setChatNamingModel('current')
      }
      if (results.searchEnable) {
        setSearchEnable(results.searchEnable === 'true')
      }
    }
    initializeAppSettings();
  }, [setChatNamingModel, setSearchEnable]);
  return (
    <></>
  )
}

export default AppPrepare