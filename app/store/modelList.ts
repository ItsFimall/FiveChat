import { create } from 'zustand';
import { LLMModel, LLMModelProvider, LLMModelRealId } from '@/types/llm';
import { llmModelType } from '@/app/db/schema';

interface IModelListStore {
  currentModel: LLMModel;
  providerList: LLMModelProvider[];
  providerListByKey: { [key: string]: LLMModelProvider } | null;
  allProviderListByKey: { [key: string]: LLMModelProvider } | null;
  allProviderList: LLMModelProvider[];
  modelList: LLMModel[];
  modelListRealId: LLMModelRealId[];
  isPending: Boolean;
  setIsPending: (isPending: boolean) => void;
  initModelListRealId: (initModels: llmModelType[]) => Promise<void>;
  initModelList: (initModels: llmModelType[]) => void;
  setModelList: (newOrderModels: LLMModel[]) => void;
  setAllProviderList: (newProviderList: LLMModelProvider[]) => void; //排序
  initAllProviderList: (initModels: LLMModelProvider[]) => Promise<void>;
  addCustomProvider: (initModels: LLMModelProvider) => Promise<void>;
  renameProvider: (providerId: string, newName: string) => Promise<void>;
  deleteCustomProvider: (providerId: string) => Promise<void>;
  toggleProvider: (providerId: string, selected: boolean) => Promise<void>;
  changeSelect: (modelId: string, selected: boolean) => Promise<void>;
  addCustomModel: (model: LLMModel) => Promise<void>;
  updateCustomModel: (modelId: string, model: LLMModel) => Promise<void>;
  deleteCustomModel: (modelId: string) => Promise<void>;
  setCurrentModel: (model: string) => void;
  setCurrentModelExact: (providerId: string, modelId: string,) => void;
}

