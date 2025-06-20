import React, { useState } from 'react';
import { Modal, Input, Radio, Button, message, Space, Tooltip } from 'antd';
import { useTranslations } from 'next-intl';
import { CopyOutlined } from '@ant-design/icons';
import {CopyToClipboard} from 'react-copy-to-clipboard';

interface ShareChatModalProps {
  chatId: string;
  open: boolean;
  onClose: () => void;
}

const ShareChatModal = ({ chatId, open, onClose }: ShareChatModalProps) => {
  const t = useTranslations('Chat');
  const [password, setPassword] = useState('');
  const [expiresIn, setExpiresIn] = useState(0); // 0 for never
  const [loading, setLoading] = useState(false);
  const [sharedLink, setSharedLink] = useState('');

  const handleShare = async () => {
    setLoading(true);
    try {
      let shareExpiresAt = null;
      if (expiresIn > 0) {
        shareExpiresAt = new Date(Date.now() + expiresIn).toISOString();
      }

      const response = await fetch(`/api/chats/${chatId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sharePassword: password,
          shareExpiresAt,
        }),
      });

      if (response.ok) {
        const newSharedLink = `${window.location.origin}/share/${chatId}`;
        setSharedLink(newSharedLink);
        message.success(t('shareSuccess'));
      } else {
        throw new Error(t('shareFailed'));
      }
    } catch (error) {
      message.error(t('shareFailed'));
      console.error('Failed to share chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    message.success(t('copySuccess'));
    onClose();
  };
  
  const expirationOptions = [
    { label: t('neverExpire'), value: 0 },
    { label: t('expireIn1Hour'), value: 3600 * 1000 },
    { label: t('expireIn1Day'), value: 24 * 3600 * 1000 },
    { label: t('expireIn7Days'), value: 7 * 24 * 3600 * 1000 },
  ];

  const renderInitialView = () => (
    <>
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <label htmlFor="password">{t('passwordProtection')}</label>
          <Input.Password
            id="password"
            placeholder={t('passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label>{t('expirationTime')}</label>
          <Radio.Group
            onChange={(e) => setExpiresIn(e.target.value)}
            value={expiresIn}
          >
            <Space direction="vertical">
             {expirationOptions.map(opt => <Radio key={opt.value} value={opt.value}>{opt.label}</Radio>)}
            </Space>
          </Radio.Group>
        </div>
      </Space>
      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Button onClick={onClose} style={{ marginRight: 8 }}>
          {t('cancel')}
        </Button>
        <Button type="primary" loading={loading} onClick={handleShare}>
          {t('createAndCopyLink')}
        </Button>
      </div>
    </>
  );

  const renderSharedLinkView = () => (
    <div>
        <p>{t('shareLinkNotice')}</p>
        <Input
            value={sharedLink}
            readOnly
            addonAfter={
                <CopyToClipboard text={sharedLink} onCopy={handleCopy}>
                    <Tooltip title={t('copyLink')}>
                        <Button type="text" icon={<CopyOutlined />} />
                    </Tooltip>
                </CopyToClipboard>
            }
        />
    </div>
  );

  return (
    <Modal
      title={t('shareChat')}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
        {sharedLink ? renderSharedLinkView() : renderInitialView()}
    </Modal>
  );
};

export default ShareChatModal; 