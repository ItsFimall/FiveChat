'use client'
import React from 'react';
import { Button } from 'antd';
import { DownOutlined } from '@ant-design/icons';

interface ScrollToBottomButtonProps {
  visible: boolean;
  onClick: () => void;
}

const ScrollToBottomButton: React.FC<ScrollToBottomButtonProps> = ({ visible, onClick }) => {
  if (!visible) return null;

  return (
    <Button
      shape="circle"
      icon={<DownOutlined />}
      onClick={onClick}
      style={{
        position: 'absolute',
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        boxShadow: 'rgb(173 164 164 / 21%) 1px 1px 3px 3px',
      }}
    />
  );
};

export default ScrollToBottomButton;