const useModelListStore = create<IModelListStore>((set, get) => ({
  currentModel: {
    id: 'deepseek-chat',
    displayName: 'Deepseek V3',
    supportVision: true,
    supportTool: true,
    maxTokens: 131072,
    selected: true,
    provider: {
      id: 'Deepseek',
      providerName: 'Deepseek',
      apiStyle: 'openai'
    }
  },
  providerList: [],
  providerListByKey: null,
  allProviderListByKey: null,
  allProviderList: [],
  modelList: [],
  modelListRealId: [],
  isPending: true,
  setIsPending: (isPending: boolean) => {
    set((state) => ({
      ...state,
      isPending, // 更新 isPending 状态
    }));
  },
  setAllProviderList: (newProviderList: LLMModelProvider[]) => {
    set((state) => ({
      ...state,
      allProviderList: newProviderList,
    }));
  },
  setModelList: (newOrderModels: LLMModel[]) => {
    set((state) => ({
      ...state,
      modelList: newOrderModels,
    }));
  },
  initModelList: (initModels: llmModelType[]) => {
    const newData = initModels.map((model) => ({
      id: model.name,
      displayName: model.displayName,
      maxTokens: model.maxTokens || undefined,
      supportVision: model.supportVision || undefined,
      supportTool: model.supportTool || undefined,
      builtInImageGen: model.builtInImageGen || false,
      builtInWebSearch: model.builtInWebSearch || false,
      selected: model.selected || false,
      type: model.type ?? 'default',
      provider: {
        id: model.providerId,
        providerName: model.providerName,
        apiStyle: model.apiStyle,
      }
    }));

    const providerList = Array.from(
      new Map(
        initModels.map((model) => [
          model.providerId,
          {
            id: model.providerId,
            providerName: model.providerName,
            providerLogo: model.providerLogo,
            apiStyle: model.apiStyle,
            status: true,
          }
        ])
      ).values()
    );

    set((state) => ({
      ...state,
      providerList,
      modelList: newData,
    }));

  },
  initModelListRealId: async (initModels: llmModelType[]) => {
    const newData = initModels.map((model) => ({
      id: model.id,
      name: model.name,
      displayName: model.displayName,
      maxTokens: model.maxTokens || undefined,
      supportVision: model.supportVision || undefined,
      supportTool: model.supportTool || undefined,
      selected: model.selected || false,
      type: model.type ?? 'default',
      provider: {
        id: model.providerId,
        providerName: model.providerName,
        apiStyle: model.apiStyle,
        providerLogo: model.providerLogo,
      }
    }));

    const providerList = Array.from(
      new Map(
        initModels.map((model) => [
          model.providerId,
          {
            id: model.providerId,
            providerName: model.providerName,
            providerLogo: model.providerLogo,
            apiStyle: model.apiStyle,
            status: true,
          }
        ])
      ).values()
    );

    set((state) => ({
      ...state,
      providerList,
      modelListRealId: newData,
    }));

  },
  initAllProviderList: async (providers: LLMModelProvider[]) => {
    const providerByKey = providers.reduce<{ [key: string]: LLMModelProvider }>((result, provider) => {
      result[provider.id] = provider;
      return result;
    }, {});

    set((state) => ({
      ...state,
      allProviderList: providers,
      allProviderListByKey: providerByKey,
    }));
  },
  setCurrentModelExact: (providerId: string, modelId: string) => {
    set((state) => {
      // 检查新模型是否与当前模型相同
      if (!(state.currentModel.id === modelId && state.currentModel.provider.id === providerId)) {
        const modelInfo = state.modelList.find(m => (m.id === modelId && m.provider.id === providerId));
        if (modelInfo) {
          return {
            ...state,
            currentModel: modelInfo,
          };
        } else {
          return state;
        }
      }
      return state;
    });
  },
  setCurrentModel: (modelId: string) => {
    set((state) => {
      // 检查新模型是否与当前模型相同
      if (state.currentModel?.id !== modelId) {
        const modelInfo = state.modelList.find(m => m.id === modelId);
        if (modelInfo) {
          return {
            ...state,
            currentModel: modelInfo,
          };
        } else {
          return state;
        }
      }
      return state;
    });
  },

  toggleProvider: async (providerId: string, selected: boolean) => {
    set((state) => ({
      ...state,
      allProviderList: state.allProviderList.map((item) =>
        item.id === providerId ? { ...item, status: selected } : item
      ),
    }));
  },

  addCustomProvider: async (provider: LLMModelProvider) => {
    set((state) => {
      const newAllProviderList = [...state.allProviderList, provider];
      const newAllProviderListByKey = {
        ...state.allProviderListByKey,
        [provider.id]: provider,
      };
      return {
        ...state,
        allProviderList: newAllProviderList,
        allProviderListByKey: newAllProviderListByKey,
      };
    });
  },

  renameProvider: async (providerId: string, newName: string) => {
    set((state) => {
      // 更新 allProviderList
      const newAllProviderList = state.allProviderList.map((provider) =>
        provider.id === providerId ? { ...provider, providerName: newName } : provider
      );

      // 更新 allProviderListByKey
      const newAllProviderListByKey = {
        ...state.allProviderListByKey,
        [providerId]: {
          ...state.allProviderListByKey![providerId],
          providerName: newName,
        },
      };

      return {
        ...state,
        allProviderList: newAllProviderList,
        allProviderListByKey: newAllProviderListByKey,
      };
    });
  },

  deleteCustomProvider: async (providerId: string) => {
    set((state) => {
      const newAllProviderList = state.allProviderList.filter(
        (provider) => provider.id !== providerId
      );

      const { [providerId]: _, ...newAllProviderListByKey } = state.allProviderListByKey || {};

      return {
        ...state,
        allProviderList: newAllProviderList,
        allProviderListByKey: newAllProviderListByKey,
      };
    });
  },

  changeSelect: async (modelId: string, selected: boolean) => {
    set((state) => ({
      ...state,
      modelList: state.modelList.map((model) =>
        model.id === modelId ? { ...model, selected } : model
      ),
    }));
  },
  addCustomModel: async (model: LLMModel) => {
    // 更新状态中的 modelList
    set((state) => ({
      ...state,
      modelList: [...state.modelList, model],
    }));
  },
  updateCustomModel: async (modelId: string, model: LLMModel) => {
    // 更新状态中的 modelList
    set((state) => ({
      ...state,
      modelList: state.modelList.map((existingModel) =>
        existingModel.id === modelId ? { ...existingModel, ...model } : existingModel
      ),
    }));
  },

  deleteCustomModel: async (modelId: string) => {
    set((state) => ({
      ...state,
      modelList: state.modelList.filter((model) => model.id !== modelId),
    }));
  },
}));

export default useModelListStore;