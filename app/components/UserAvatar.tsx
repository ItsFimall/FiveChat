import React, { useEffect, useState } from 'react';
import { Avatar, Modal, message } from 'antd';
import { EmojiPicker } from './EmojiPicker';
import useUserAvatarStore from '@/app/store/userAvatar';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';

interface UserAvatarProps {
  size?: number;
  showPopover?: boolean;
  className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  size = 32, 
  showPopover = true,
  className = 'bg-blue-500 text-white'
}) => {
  const { emoji, setEmoji, isUpdating, setIsUpdating } = useUserAvatarStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const t = useTranslations('Chat');
  const { status } = useSession();
  
  // 加载用户的emoji头像
  useEffect(() => {
    if (status === 'authenticated') {
      fetchUserAvatar();
    }
  }, [status]);

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

  const handleAvatarClick = () => {
    if (status !== 'authenticated') {
      message.info('请先登录');
      return;
    }
    if (showPopover) {
      setIsModalOpen(true);
    }
  };

  const handleEmojiSelect = async (selectedEmoji: string) => {
    try {
      setIsUpdating(true);
      const response = await fetch('/api/users/avatar', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emoji: selectedEmoji }),
      });

      if (response.ok) {
        setEmoji(selectedEmoji);
        message.success(t('avatarUpdated') || '头像已更新');
        setIsModalOpen(false);
      } else {
        message.error(t('avatarUpdateFailed') || '头像更新失败');
      }
    } catch (error) {
      console.error('Error updating user avatar:', error);
      message.error(t('avatarUpdateFailed') || '头像更新失败');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <Avatar 
        size={size} 
        className={`cursor-pointer ${className}`}
        onClick={handleAvatarClick}
      >
        {emoji || 'U'}
      </Avatar>

      <Modal
        title={t('selectAvatar') || "选择头像"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <div className="flex justify-center p-4">
          <EmojiPicker 
            onEmojiSelect={handleEmojiSelect}
            currentEmoji={emoji || undefined}
          />
        </div>
      </Modal>
    </>
  );
};

export default UserAvatar; 