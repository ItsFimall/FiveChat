'use client'
import React from 'react';
import { Image as AntdImage } from "antd";
import CloseIcon from '@/app/images/close.svg';

interface ImagePreviewAreaProps {
  uploadedImages: Array<{
    file?: File;
    url: string;
  }>;
  removeImage: (index: number) => void;
}

const ImagePreviewArea: React.FC<ImagePreviewAreaProps> = ({ uploadedImages, removeImage }) => {
  if (uploadedImages.length === 0) return null;
  
  return (
    <div className="h-24 flex flex-col bg-gray-50 justify-center items-center">
      <div className='flex flex-row h-16 max-w-3xl pl-2 w-full'>
        {uploadedImages.map((image, index) => (
          <div key={index} className="relative group mr-4 h-16 w-16">
            <AntdImage alt=''
              className='block border h-full w-full rounded-md object-cover cursor-pointer'
              height={64}
              width={64}
              src={image.url}
              preview={{
                mask: false
              }}
            />
            <div
              className="absolute bg-white rounded-full -top-2 -right-2 cursor-pointer hidden group-hover:block"
              onClick={() => removeImage(index)}
            >
              <CloseIcon className='w-5 h-5' alt='close' />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImagePreviewArea; 