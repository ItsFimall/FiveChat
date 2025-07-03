'use client'
import Link from 'next/link';
import Markdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import React, { useState, useEffect } from 'react';
import { Button, Form, Input, Switch, Skeleton, Avatar, message, Popconfirm, Alert } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, EditOutlined } from '@ant-design/icons';
import { getProviderInstance } from '@/app/utils';
import { useTranslations } from 'next-intl';
import { saveToServer, getProviderById } from '@/app/admin/llm/actions';
import { fetchLlmModels } from '@/app/admin/llm/actions';
import useModelListStore from '@/app/store/modelList';
import CheckApiModal from '@/app/components/admin/llm/CheckApiModal';
import EditModelModal from '@/app/components/admin/llm/EditModelModal';
import AddModelModal from '@/app/components/admin/llm/AddModelModal';
import RenameProviderModal from '@/app/components/admin/llm/RenameProviderModal';
import ModelList from '@/app/components/admin/llm/ModelList';
import { LLMModel, LLMModelProvider } from '@/types/llm';
import { getLlmOriginConfigByProvider } from '@/app/utils/llms';
import { deleteCustomProviderInServer } from '@/app/admin/llm/actions';
import { useRouter } from "next/navigation";

type FormValues = {
  isActive: boolean;
  apikey: string;
  endpoint: string;
}

