'use client';
import React from 'react';

export default function LLMLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className='flex flex-col w-full'>
      <div className='w-full flex flex-row' >
        <div className='w-0 grow overflow-y-auto'>
          <div className='container mx-auto max-w-4xl p-6 h-dvh'>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}