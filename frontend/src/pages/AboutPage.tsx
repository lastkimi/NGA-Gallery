import React from 'react';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

const AboutPage: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div className="bg-white min-h-screen pb-12">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl md:text-4xl font-serif font-bold mb-8">{t('about.title')}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-serif">{t('about.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-lg leading-relaxed">
                  {t('about.description')}
                </p>
                <p className="text-lg leading-relaxed">
                  {t('about.purpose')}
                </p>
                
                <Separator />
                
                <div>
                  <h3 className="text-xl font-bold mb-3">{t('about.dataSource')}</h3>
                  <p className="mb-3">
                    {t('about.dataDescription')}
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li>
                      <a href="https://github.com/NationalGalleryOfArt/opendata" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                        {t('about.openData')} <ExternalLink size={14} />
                      </a>
                      <span className="text-neutral-600"> - {t('about.openDataDescription')}</span>
                    </li>
                    <li>
                      <a href="https://www.nga.gov/open-access-images.html" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                        {t('about.openImages')} <ExternalLink size={14} />
                      </a>
                      <span className="text-neutral-600"> - {t('about.openImagesDescription')}</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-neutral-50 p-4 rounded-md">
                  <p className="text-sm text-neutral-600">
                    {t('about.disclaimer')}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* Tech Stack section removed */}
          </div>
          
          <div className="md:col-span-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('about.quickLinks')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="link" className="justify-between p-0 h-auto" asChild>
                  <a href="https://www.nga.gov/" target="_blank" rel="noopener noreferrer">
                    {t('about.ngaOfficial')}
                    <ExternalLink size={14} />
                  </a>
                </Button>
                <Button variant="link" className="justify-between p-0 h-auto" asChild>
                  <a href="https://www.nga.gov/collection.html" target="_blank" rel="noopener noreferrer">
                    {t('about.ngaCollection')}
                    <ExternalLink size={14} />
                  </a>
                </Button>
                <Button variant="link" className="justify-between p-0 h-auto" asChild>
                  <a href="https://www.nga.gov/open-access-images.html" target="_blank" rel="noopener noreferrer">
                    {t('about.openAccessImages')}
                    <ExternalLink size={14} />
                  </a>
                </Button>
                <Separator className="my-3" />
                <Button variant="link" className="justify-between p-0 h-auto" asChild>
                  <a href="https://github.com/" target="_blank" rel="noopener noreferrer">
                    GitHub
                    <ExternalLink size={14} />
                  </a>
                </Button>
                <Button variant="link" className="justify-between p-0 h-auto" asChild>
                  <a href="https://commons.wikimedia.org/" target="_blank" rel="noopener noreferrer">
                    Wikimedia Commons
                    <ExternalLink size={14} />
                  </a>
                </Button>
              </CardContent>
            </Card>
            
            <Card className="bg-primary text-primary-foreground">
              <CardHeader>
                <CardTitle className="text-primary-foreground">{t('about.statistics')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>{t('about.totalArtworks')}</span>
                  <span className="font-bold text-xl">143,000+</span>
                </div>
                <Separator className="bg-primary-foreground/20" />
                <div className="flex justify-between items-center">
                  <span>{t('about.totalImages')}</span>
                  <span className="font-bold text-xl">130,000+</span>
                </div>
                <Separator className="bg-primary-foreground/20" />
                <div className="flex justify-between items-center">
                  <span>{t('about.license')}</span>
                  <span className="font-bold text-xl">CC0</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
