import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Autoplay from 'embla-carousel-autoplay';
import { objectsApi } from '../services/api';
import type { Object } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { ChevronRight, Eye, Search } from 'lucide-react';

interface ClassificationSection {
  classification: string;
  objects: Object[];
  loading: boolean;
}

const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [heroObjects, setHeroObjects] = useState<Object[]>([]);
  const [featuredObjects, setFeaturedObjects] = useState<Object[]>([]);
  const [classifications, setClassifications] = useState<string[]>([]);
  const [classificationSections, setClassificationSections] = useState<ClassificationSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroLoading, setHeroLoading] = useState(true);
  const navigate = useNavigate();

  // Helper function to get translated fields (cannot use hook inside map)
  const getTranslatedFields = (obj: Object): { title: string; attribution: string } => {
    // 优先使用 _zh 字段
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
      title: (translation?.title ?? obj.title) ?? '',
      attribution: (translation?.attribution ?? obj.attribution) ?? '',
    };
  };

  // 获取分类列表
  useEffect(() => {
    const fetchClassifications = async () => {
      try {
        const data = await objectsApi.getClassifications();
        // 选择主要的分类（按数量排序，取前几个）
        const mainClassifications = ['Painting', 'Sculpture', 'Drawing', 'Print', 'Photograph'].filter(c => data.includes(c));
        setClassifications(mainClassifications);
        
        // 为每个分类定义精选大师列表 (混合多位顶级艺术家)
        const categoryHighlights: Record<string, string[]> = {
          'Painting': ['Gogh', 'Monet', 'Vermeer', 'Rembrandt', 'Renoir', 'Cézanne'],
          'Sculpture': ['Rodin', 'Degas', 'Donatello', 'Bernini'],
          'Drawing': ['Dürer', 'Michelangelo', 'Raphael'],
          'Print': ['Rembrandt', 'Dürer', 'Goya'],
          'Photograph': ['Stieglitz', 'Evans', 'Frank']
        };

        // 为每个分类获取作品
        const sections = await Promise.all(
          mainClassifications.map(async (classification) => {
            try {
              let objects: Object[] = [];
              const artists = categoryHighlights[classification];

              if (artists && artists.length > 0) {
                 // 并发请求多位大师的作品
                 const artistRequests = artists.map(artist => 
                    objectsApi.getList({
                      search: artist,
                      classification: classification,
                      department: '',
                      artist: '',
                      beginYear: null,
                      endYear: null,
                      medium: '',
                    }, 1, 2) // 每个大师取2个
                 );
                 
                 const responses = await Promise.all(artistRequests);
                 // 混合结果
                 responses.forEach(res => {
                    if (res.data) objects.push(...res.data);
                 });
                 
                 // 去重并打乱顺序 (简单的随机排序)
                 objects = objects
                    .filter((obj, index, self) => index === self.findIndex(o => o.object_id === obj.object_id))
                    .sort(() => Math.random() - 0.5)
                    .slice(0, 8);
              }

              // 如果没有找到足够的作品（或者没有定义大师），则回退到普通查询
              if (objects.length < 4) {
                 const fallbackResponse = await objectsApi.getList({
                  search: '',
                  classification: classification,
                  department: '',
                  artist: '',
                  beginYear: null,
                  endYear: null,
                  medium: '',
                }, 1, 8);
                // 补充不足的部分
                const fallbackObjects = fallbackResponse.data.filter(
                    newItem => !objects.some(existing => existing.object_id === newItem.object_id)
                );
                objects = [...objects, ...fallbackObjects].slice(0, 8);
              }

              return {
                classification,
                objects: objects || [],
                loading: false,
              };
            } catch (err) {
              console.error(`Error fetching ${classification}:`, err);
              return {
                classification,
                objects: [],
                loading: false,
              };
            }
          })
        );
        setClassificationSections(sections);
      } catch (err) {
        console.error('Error fetching classifications:', err);
      }
    };
    fetchClassifications();
  }, []);

  // 获取精选藏品（用于下方展示）
  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        // 定义一组顶级大师，混合展示
        const featuredMasters = ['Gogh', 'Monet', 'Da Vinci', 'Rembrandt', 'Vermeer', 'Picasso', 'Cézanne'];
        
        // 并发请求
        const requests = featuredMasters.map(artist => 
          objectsApi.getList({
            search: artist,
            classification: 'Painting', // 主要是绘画
            department: '',
            artist: '',
            beginYear: null,
            endYear: null,
            medium: '',
          }, 1, 3) // 每人取3个
        );

        const responses = await Promise.all(requests);
        let allFeatured: Object[] = [];
        responses.forEach(res => {
          if (res.data) allFeatured.push(...res.data);
        });

        // 去重
        allFeatured = allFeatured.filter((obj, index, self) => 
          index === self.findIndex(o => o.object_id === obj.object_id)
        );
        
        // 随机打乱并取前12个
        allFeatured = allFeatured.sort(() => Math.random() - 0.5).slice(0, 12);
        
        setFeaturedObjects(allFeatured);
      } catch (err) {
        console.error('Error fetching featured objects:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  // 获取热门图片用于轮播
  useEffect(() => {
    const fetchHeroImages = async () => {
      try {
        // 1. Fetch specifically "Young Girl Reading" by Fragonard (ID: 46303)
        let fragonard: Object | null = null;
        try {
          fragonard = await objectsApi.getById('46303');
        } catch (e) {
          console.error('Failed to fetch Fragonard 46303', e);
        }

        // 获取多个分类的热门图片
        const responses = await Promise.all([
          // 2. A few favorites (Painting) - using Van Gogh as proxy
          objectsApi.getList({
            search: 'Gogh',
            classification: 'Painting',
            department: '',
            artist: '',
            beginYear: null,
            endYear: null,
            medium: '',
          }, 1, 3),
           // 3. More popular Paintings
           objectsApi.getList({
            search: 'Monet',
            classification: 'Painting',
            department: '',
            artist: '',
            beginYear: null,
            endYear: null,
            medium: '',
          }, 1, 3),
          // 4. Sculpture favorites
          objectsApi.getList({
            search: 'Rodin',
            classification: 'Sculpture',
            department: '',
            artist: '',
            beginYear: null,
            endYear: null,
            medium: '',
          }, 1, 2),
        ]);

        const heroImages: Object[] = [];
        
        // Add Fragonard first if found
        if (fragonard && fragonard.images && fragonard.images.length > 0) {
          heroImages.push(fragonard);
        }

        responses.forEach(response => {
          response.data.forEach(obj => {
            if (obj.images && obj.images.length > 0 && obj.object_id !== '46303') {
              heroImages.push(obj);
            }
          });
        });

        // 去重
        const uniqueHeroImages = heroImages.filter((obj, index, self) =>
          index === self.findIndex(o => o.object_id === obj.object_id)
        ).slice(0, 8);

        setHeroObjects(uniqueHeroImages);
      } catch (err) {
        console.error('Error fetching hero images:', err);
      } finally {
        setHeroLoading(false);
      }
    };
    fetchHeroImages();
  }, []);

  return (
    <div className="bg-background min-h-screen text-foreground">
      {/* Hero Section with Carousel */}
      <div className="relative min-h-[75vh] overflow-hidden bg-gradient-to-b from-neutral-900 via-neutral-800 to-neutral-900">
        {!heroLoading && heroObjects.length > 0 ? (
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            plugins={[
              Autoplay({
                delay: 5000,
                stopOnInteraction: false,
                stopOnMouseEnter: true,
              }),
            ]}
            className="w-full h-full"
          >
            <CarouselContent className="h-[75vh]">
              {heroObjects.map((obj) => {
                const primaryImage = obj.images?.find(img => img.view_type === 'primary');
                // 降级使用更小的尺寸 !1200,1200 以加快加载速度，同时保持足够清晰
                const imageUrl = primaryImage?.iiif_url 
                  ? `${primaryImage.iiif_url}/full/!1200,1200/0/default.jpg`
                  : primaryImage?.iiif_thumb_url?.replace('!200,200', '!1200,1200');
                
                if (!imageUrl) return null;

                // Get translated fields
                const translated = getTranslatedFields(obj);
                
                return (
                  <CarouselItem 
                    key={obj.object_id} 
                    className="h-full group cursor-pointer"
                    onClick={() => navigate(`/object/${obj.object_id}`)}
                  >
                    <div className="relative h-full w-full bg-neutral-900 overflow-hidden">
                      {/* Blurred Background Image */}
                      <div className="absolute inset-0">
                          <img 
                              src={imageUrl} 
                              alt="" 
                              className="w-full h-full object-cover blur-3xl scale-110 opacity-50"
                          />
                          <div className="absolute inset-0 bg-black/20" />
                      </div>

                      {/* Image */}
                      <img 
                        src={imageUrl}
                        alt={translated.title}
                        className="relative z-10 w-full h-full object-contain transition-transform duration-1000 group-hover:scale-105"
                      />
                        {/* Content Overlay - Optimized Layout (Top Line) */}
                      <div className="absolute top-0 left-0 right-0 pointer-events-none z-20">
                        <div className="bg-gradient-to-b from-black/80 to-transparent p-6 pt-8 pb-12 flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-white/90">
                          {translated.title && (
                            <>
                              <h2 className="text-xl md:text-2xl font-serif italic drop-shadow-md truncate max-w-3xl">
                                {translated.title}
                              </h2>
                              <span className="hidden md:inline text-white/50">|</span>
                              <p className="text-base md:text-lg font-light truncate">
                                {translated.attribution}
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Bottom Actions - Centered above dots */}
                      <div className="absolute bottom-16 left-0 right-0 flex justify-center z-20 pointer-events-none">
                        <div className="pointer-events-auto flex gap-6 items-center">
                            <Button asChild variant="ghost" size="icon" className="h-12 w-12 text-white hover:bg-white/20 hover:text-white rounded-full transition-all duration-300">
                              <Link to={`/object/${obj.object_id}`} title={t('object.viewArtwork')}>
                                <Eye className="h-8 w-8" />
                              </Link>
                            </Button>
                            <Button asChild variant="ghost" size="icon" className="h-12 w-12 text-white hover:bg-white/20 hover:text-white rounded-full transition-all duration-300">
                              <Link to="/search" title={t('common.search')}>
                                <Search className="h-8 w-8" />
                              </Link>
                            </Button>
                        </div>
                      </div>
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="left-4 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 hover:border-white/50" />
            <CarouselNext className="right-4 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 hover:border-white/50" />
            
            {/* Dots */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 z-20">
              {heroObjects.map((_, index) => (
                <div 
                  key={index} 
                  className={`h-2 w-2 rounded-full transition-all ${
                    index === 0 ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/80'
                  }`} // Note: To implement active dot, we'd need state tracking for current slide. For now just style first as active or use static style.
                  // Since Embla doesn't expose state easily in this setup without context, we'll just show dots.
                  // To make them interactive/reactive, we'd need to use useCarousel hook or similar.
                  // For simplicity in this quick edit, I'll just add static dots visual.
                />
              ))}
            </div>
          </Carousel>
        ) : null}
      </div>
      {/* Hero Text Section */}
      <div className="container mx-auto px-4 pt-20 pb-10 text-center">
        <h1 className="mb-6 text-4xl md:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-foreground drop-shadow-sm">
          {t('home.title')}
        </h1>
        <p className="mb-10 text-xl md:text-2xl font-light text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          {t('home.subtitle')}
        </p>
      </div>

      {/* Featured Collection */}
      <div className="container mx-auto px-4 pb-20 md:pb-24">
        <div className="text-center mb-16 border-t border-border pt-16">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4 tracking-tight text-foreground">{t('common.featuredCollection')}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t('home.featuredDescription')}</p>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-20">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
            {featuredObjects.map((obj) => {
              const translated = getTranslatedFields(obj);
              const primaryImage = obj.images?.find(img => img.view_type === 'primary');
              const imageUrl = primaryImage?.iiif_url 
                ? `${primaryImage.iiif_url}/full/!800,800/0/default.jpg`
                : primaryImage?.iiif_thumb_url?.replace('!200,200', '!800,800');
              
              return (
                <Card key={obj.object_id} className="group overflow-hidden border-neutral-200 hover:shadow-elegant-md transition-all duration-300 hover:-translate-y-1">
                  <Link to={`/object/${obj.object_id}`}>
                    <div className="relative pt-[133.33%] bg-neutral-100 overflow-hidden">
                      {imageUrl ? (
                        <>
                          <img 
                            src={imageUrl} 
                            alt={translated.title}
                            className="absolute top-0 left-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </>
                      ) : (
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-neutral-400 text-sm">
                          No Image
                        </div>
                      )}
                    </div>
                    <CardContent className="p-5">
                      <h3 className="font-serif font-semibold text-base mb-2 line-clamp-2 min-h-[3rem] leading-snug group-hover:text-neutral-700 transition-colors text-neutral-900" title={translated.title}>
                        {translated.title || t('common.untitled')}
                      </h3>
                      <p className="text-sm text-neutral-600 mb-3 line-clamp-1">
                        {translated.attribution || t('common.unknownArtist')}
                      </p>
                      {/* Classification Badge hidden for cleaner look */}
                    </CardContent>
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
        
        <div className="text-center mt-16">
          <Button asChild size="lg" variant="default" className="px-8">
            <Link to="/collection">
              {t('common.viewAllArtworks')}
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Classification Sections */}
      {classifications.length > 0 && classificationSections.length > 0 && (
        <div className="bg-background border-t border-border">
          {classificationSections.map((section) => (
            section.objects.length > 0 && (
              <div key={section.classification} className="container mx-auto px-4 py-16 md:py-20">
                <div className="flex items-center justify-between mb-12">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-serif font-bold mb-2 tracking-tight text-foreground">
                      {t(`classifications.${section.classification}`) || section.classification}
                    </h2>
                    <p className="text-muted-foreground">{t('home.exploreCategory', { category: t(`classifications.${section.classification}`) || section.classification })}</p>
                  </div>
                  <Button asChild variant="ghost" className="text-foreground hover:text-foreground/80">
                    <Link to={`/collection?classification=${encodeURIComponent(section.classification)}`}>
                      {t('common.viewMore')}
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                          {section.objects.map((obj) => {
                    const translated = getTranslatedFields(obj);
                    const primaryImage = obj.images?.find(img => img.view_type === 'primary');
                    // Use larger size for category items to match visual quality
                    const imageUrl = primaryImage?.iiif_url 
                      ? `${primaryImage.iiif_url}/full/!800,800/0/default.jpg`
                      : primaryImage?.iiif_thumb_url?.replace('!200,200', '!800,800');
                    
                    return (
                      <Card key={obj.object_id} className="group overflow-hidden border-neutral-200 hover:shadow-elegant-md transition-all duration-300 hover:-translate-y-1">
                        <Link to={`/object/${obj.object_id}`}>
                          <div className="relative pt-[133.33%] bg-neutral-100 overflow-hidden">
                            {imageUrl ? (
                              <>
                                <img 
                                  src={imageUrl} 
                                  alt={translated.title}
                                  className="absolute top-0 left-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              </>
                            ) : (
                              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-neutral-400 text-sm">
                                {t('common.noImage')}
                              </div>
                            )}
                          </div>
                          <CardContent className="p-5">
                            <h3 className="font-serif font-semibold text-base mb-2 line-clamp-2 min-h-[3rem] leading-snug group-hover:text-neutral-700 transition-colors text-neutral-900" title={translated.title}>
                              {translated.title || t('common.untitled')}
                            </h3>
                            <p className="text-sm text-neutral-600 mb-3 line-clamp-1">
                              {translated.attribution || t('common.unknownArtist')}
                            </p>
                          </CardContent>
                        </Link>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )
          ))}
        </div>
      )}
      
      {/* Quick Stats */}
      <div className="bg-muted/30 border-t border-border py-20 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <div className="text-center">
              <div className="text-5xl md:text-6xl font-serif font-bold text-foreground mb-3">143k+</div>
              <div className="text-sm md:text-base uppercase tracking-wider text-muted-foreground font-medium">{t('common.totalArtworks')}</div>
            </div>
            <div className="text-center">
              <div className="text-5xl md:text-6xl font-serif font-bold text-foreground mb-3">130k+</div>
              <div className="text-sm md:text-base uppercase tracking-wider text-muted-foreground font-medium">{t('common.highResolutionImages')}</div>
            </div>
            <div className="text-center">
              <div className="text-5xl md:text-6xl font-serif font-bold text-foreground mb-3">CC0</div>
              <div className="text-sm md:text-base uppercase tracking-wider text-muted-foreground font-medium">{t('common.publicDomain')}</div>
            </div>
            <div className="text-center">
              <div className="text-5xl md:text-6xl font-serif font-bold text-foreground mb-3">100%</div>
              <div className="text-sm md:text-base uppercase tracking-wider text-muted-foreground font-medium">{t('common.freeAccess')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;