import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Menu, Home, Image, Clock, BarChart2, Info, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';

interface HeaderProps {
  onSearch?: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onSearch }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const menuItems = [
    { text: t('common.home'), icon: <Home size={18} />, path: '/' },
    { text: t('common.collection'), icon: <Image size={18} />, path: '/collection' },
    { text: t('common.timeline'), icon: <Clock size={18} />, path: '/timeline' },
    { text: t('common.analysis'), icon: <BarChart2 size={18} />, path: '/analysis' },
    { text: t('common.about'), icon: <Info size={18} />, path: '/about' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/95 dark:bg-background backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-16 md:h-20 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <img src="/logo.svg" alt="OpenArt Logo" className="h-8 md:h-10 w-auto dark:brightness-0 dark:invert" />
            <div className="flex flex-col">
              <span className="text-xl md:text-2xl font-serif font-bold tracking-tight text-neutral-900 dark:text-neutral-900 leading-none group-hover:text-neutral-700 dark:group-hover:text-neutral-700 transition-colors">
                OpenArt
              </span>
              <span className="text-[10px] md:text-xs font-medium tracking-widest uppercase text-neutral-500 dark:text-neutral-600">
                全球艺术典藏
              </span>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {menuItems.map((item) => (
              <Button
                key={item.path}
                asChild
                variant="ghost"
                className="flex items-center gap-2 text-neutral-600 dark:text-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-900 transition-colors [&>svg]:text-neutral-600 [&>svg]:dark:text-neutral-900 [&>svg]:hover:text-neutral-900 [&>svg]:dark:hover:text-neutral-900"
              >
                <Link to={item.path}>
                  {item.icon}
                  {item.text}
                </Link>
              </Button>
            ))}
          </nav>
          
          {/* Search & Mobile Menu */}
          <div className="flex items-center gap-2 flex-1 justify-end md:justify-end md:flex-none">
            
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Language Switcher */}
            <LanguageSwitcher />
            
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-neutral-600 dark:text-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-900 [&>svg]:text-neutral-600 [&>svg]:dark:text-neutral-900 [&>svg]:hover:text-neutral-900 [&>svg]:dark:hover:text-neutral-900"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>
        </div>
      </div>
      
          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-background">
              <div className="container mx-auto px-4 py-4 space-y-1">
                {menuItems.map((item) => (
                  <Button
                    key={item.path}
                    asChild
                    variant="ghost"
                    className="w-full justify-start gap-3 text-neutral-600 dark:text-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-900 [&>svg]:text-neutral-600 [&>svg]:dark:text-neutral-900 [&>svg]:hover:text-neutral-900 [&>svg]:dark:hover:text-neutral-900"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link to={item.path}>
                      {item.icon}
                      {item.text}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          )}
    </header>
  );
};

export default Header;
