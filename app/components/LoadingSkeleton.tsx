'use client'
import React from 'react';
import { Skeleton } from "antd";

const LoadingSkeleton = React.memo(() => (
  <div className="flex container px-2 mx-auto max-w-screen-md w-full flex-col justify-center items-center">
    <div className='items-start mb-8 flex max-w-3xl w-full flex-row-reverse pl-4'>
      <div className='flex ml-10 flex-col mt-4 items-end'>
        <Skeleton active title={false} paragraph={{ rows: 2, width: 400 }} />
      </div>
    </div>
    <Skeleton avatar={{ size: 'default' }} active title={false} paragraph={{ rows: 4, width: ['60%', '60%', '100%', '100%'] }} />
  </div>
));

LoadingSkeleton.displayName = 'LoadingSkeleton';

export default LoadingSkeleton; 