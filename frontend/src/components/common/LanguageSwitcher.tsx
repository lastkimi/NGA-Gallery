import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../../lib/i18n';
import { Globe } from 'lucide-react';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-md text-neutral-600 dark:text-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors [&>svg]:text-neutral-600 [&>svg]:dark:text-neutral-900 [&>svg]:hover:text-neutral-900 [&>svg]:dark:hover:text-neutral-900"
        aria-label="Select language"
      >
        <Globe size={18} />
        <span className="hidden sm:inline text-sm font-medium">
          {currentLanguage.flag} {currentLanguage.name}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-neutral-800 rounded-md shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-50">
          {SUPPORTED_LANGUAGES.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors flex items-center gap-2 ${
                i18n.language === language.code ? 'bg-neutral-50 dark:bg-neutral-700 font-medium text-neutral-900 dark:text-neutral-900' : 'text-neutral-600 dark:text-neutral-900'
              }`}
            >
              <span>{language.flag}</span>
              <span>{language.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
