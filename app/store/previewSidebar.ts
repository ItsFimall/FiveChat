import { create } from 'zustand';

// 定义内容类型
export type ContentType = 'svg' | 'html';

// 通用预览侧边栏状态接口
interface IPreviewSidebarStore {
  isOpen: boolean;
  contentType: ContentType | null;
  content: string;
  activeTab: 'code' | 'preview';
  activeCardId: string | null;
  width: number; // 侧边栏宽度（像素值）
  setIsOpen: (value: boolean) => void;
  setContent: (content: string, type: ContentType) => void;
  setActiveTab: (tab: 'code' | 'preview') => void;
  setActiveCardId: (id: string | null) => void;
  setWidth: (width: number) => void;
  toggleSidebar: () => void;
  resetActiveCard: () => void;
}

// 创建通用预览侧边栏状态管理
const usePreviewSidebarStore = create<IPreviewSidebarStore>((set, get) => ({
  isOpen: false,
  contentType: null,
  content: '',
  activeTab: 'preview',
  activeCardId: null,
  width: 0, // 初始宽度为0，打开时会计算默认宽度
  
  setIsOpen: (value: boolean) => {
    set((state) => {
      const newState: Partial<IPreviewSidebarStore> = { isOpen: value };
      
      // 如果侧边栏关闭，清除活动卡片
      if (!value) {
        newState.activeCardId = null;
      } else {
        // 如果侧边栏打开，设置默认宽度为窗口宽度的40%
        const defaultWidth = Math.floor(window.innerWidth * 0.4);
        newState.width = defaultWidth;
      }
      
      return newState;
    });
  },
  
  setContent: (content: string, type: ContentType) => {
    set({ 
      content: content,
      contentType: type
    });
  },
  
  setActiveTab: (tab: 'code' | 'preview') => {
    set({ activeTab: tab });
  },
  
  setActiveCardId: (id: string | null) => {
    set({ activeCardId: id });
  },
  
  setWidth: (width: number) => {
    const minWidth = 320;
    const maxWidth = Math.floor(window.innerWidth * 0.68);
    const clampedWidth = Math.max(minWidth, Math.min(width, maxWidth));
    set({ width: clampedWidth });
  },
  
  toggleSidebar: () => {
    set((state) => ({ isOpen: !state.isOpen }));
  },
  
  resetActiveCard: () => {
    set({ activeCardId: null });
  },
}));

export default usePreviewSidebarStore;
