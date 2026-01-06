import React from 'react';
import { useTranslation } from 'react-i18next';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-background">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          <nav>
            <h6 className="font-serif font-semibold text-sm uppercase tracking-wide mb-4 text-neutral-900 dark:text-neutral-100">{t('footer.explore')}</h6>
            <ul className="space-y-2">
              <li><a href="/collection" className="text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-50 transition-colors">{t('footer.allCollection')}</a></li>
              <li><a href="/timeline" className="text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-50 transition-colors">{t('footer.artTimeline')}</a></li>
              <li><a href="/analysis" className="text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-50 transition-colors">{t('footer.dataAnalysis')}</a></li>
            </ul>
          </nav>
          <nav>
            <ul className="space-y-2">
              <li><a href="/about" className="text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-50 transition-colors">{t('footer.aboutProject')}</a></li>
              <li><a href="#" className="text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-50 transition-colors">{t('footer.disclaimer')}</a></li>
            </ul>
          </nav>
        </div>
        
        <div className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800 text-center">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {t('footer.ngaDisclaimer')}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-2">
            {t('footer.dataCredit')}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
