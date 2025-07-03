'use client';
import AuthProviderConfig from '@/app/components/admin/AuthProviderConfig';
import { Button } from 'antd';
import ToggleSidebar from "@/app/images/hideSidebar.svg";
import useAdminSidebarCollapsed from '@/app/store/adminSidebarCollapsed';
import { useTranslations } from 'next-intl';

const Userpage = () => {
  const t = useTranslations('Admin.System');
  const { isSidebarCollapsed, toggleSidebar } = useAdminSidebarCollapsed();
  return (
    <div className='flex flex-col w-full items-center'>
      <div className='flex flex-row w-full items-center h-10 px-1'>
        {isSidebarCollapsed &&
          <Button
            icon={<ToggleSidebar style={{ 'color': '#999', 'fontSize': '20px', 'verticalAlign': 'middle' }} />}
            type='text'
            onClick={toggleSidebar}
          />
        }
      </div>
      <div className='container max-w-3xl mb-6 px-4 md:px-2 pb-8 h-auto'>
        <div className='h-4 w-full mb-10'>
          <h2 className="text-xl font-bold mb-4 mt-6">{t('system')}</h2>
        </div>
        <AuthProviderConfig />
        <div className='h-6'></div>
      </div>
    </div>
  )
}

export default Userpage