const Settings = (props: { providerId: string }) => {
  const router = useRouter();
  const { initModelList, toggleProvider, deleteCustomProvider } = useModelListStore();
  const t = useTranslations('Admin.Models');
  const [isClient, setIsClient] = useState(false);
  const [isPending, setIsPending] = useState(true);
  const [provider, setProvider] = useState<LLMModelProvider | null>(null);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [formInitialValues, setFormInitialValues] = useState<FormValues>({
    isActive: false,
    apikey: '',
    endpoint: ''
  });

  const [isCheckApiModalOpen, setIsCheckApiModalOpen] = useState(false);
  const [isCustomModelModalOpen, setIsCustomModelModalOpen] = useState(false);
  const [isRenameProviderModalOpen, setIsRenameProviderModalOpen] = useState(false);
  const [isEditModelModalOpen, setIsEditModelModalOpen] = useState(false);
  const [curretEditModal, setCurretEditModal] = useState<LLMModel>();
  const [checkResult, setCheckResult] = useState('init');
  const [errorMessage, setErrorMessage] = useState('');
  const [inputEndpoint, setInputEndpoint] = useState('');
  const [form] = Form.useForm();

  const getEndpointBaseUrl = (providerId: string, inputUrl?: string | null) => {
    if (inputUrl) {
      return inputUrl;
    }
    const endpointMap = {
      'claude': 'https://api.anthropic.com/v1',
      'deepseek': 'https://api.deepseek.com/v1',
      'volcengine': 'https://ark.cn-beijing.volces.com/api/v3',
      'gemini': 'https://generativelanguage.googleapis.com',
      'moonshot': 'https://api.moonshot.cn/v1',
      'ollama': 'http://127.0.0.1:11434/v1',
      'openai': 'https://api.openai.com/v1',
      'openai_response': 'https://api.openai.com/v1',
      'qwen': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      'qianfan': 'https://qianfan.baidubce.com/v2',
      'siliconflow': 'https://api.siliconflow.cn/v1',
      'zhipu': 'https://open.bigmodel.cn/api/paas/v4',
      'hunyuan': 'https://api.hunyuan.cloud.tencent.com/v1',
      'openrouter': 'https://openrouter.ai/api/v1',
      'grok': 'https://api.x.ai/v1',
    }
    return endpointMap[providerId as keyof typeof endpointMap];
  }

  const getHelpLinks = (providerId: string) => {
    const helpLinks = {
      'openai': 'https://www.hivechat.net/docs/providers/openai',
      'claude': 'https://www.hivechat.net/docs/providers/claude',
      'gemini': 'https://www.hivechat.net/docs/providers/gemini',
      'moonshot': 'https://www.hivechat.net/docs/providers/moonshot',
      'qwen': 'https://www.hivechat.net/docs/providers/qwen',
      'deepseek': 'https://www.hivechat.net/docs/providers/deepseek',
      'volcengine': 'https://www.hivechat.net/docs/providers/volcengine',
      'qianfan': 'https://www.hivechat.net/docs/providers/qianfan',
      'siliconflow': 'https://www.hivechat.net/docs/providers/siliconflow',
      'ollama': 'https://www.hivechat.net/docs/providers/ollama',
      'hunyuan': 'https://www.hivechat.net/docs/providers/hunyuan',
      'zhipu': 'https://www.hivechat.net/docs/providers/zhipu',
      'grok': 'https://www.hivechat.net/docs/providers/xai',
      'openrouter': 'https://www.hivechat.net/docs/providers/openrouter',
    };
    const providers = Object.keys(helpLinks);
    if (providers.includes(providerId)) {
      return helpLinks[providerId as keyof typeof helpLinks];
    } else {
      return 'https://k2swpw8zgf.feishu.cn/wiki/J3FtwGumMi7k0vktB41cHvjTnTg';
    }
  }

  // 只有当 provider 存在时才初始化 chatbot
  const chatbot = provider ? getProviderInstance(props.providerId, provider.apiStyle) : null;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleDeleteProvider = async (providerId: string) => {
    try {
      message.success('删除成功');
      await deleteCustomProviderInServer(providerId);
      deleteCustomProvider(providerId);
      router.push(`/admin/llm`);
    } catch (error) {
      console.error('删除服务商失败:', error);
      message.error('删除失败，请检查网络或后台服务。');
    }
  }

  useEffect(() => {
    const fetchProviderData = async (): Promise<void> => {
      try {
        // 首先获取 provider 信息
        const providerData = await getProviderById(props.providerId);
        setProvider(providerData);
        setProviderError(null);

        // 然后获取配置和模型列表
        const result = await getLlmOriginConfigByProvider(providerData.id);
        const endpointUrl = getEndpointBaseUrl(providerData.id, result.endpoint?.trim());

        // 设置表单初始值
        const initialValues = {
          isActive: result.isActive || false,
          apikey: result.apikey || '',
          endpoint: endpointUrl,
        };
        setFormInitialValues(initialValues);
        setInputEndpoint(endpointUrl);

        const modelListResult = await fetchLlmModels(providerData.id);
        initModelList(modelListResult);

        setIsPending(false);
      } catch (error: any) {
        console.error('Error fetching provider data:', error);
        if (error.status === 404) {
          setProviderError('Provider not found');
          // 重定向到 404 页面或者 LLM 列表页面
          router.push('/admin/llm');
        } else {
          setProviderError(error.message || 'Failed to load provider data');
        }
        setIsPending(false);
      }
    };

    fetchProviderData();
  }, [initModelList, props.providerId, router]);

  if (!isClient) return null;

  // 如果有错误，显示错误信息
  if (providerError) {
    return (
      <div className='flex w-full flex-col items-center justify-center h-64'>
        <h2 className="text-red-500 text-lg mb-4">Error: {providerError}</h2>
        <Button onClick={() => router.push('/admin/llm')}>
          返回选择服务商
        </Button>
      </div>
    );
  }

  // 如果还在加载或者 provider 不存在，显示加载状态
  if (isPending || !provider) {
    return <Skeleton active style={{ 'marginTop': '1.5rem' }} />;
  }

  const onFinish = (values: FormValues) => {
    toggleProvider(provider.id, values.isActive);
    saveToServer(provider.id, { ...values, providerName: provider.providerName });
  };

  const checkApi = async (modelId: string) => {
    if (!chatbot) {
      setCheckResult('error');
      setErrorMessage('Provider not loaded');
      return;
    }

    setCheckResult('pending')
    const result = await chatbot.check(modelId, form.getFieldValue('apikey'), form.getFieldValue('endpoint'));
    if (result.status === 'success') {
      setCheckResult('success');
      setErrorMessage('');
    } else {
      setCheckResult('error');
      setErrorMessage(result.message || '');
    }
  };

  const getEndpointExtraNotice = (apiStyle: string, inputEndpoint: string) => {
    switch (apiStyle) {
      case 'claude':
        return <span className='ml-3'>{inputEndpoint + '/messages'}</span>
      case 'openai_response':
        return <span className='ml-3'>{inputEndpoint + '/responses'}</span>
      case 'gemini':
        return <span className='ml-3'>{inputEndpoint + '/v1beta/models/${model}:streamGenerateContent?alt=sse'}</span>
      default:
        return <span className='ml-3'>{inputEndpoint + '/chat/completions'}</span>
    }
  }

  return (
    <div className='flex w-full flex-col'>
      {props.providerId === 'openai_response' &&
        <Alert message={<span>OpenAI 默认使用新的 <Link href="https://platform.openai.com/docs/api-reference/responses/create" target='_blank'>Response 格式 API</Link> ，如果使用第三方 API 请新建服务商</span>} type='warning' />}
      <Form
        layout="vertical"
        form={form}
        onFinish={onFinish}
        initialValues={formInitialValues}
        key={provider?.id} // 使用 key 来强制重新渲染表单当 provider 改变时
      >
        <div className='flex flex-row justify-between my-4 items-center'>
          <div className='flex items-center justify-center'>
            {provider?.providerLogo ?
              <Avatar
                style={{ border: '1px solid #ddd', padding: '0.2rem' }}
                src={provider.providerLogo}
              />
              :
              <Avatar
                style={{ backgroundColor: '#1c78fa' }}
              >{provider?.providerName.charAt(0)}</Avatar>
            }
            <div className='flex flex-col ml-2'>
              <h2 className='font-medium text-lg mb-0 leading-5'>{provider?.providerName}
                {provider?.type === 'custom' &&
                  <Button
                    size='small'
                    type='text'
                    className='ml-2'
                    onClick={() => {
                      setIsRenameProviderModalOpen(true);
                    }}>
                    <EditOutlined style={{ fontSize: '12px', 'color': '#666' }} />
                  </Button>
                }
              </h2>
              <span className='text-xs text-gray-400'>{provider?.id}</span>
            </div>
          </div>
          <Form.Item name='isActive' style={{ 'margin': '0' }}>
            <Switch onChange={() => {
              form.submit();
            }} />
          </Form.Item>
        </div>
        <Form.Item label={<span className='font-medium'>API Key</span>} name='apikey'>
          <Input
            onBlur={() => {
              form.submit();
            }
            }
          />
        </Form.Item>
        <div className='felx text-sm text-gray-600 -mt-6 mb-2'>
          <Link
            href={getHelpLinks(props.providerId)}
            target='_blank'
          >
            <Button
              type='link'
              style={{ padding: '0' }}
            >
              {t('configGuide')}
            </Button>
          </Link>
        </div>
        <Form.Item
          label={<span className='font-medium'>{t('endpoint')} ({t('optional')})</span>}
          name='endpoint'
          extra={getEndpointExtraNotice(provider.apiStyle, inputEndpoint)}
        >
          <Input
            type='url'
            onChange={(e) => {
              setInputEndpoint(e.target.value);
              // 同时更新表单字段值
              // form.setFieldValue('endpoint', e.target.value);
            }}
            onBlur={() => {
              form.submit();
            }}
          />
        </Form.Item>
      </Form>
      <div className='flex flex-col -mt-2 mb-2'>
        <div className='font-medium'>{t('testConnect')}</div>
        <div className='my-2 flex flex-row items-center'>
          <Button loading={checkResult === 'pending'} onClick={() => {
            setIsCheckApiModalOpen(true);
          }}>{t('check')}</Button>
          <div className='ml-2 flex flex-row items-center' >
            {checkResult === 'success' &&
              <>
                <CheckCircleOutlined style={{ color: 'green', fontSize: '16px' }} />
                <span className="text-green-700 ml-1 text-sm">{t('checkSuccess')}</span>
              </>}
            {checkResult === 'error' &&
              <>
                <CloseCircleOutlined style={{ color: '#f87171', fontSize: '16px' }} />
                <span className="text-red-400 ml-1 text-sm">{t('checkFail')}</span>
              </>}
          </div>
        </div>
      </div>
      {checkResult === 'error' &&
        <div className='overflow-x-auto mb-4 bg-red-50 rounded-md p-1 text-xs'>
          <div className='overflow-x-auto p-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-red-50 scrollbar-track-rounded-full scrollbar-thumb-rounded-full'>
            <Markdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[
                [
                  rehypeHighlight,
                  {
                    detect: false,
                    ignoreMissing: true,
                  },
                ],
              ]}
            >{errorMessage}</Markdown>
          </div>
        </div>
      }
      <ModelList
        providerId={provider?.id}
        providerName={provider?.providerName}
        setCurretEditModal={setCurretEditModal}
        setIsEditModelModalOpen={setIsEditModelModalOpen}
        setIsCustomModelModalOpen={setIsCustomModelModalOpen}
      />
      {provider?.type === 'custom' &&
        <div className='w-full flex flex-row-reverse p-2'>
          <Popconfirm
            title="删除提示"
            description="确定删除此服务商吗？"
            onConfirm={() => {
              handleDeleteProvider(props.providerId)
            }}
            okText={t('confirm')}
            cancelText={t('cancel')}
          >
            <Button
              size='small'
              color="blue"
              variant="text"
            >
              <span className='text-gray-400 text-xs'>
                删除此服务商
              </span>
            </Button>
          </Popconfirm>
        </div>
      }
      <CheckApiModal
        isCheckApiModalOpen={isCheckApiModalOpen}
        setIsCheckApiModalOpenOpen={setIsCheckApiModalOpen}
        startCheck={checkApi}
      />

      <AddModelModal
        isCustomModelModalOpen={isCustomModelModalOpen}
        setIsCustomModelModalOpen={setIsCustomModelModalOpen}
        provider={provider}
      />
      <EditModelModal
        model={curretEditModal}
        isEditModelModalOpen={isEditModelModalOpen}
        setIsEditModelModalOpen={setIsEditModelModalOpen}
        provider={provider}
      />
      <RenameProviderModal
        isModalOpen={isRenameProviderModalOpen}
        setIsModalOpen={setIsRenameProviderModalOpen}
        providerId={provider?.id}
        providerName={provider?.providerName}
      />
    </div>
  );
};

export default Settings;
