import { create } from 'zustand';

interface UserAvatarState {
  emoji: string | null;
  setEmoji: (emoji: string) => void;
  isUpdating: boolean;
  setIsUpdating: (isUpdating: boolean) => void;
}

const useUserAvatarStore = create<UserAvatarState>((set) => ({
  emoji: null,
  isUpdating: false,
  setEmoji: (emoji) => set({ emoji }),
  setIsUpdating: (isUpdating) => set({ isUpdating })
}));

export default useUserAvatarStore; 