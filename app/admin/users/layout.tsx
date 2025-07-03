'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, MenuProps, Button } from 'antd';
import ToggleSidebar from "@/app/images/hideSidebar.svg";
import useAdminSidebarCollapsed from '@/app/store/adminSidebarCollapsed';
import { useTranslations } from 'next-intl';

const UserListPage = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const t = useTranslations('Admin.Users');
  const pathname = usePathname();
  const [current, setCurrent] = useState('');
  const { isSidebarCollapsed, toggleSidebar } = useAdminSidebarCollapsed();
  const items = [
    {
      label: <Link href="/admin/users/list">{t('userList')}</Link>,
      key: 'list',
    },
    {
      label: <Link href="/admin/users/group">{t('groupManagement')}</Link>,
      key: 'group',
    },
  ];

  const onClick: MenuProps['onClick'] = (e) => {
    setCurrent(e.key);
  };

  useEffect(() => {
    if (pathname === '/admin/users/list') {
      setCurrent('list');
    } else if (pathname === '/admin/users/group') {
      setCurrent('group');
    }
  }, [pathname]);
  return (
    <div className='flex flex-col w-full items-center'>
      <div className='flex flex-row w-full items-center h-10 px-1'>
        {isSidebarCollapsed &&
          <Button
            icon={<ToggleSidebar style={{ 'color':'#999','fontSize': '20px', 'verticalAlign': 'middle' }} />}
            type='text'
            onClick={toggleSidebar}
          />
        }
      </div>
      <div className='container mb-6 px-8'>
        <Menu onClick={onClick} selectedKeys={[current]} mode="horizontal" items={items} />
        {children}
      </div>
    </div>
  );
};

export default UserListPage;