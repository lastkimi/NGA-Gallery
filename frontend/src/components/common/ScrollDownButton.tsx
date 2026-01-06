import React, { useState, useEffect } from 'react';
import { ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ScrollDownButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkScrollPosition = () => {
      // Show unless we are near the bottom
      const isNearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;
      setIsVisible(!isNearBottom);
    };

    window.addEventListener('scroll', checkScrollPosition);
    // Initial check
    checkScrollPosition();
    return () => window.removeEventListener('scroll', checkScrollPosition);
  }, []);

  const handleScrollDown = () => {
    // Scroll to the bottom of the page
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        "fixed bottom-8 right-8 z-[90] rounded-full shadow-lg transition-all duration-300 bg-white hover:bg-neutral-100 border-neutral-200",
        "md:bottom-8 md:right-8", 
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
      )}
      onClick={handleScrollDown}
      title="Scroll Down"
    >
      <ArrowDown size={20} className="text-black" />
    </Button>
  );
};

export default ScrollDownButton;
