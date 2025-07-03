'use client';
import React, { useState, useEffect } from 'react';
import { Slider, Select, Switch, message, Spin } from 'antd';
import { fetchAppSettings, setAppSettings } from "@/app/admin/system/actions";
import { getDefaultSearchEngineConfig, updateSearchEngineConfig, setSearchEngineConfig } from "./actions";
import TavilySettings from './components/TavilySettings';
import JinaSettings from './components/JinaSettings';
import BochaSettings from './components/BochaSettings';
import { useTranslations } from 'next-intl';

interface SearchEngineConfig {
  id: string;
  name: string;
  apiKey: string | null;
  isActive: boolean;
  extractKeywords: boolean;
  maxResults: number;
}

const SearchPage = () => {
  const t = useTranslations('Admin.Search');
  const [loading, setLoading] = useState(true);
  const [searchEnable, setSearchEnable] = useState(false);
  const [currentSearchEngineConfig, setCurrentSearchEngineConfig] = useState<SearchEngineConfig>();
  const [selectedEngine, setSelectedEngine] = useState('tavily');

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const resultValue = await fetchAppSettings('searchEnable');
        setSearchEnable(resultValue === 'true');

        if (resultValue === 'true') {
          const configResult = await getDefaultSearchEngineConfig();
          if (configResult) {
            setCurrentSearchEngineConfig(configResult);
            setSelectedEngine(configResult.id);
          } else {
            setSearchEngineConfig('tavily');
          }
        }
      } catch (error) {
        message.error('加载配置失败');
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const handleSearchEnable = async (checked: boolean) => {
    try {
      const result = await setAppSettings('searchEnable', checked ? 'true' : 'false');
      if (result?.status === 'success') {
        if (checked) {
          const configResult = await getDefaultSearchEngineConfig();
          if (configResult) {
            setCurrentSearchEngineConfig(configResult);
            setSelectedEngine(configResult.id);
          } else {
            setSearchEngineConfig('tavily');
          }
        }
        setSearchEnable(checked);
      } else {
        throw new Error('保存失败');
      }
    } catch (error) {
      message.error('保存失败');
    }
  };

  const handleConfigUpdate = async (config: Partial<SearchEngineConfig>) => {
    if (!currentSearchEngineConfig) return;

    try {
      const updatedConfig = { ...currentSearchEngineConfig, ...config };
      const result = await updateSearchEngineConfig(updatedConfig);

      if (result.status === 'success') {
        setCurrentSearchEngineConfig(updatedConfig);
      } else {
        throw new Error('保存失败');
      }
    } catch (error) {
      message.error('保存失败');
    }
  };

  const handleApikeyChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentSearchEngineConfig) return;

    const value = e.target.value;
    const updatedConfig = {
      ...currentSearchEngineConfig,
      apiKey: value
    };

    setCurrentSearchEngineConfig(updatedConfig);

    if (e.type === 'blur') {
      await handleConfigUpdate({ apiKey: value });
      message.success('保存成功');
    }
  };

  const handleMaxResultsChange = async (value: number) => {
    if (!currentSearchEngineConfig) return;
    setCurrentSearchEngineConfig({ ...currentSearchEngineConfig, maxResults: value });
  };

  const handleMaxResultsChangeCompleted = async (value: number) => {
    await handleConfigUpdate({ maxResults: value });
  };

  const handleExtractKeywordsChange = async (checked: boolean) => {
    await handleConfigUpdate({ extractKeywords: checked });
  };

  const handleEngineChange = async (value: string) => {
    try {
      const result = await setSearchEngineConfig(value);
      setSelectedEngine(value);
      setCurrentSearchEngineConfig(result);
    } catch (error) {
      message.error('切换失败');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className='container max-w-4xl mb-6 px-4 md:px-0 pt-6'>
      <div className='h-4 w-full mb-10'>
        <h2 className="text-xl font-bold mb-4 mt-6">{t('webSearch')}</h2>
      </div>

      <div className='flex flex-row justify-between mt-6 p-6 border border-gray-200 rounded-md items-center'>
        <div className='flex flex-col items-start'>
          <span className='text-sm font-medium'>{t('enableWebSearch')}</span>
          <span className='text-xs text-gray-500'>{t('enableWebSearchNotice')}</span>
        </div>
        <Switch checked={searchEnable} onChange={handleSearchEnable} />
      </div>

      {searchEnable && (
        <>
          <div className='flex flex-row justify-between mt-6 p-6 border border-gray-200 rounded-md'>
            <div className='flex items-center'>
              <span className='text-sm font-medium'>{t('webSearchProvider')}</span>
            </div>
            <div className='flex items-center'>
              <Select
                className='w-40'
                value={selectedEngine}
                onChange={handleEngineChange}
                options={[
                  { label: '博查', value: 'bocha' },
                  { label: 'Tavily', value: 'tavily' },
                  { label: 'Jina', value: 'jina' }
                ]}
              />
            </div>
          </div>

          {selectedEngine === 'tavily' && (
            <TavilySettings
              apiKey={currentSearchEngineConfig?.apiKey ?? null}
              onApiKeyChange={handleApikeyChange}
              onApiKeyBlur={handleApikeyChange}
            />
          )}

          {selectedEngine === 'bocha' && (
            <BochaSettings
              apiKey={currentSearchEngineConfig?.apiKey ?? null}
              onApiKeyChange={handleApikeyChange}
              onApiKeyBlur={handleApikeyChange}
            />
          )}

          {selectedEngine === 'jina' && (
            <JinaSettings
              apiKey={currentSearchEngineConfig?.apiKey ?? null}
              onApiKeyChange={handleApikeyChange}
              onApiKeyBlur={handleApikeyChange}
            />
          )}

          <div className='flex flex-col items-start mt-6 p-6 border border-gray-200 rounded-md'>
            <h3 className='text-base font-medium border-b w-full mb-4 pb-2'>{t('general')}</h3>

            {/* <div className='flex flex-row justify-between items-center my-2 w-full'>
              <span className='text-sm font-medium'>搜索增强模式</span>
              <Switch
                checked={currentSearchEngineConfig?.extractKeywords}
                onChange={handleExtractKeywordsChange}
              />
            </div> */}
            <div className='flex flex-row justify-between items-center my-2 w-full'>
              <span className='text-sm font-medium'>{t('searchResult')}</span>
              <div className='min-w-64'>
                <Slider
                  value={currentSearchEngineConfig?.maxResults}
                  max={20}
                  min={1}
                  marks={{ 1: '1', 20: '20', 5: t('defaultCount') }}
                  onChangeComplete={handleMaxResultsChangeCompleted}
                  onChange={handleMaxResultsChange}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SearchPage;