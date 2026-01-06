// frontend/src/components/common/ThemeToggle.tsx
import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // Check local storage or system preference
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('theme');
      if (stored === 'dark' || stored === 'light') return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark'); // For daisyUI if needed, but we mostly use shadcn
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="text-neutral-600 dark:text-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-900 transition-colors [&>svg]:text-neutral-600 [&>svg]:dark:text-neutral-900 [&>svg]:hover:text-neutral-900 [&>svg]:dark:hover:text-neutral-900"
      title={theme === 'light' ? "Switch to dark mode" : "Switch to light mode"}
    >
      {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
    </Button>
  );
};

export default ThemeToggle;
