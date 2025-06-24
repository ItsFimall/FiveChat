'use client';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import useUserAvatarStore from '@/app/store/userAvatar';

const UserAvatarLoader = () => {
  const { emoji, setEmoji } = useUserAvatarStore();
  const { status } = useSession();

  useEffect(() => {
    if (status === 'authenticated' && !emoji) {
      // 只在未加载过头像的情况下加载
      fetchUserAvatar();
    }
  }, [status, emoji]);

  const fetchUserAvatar = async () => {
    try {
      const response = await fetch('/api/users/avatar');
      const data = await response.json();
      
      if (data.emoji) {
        setEmoji(data.emoji);
      }
    } catch (error) {
      console.error('Error fetching user avatar:', error);
    }
  };

  return null; // 这个组件不渲染任何UI
};

export default UserAvatarLoader;