import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Share2, Heart, ZoomIn, Info, Loader2, ScanEye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useInView } from 'react-intersection-observer';
import { objectsApi } from '../services/api';
import type { Object as ObjectType } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import ImageViewer from '../components/common/ImageViewer';
import { useTranslatedFields } from '../hooks/useTranslatedFields';

const RELATED_PAGE_SIZE = 12;

const ObjectDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [object, setObject] = useState<ObjectType | null>(null);
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  
  // Related objects state
  const [relatedObjects, setRelatedObjects] = useState<ObjectType[]>([]);
  const [isRelatedLoading, setIsRelatedLoading] = useState(false);
  
  // Strategy state
  const [relatedStrategy, setRelatedStrategy] = useState<'artist' | 'class_dept' | 'class' | 'random'>('artist');
  const [relatedPage, setRelatedPage] = useState(1);
  const [hasMoreRelated, setHasMoreRelated] = useState(true);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewerImageUrl, setViewerImageUrl] = useState<string>('');
  
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '200px',
  });

  const translated = useTranslatedFields(object);
  
  // Reset state when ID changes
  useEffect(() => {
    window.scrollTo(0, 0);
    setRelatedObjects([]);
    setRelatedPage(1);
    setHasMoreRelated(true);
    setSeenIds(new Set([id || '']));
    setIsImmersiveMode(false);
  }, [id]);

  useEffect(() => {
    const fetchObject = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const data = await objectsApi.getDetails(id);
        setObject(data);
        
        // Determine initial strategy
        if (data.attribution && data.attribution !== 'Unknown Artist') {
          setRelatedStrategy('artist');
        } else {
          setRelatedStrategy('class_dept');
        }
        setSeenIds(new Set([id]));
        
      } catch (err) {
        setError(t('object.errorLoading'));
        console.error('Error fetching object:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchObject();
  }, [id, t]);

  const fetchRelatedObjects = useCallback(async () => {
    if (!object || !hasMoreRelated || isRelatedLoading || !id) return;

    setIsRelatedLoading(true);
    try {
      let params: any = {};
      
      // Construct params based on current strategy
      switch (relatedStrategy) {
        case 'artist':
          params = {
            artist: object.attribution,
            classification: '',
            department: '',
            search: '',
          };
          break;
        case 'class_dept':
          params = {
            classification: object.classification || '',
            department: object.department || '',
            artist: '',
            search: '',
          };
          break;
        case 'class':
          params = {
            classification: object.classification || '',
            department: '',
            artist: '',
            search: '',
          };
          break;
        case 'random':
          // Empty filters for broad/random search
          params = {
            search: '',
          };
          break;
      }

      const response = await objectsApi.getList(params, relatedPage, RELATED_PAGE_SIZE);
      
      // Filter out seen objects
      const newRelated = response.data.filter(obj => !seenIds.has(obj.object_id));
      
      // Update seen IDs
      const newSeenIds = new Set(seenIds);
      newRelated.forEach(obj => newSeenIds.add(obj.object_id));
      setSeenIds(newSeenIds);

      // If we got valid results, add them
      if (newRelated.length > 0) {
        setRelatedObjects(prev => [...prev, ...newRelated]);
        setRelatedPage(prev => prev + 1);
      }
      
      // Strategy Transition Logic
      if (response.data.length < RELATED_PAGE_SIZE) {
        // Move to next strategy
        if (relatedStrategy === 'artist') {
            setRelatedStrategy('class_dept');
            setRelatedPage(1);
        } else if (relatedStrategy === 'class_dept') {
            setRelatedStrategy('class');
            setRelatedPage(1);
        } else if (relatedStrategy === 'class') {
            setRelatedStrategy('random');
            setRelatedPage(1);
        } else {
            if (response.data.length === 0) setHasMoreRelated(false);
        }
      }
      
    } catch (err) {
      console.error('Error fetching related objects:', err);
      // Don't stop infinite scroll on error immediately, retry logic could be added
    } finally {
      setIsRelatedLoading(false);
    }
  }, [object, relatedStrategy, relatedPage, hasMoreRelated, isRelatedLoading, id, seenIds]);

  // Initial fetch of related objects when params are set
  useEffect(() => {
    if (object && relatedPage === 1 && relatedObjects.length === 0 && !isRelatedLoading) {
      fetchRelatedObjects();
    }
  }, [object, relatedPage, relatedObjects.length]); // Added relatedPage dependency

  // Infinite scroll trigger
  useEffect(() => {
    if (inView && hasMoreRelated && !isRelatedLoading && object) {
      fetchRelatedObjects();
    }
  }, [inView, hasMoreRelated, isRelatedLoading, object, relatedStrategy]);

  
// Helper function moved to component scope or imported
  const getTranslatedFieldsForRelated = (obj: ObjectType) => {
    const isChinese = i18n.language.startsWith('zh');
    if (isChinese) {
        return {
            title: obj.title_zh || obj.title || '',
            attribution: obj.attribution_zh || obj.attribution || '',
        };
    }
    const currentLocale = i18n.language;
    const translation = obj.translations?.find((t) => t.locale === currentLocale);
    return {
      title: translation?.title || obj.title || '',
      attribution: translation?.attribution || obj.attribution || '',
    };
  };
  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: object?.title,
        text: `Check out this artwork: ${object?.title}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert(t('object.linkCopied'));
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex justify-center py-20">
        <div className="w-full max-w-6xl space-y-8">
          <Skeleton className="h-12 w-64" />
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <Skeleton className="aspect-[4/3] w-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !object) {
    return (
      <div className="min-h-screen bg-background container mx-auto px-4 py-8">
        <Card className="border-destructive dark:bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <Info size={24} />
              <span className="font-medium">{error || t('object.notFound')}</span>
            </div>
            <Button asChild className="mt-4">
              <Link to="/collection">{t('object.backToCollection')}</Link>
          </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const primaryImage = object.images?.find(img => img.view_type === 'primary');
  const allImages = object.images || [];
  
  return (
    <div className="bg-background min-h-screen pb-12 text-foreground">
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumbs */}
        <div className="text-sm mb-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Link to="/" className="hover:text-foreground">{t('common.home')}</Link>
            <span>/</span>
            <Link to="/collection" className="hover:text-foreground">{t('common.collection')}</Link>
            <span>/</span>
            <span className="text-foreground truncate max-w-[200px] sm:max-w-md">{translated.title || t('common.untitled')}</span>
          </div>
        </div>
        
        {/* Back button and actions */}
        <div className="flex justify-between items-center mb-6">
          <Button asChild variant="ghost" className="gap-2 pl-0 text-muted-foreground hover:text-foreground">
            <Link to="/collection">
              <ArrowLeft size={16} />
              {t('object.back')}
            </Link>
          </Button>
          <div className="flex gap-2">
            <Button 
              variant={isImmersiveMode ? "default" : "outline"}
              size="sm" 
              className="gap-2 transition-colors duration-500"
              onClick={() => setIsImmersiveMode(!isImmersiveMode)}
            >
              <ScanEye size={16} />
              {t('object.immersiveMode')}
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Heart size={16} />
              {t('object.collect')}
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleShare}>
              <Share2 size={16} />
              {t('object.share')}
            </Button>
          </div>
        </div>

        {/* Immersive Mode Overlay */}
        <div 
          className={cn(
            "fixed inset-0 bg-black/90 z-40 transition-opacity duration-700 pointer-events-none",
            isImmersiveMode ? "opacity-100" : "opacity-0"
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Image section */}
          <div className="md:col-span-8">
            <Card className={cn(
              "overflow-hidden border-0 shadow-sm transition-all duration-700 dark:bg-card",
              isImmersiveMode ? "relative z-50 bg-transparent shadow-none" : ""
            )}>
              <CardContent className="p-2">
              {primaryImage ? (
                  <div 
                    className="relative cursor-zoom-in overflow-hidden rounded-md group"
                  onClick={() => {
                    if (primaryImage.iiif_url) {
                      setViewerImageUrl(primaryImage.iiif_url);
                      setImageViewerOpen(true);
                    }
                  }}
                >
                    <img 
                    src={primaryImage.iiif_url ? `${primaryImage.iiif_url}/full/!1200,/0/default.jpg` : primaryImage.iiif_thumb_url}
                      alt={translated.title}
                      className="w-full h-auto max-h-[70vh] object-contain mx-auto"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (primaryImage.iiif_thumb_url && !target.src.includes(primaryImage.iiif_thumb_url)) {
                        target.src = primaryImage.iiif_thumb_url;
                      }
                    }}
                  />
                    <div className="absolute top-4 right-4 bg-black/60 text-white rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-sm pointer-events-none">
                      <ZoomIn size={14} />
                      <span>{t('object.clickToZoom')}</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-[400px] flex items-center justify-center bg-muted text-muted-foreground">
                    {t('common.noImage')}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Additional images */}
            {allImages.length > 1 && (
              <div className={cn(
                "mt-6 transition-all duration-700",
                isImmersiveMode ? "relative z-50" : ""
              )}>
                <h3 className={cn(
                  "font-semibold mb-3 transition-colors duration-700 text-foreground",
                  isImmersiveMode ? "text-neutral-400" : ""
                )}>{t('object.moreImages')}</h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {allImages.map((img) => (
                    <div 
                      key={img.uuid} 
                      className="aspect-square bg-muted rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                    >
                      <img 
                        src={img.iiif_thumb_url} 
                        alt={img.view_type}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Details section */}
          <div className="md:col-span-4">
            <Card className="sticky top-24 dark:bg-card dark:text-card-foreground">
              <CardHeader>
                <CardTitle className="text-2xl font-serif font-bold leading-tight text-foreground">
                  {translated.title || t('common.untitled')}
                </CardTitle>
                <p className="text-lg text-muted-foreground font-medium mt-2">
                  {translated.attribution || t('common.unknownArtist')}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  {object.classification && (
                    <Badge variant="default" className="dark:bg-primary dark:text-primary-foreground">{object.classification}</Badge>
                  )}
                {object.department && (
                    <Badge variant="outline" className="dark:text-muted-foreground">{object.department}</Badge>
                  )}
                </div>
                
                <Separator className="dark:bg-border" />
                
                <div className="space-y-4 text-sm text-foreground">
                  <div>
                    <div className="text-muted-foreground mb-1 uppercase text-xs tracking-wide">{t('object.date')}</div>
                    <div className="font-medium">{translated.display_date || t('object.unknown')}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1 uppercase text-xs tracking-wide">{t('object.medium')}</div>
                    <div className="font-medium">{translated.medium || t('object.unknown')}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1 uppercase text-xs tracking-wide">{t('object.dimensions')}</div>
                    <div className="font-medium">{object.dimensions || t('object.unknown')}</div>
                  </div>
                </div>
                
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Related Works */}
        {relatedObjects.length > 0 && (
          <div className={cn(
            "mt-20 transition-all duration-700",
            isImmersiveMode ? "relative z-50" : ""
          )}>
            <h2 className={cn(
              "text-2xl font-serif font-bold mb-8 transition-colors duration-700",
              isImmersiveMode ? "text-neutral-300" : "text-foreground"
            )}>{t('object.relatedWorks')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedObjects.map((obj) => {
                const img = obj.images?.find(i => i.view_type === 'primary') || obj.images?.[0];
                let imgUrl = '';
                if (img?.iiif_thumb_url) {
                  imgUrl = img.iiif_thumb_url.replace('!200,200', '!800,800');
                } else if (img?.iiif_url) {
                  const baseUrl = (img.iiif_url.includes('/info.json') || img.iiif_url.includes('/api')) 
                    ? img.iiif_url.replace('/info.json', '').replace('/api', '')
                    : img.iiif_url;
                  imgUrl = `${baseUrl}/full/!800,800/0/default.jpg`;
                }
                
                const objTranslated = getTranslatedFieldsForRelated(obj);
                
                return (
                  <Link key={obj.object_id} to={`/object/${obj.object_id}`} className="group block">
                    <Card className={cn(
                      "overflow-hidden border-border hover:shadow-md transition-all duration-300 h-full dark:bg-card",
                      isImmersiveMode ? "bg-transparent border-none" : ""
                    )}>
                      <div className="aspect-square relative bg-muted overflow-hidden">
                        {imgUrl ? (
                          <img 
                            src={imgUrl} 
                            alt={objTranslated.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                            {t('common.noImage')}
                          </div>
                        )}
                      </div>
                      <CardContent className={cn(
                        "p-4 transition-opacity duration-700",
                        isImmersiveMode ? "opacity-0 h-0 p-0 overflow-hidden" : ""
                      )}>
                        <h3 className="font-serif font-semibold text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors text-foreground" title={objTranslated.title}>
                          {objTranslated.title || t('common.untitled')}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {objTranslated.attribution || t('common.unknownArtist')}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
            
            {/* Loading / Infinite Scroll Trigger */}
            <div className="mt-8 flex justify-center w-full" ref={loadMoreRef}>
              {isRelatedLoading && (
                <div className="flex items-center gap-2 text-neutral-500">
                  <Loader2 className="animate-spin" size={20} />
                  <span>{t('common.loading')}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Image Viewer */}
      <ImageViewer
        open={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        imageUrl={viewerImageUrl}
        title={translated.title}
      />
    </div>
  );
};

export default ObjectDetailPage;
