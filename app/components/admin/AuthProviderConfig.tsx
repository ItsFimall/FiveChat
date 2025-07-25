'use client';
import { useState, useEffect } from 'react'
import { Button } from "antd";
import { getActiveAuthProvides } from '@/app/(auth)/actions';
import EmailLogo from '@/app/images/loginProvider/email.svg'
import EmailSettingsModal from '@/app/components/admin/EmailSettingsModal'

const AuthProviderConfig = () => {
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [authProviders, setAuthProviders] = useState<string[]>([]);

  useEffect(() => {
    const fetchSettings = async () => {
      const activeAuthProvides = await getActiveAuthProvides();
      setAuthProviders(activeAuthProvides);
    }
    fetchSettings();
  }, []);



  return (
    <div className='flex flex-col mt-6 p-2 rounded-md bg-gray-100'>
      <h3 className='ml-2 my-2'>登录设置</h3>

      {/* 邮箱登录配置 */}
      <div className='flex flex-row items-center m-2 p-4 justify-between bg-white rounded-lg'>
        <div className='flex flex-row items-center'>
          <EmailLogo className='border border-gray-200 p-2 w-10 h-10 rounded-lg' />
          <span className='ml-2'>邮箱登录</span>
        </div>
        <div className='flex flex-row items-center'>
          {authProviders.includes('email') ? <>
            <div className='w-2 h-2 bg-green-500 rounded m-2'></div>
            <span className='mr-4 text-sm'>已启用</span>
          </> :
            <>
              <div className='w-2 h-2 bg-gray-400 rounded m-2'></div>
              <span className='mr-4 text-sm'>未启用</span>
            </>
          }
          <Button
            onClick={() => {
              setIsEmailModalOpen(true);
            }}
          >设置</Button>
        </div>
      </div>



      <EmailSettingsModal
        isModalOpen={isEmailModalOpen}
        setIsModalOpen={setIsEmailModalOpen}
      />

    </div>
  )
}

export default AuthProviderConfig