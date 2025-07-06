import React from 'react';
import SearchIcon from "@/app/images/searchIcon.svg";
import clsx from 'clsx';

interface SearchButtonProps {
  searchEnable: boolean;
  localSearchEnable: boolean;
  onToggle: () => void;
}

const SearchButton: React.FC<SearchButtonProps> = ({
  searchEnable,
  localSearchEnable,
  onToggle,
}) => {
  if (!searchEnable) {
    return <div></div>;
  }

  return (
    <div
      className={clsx('flex h-7 flex-row items-center pr-3 pl-2 search-button-custom py-1 cursor-pointer rounded-2xl border',
        {
          'bg-blue-100 border-blue-400 text-blue-700 hover:bg-blue-100': localSearchEnable,
          'hover:bg-gray-100': !localSearchEnable
        })}
      onClick={onToggle}
    >
      <SearchIcon style={{ fontSize: '16px'}} />
      <span className='text-xs ml-1'>联网</span>
    </div>
  );
};

export default SearchButton; 