// src/components/search/SearchBar.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearch } from '@/src/hooks/useSearch';
import { clearSearchHistory } from '@/src/services/searchService';
import SearchDropdown from './SearchDropdown';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  onSearchComplete?: () => void;
}

export default function SearchBar({
  className,
  inputClassName,
  placeholder,
  onSearchComplete
}: SearchBarProps) {
  const t = useTranslations('navigation');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [localQuery, setLocalQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const {
    query,
    setQuery,
    quickResults,
    suggestions,
    queryCompletions,
    brandSuggestions,
    isQuickLoading,
    handleSearch,
    clearSearch,
  } = useSearch();

  // Sync local query with hook query
  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  // Handle input change
  const handleInputChange = (value: string) => {
    setLocalQuery(value);
    setQuery(value);

    // Show dropdown when typing
    if (value.trim() || (!value && suggestions)) {
      setIsDropdownOpen(true);
    } else {
      setIsDropdownOpen(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (localQuery.trim()) {
      handleSearch(localQuery);
      setIsDropdownOpen(false);
      inputRef.current?.blur();
      onSearchComplete?.();
    }
  };

  // Handle search from dropdown
  const handleDropdownSearch = (searchQuery: string) => {
    setLocalQuery(searchQuery);
    setQuery(searchQuery);
    handleSearch(searchQuery);
    inputRef.current?.blur();
    onSearchComplete?.();
  };

  // Handle clear
  const handleClear = () => {
    setLocalQuery('');
    clearSearch();
    setIsDropdownOpen(false);
    inputRef.current?.focus();
  };

  // Handle clear history
  const handleClearHistory = () => {
    clearSearchHistory();
    // Force refresh suggestions
    window.location.reload();
  };

  // Handle focus
  const handleFocus = () => {
    // Show dropdown if we have suggestions or query
    if (localQuery.trim() || suggestions) {
      setIsDropdownOpen(true);
    }
  };

  // Handle blur (with delay for dropdown clicks)
  const handleBlur = () => {
    setTimeout(() => {
      // Check if the focus is still within the form or dropdown
      if (!formRef.current?.contains(document.activeElement)) {
        setIsDropdownOpen(false);
      }
    }, 200);
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className={cn("relative w-full", className)}
    >
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder || t('searchProducts')}
          className={cn(
            "w-full pl-12 pr-12 py-3 rounded-full border border-gray-200 bg-gray-50",
            "focus:bg-white focus:border-brand-dark focus:ring-0 outline-none",
            "transition-all font-medium placeholder-gray-400",
            "hover:border-gray-300",
            inputClassName
          )}
        />

        {/* Search Icon */}
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />

        {/* Loading/Clear/Search Button */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isQuickLoading ? (
            <div className="p-2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          ) : localQuery ? (
            <>
              <button
                type="button"
                onClick={handleClear}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Clear search"
              >
                <X size={16} className="text-gray-500" />
              </button>
              <button
                type="submit"
                className="p-2 rounded-full bg-brand-dark text-white hover:bg-brand-red transition-colors"
                aria-label="Search"
              >
                <Search size={16} />
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Search Dropdown */}
      <SearchDropdown
        query={localQuery}
        quickResults={quickResults}
        suggestions={suggestions}
        queryCompletions={queryCompletions}
        brandSuggestions={brandSuggestions}
        isLoading={isQuickLoading}
        isOpen={isDropdownOpen}
        onClose={() => setIsDropdownOpen(false)}
        onSearchSubmit={handleDropdownSearch}
        onClearHistory={handleClearHistory}
      />
    </form>
  );
}