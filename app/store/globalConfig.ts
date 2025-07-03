import { create } from 'zustand';

interface IGlobalConfigStoreStore {
  searchEnable: boolean;
  chatNamingModel: string;
  setChatNamingModel: (newChatNamingModel: string) => void;
  setSearchEnable: (value: boolean) => void;
}

const useGlobalConfigStore = create<IGlobalConfigStoreStore>((set) => ({
  searchEnable: false,
  chatNamingModel: 'current',
  setChatNamingModel: (value: string) => {
    set({ chatNamingModel: value });
  },
  setSearchEnable: (value: boolean) => {
    set({ searchEnable: value });
  },

}))

export default useGlobalConfigStore
