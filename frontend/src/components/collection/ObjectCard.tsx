import React from 'react';
import type { Object } from '../../types';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslatedFields } from '../../hooks/useTranslatedFields';
import { useTranslation } from 'react-i18next';

interface ObjectCardProps {
  object: Object;
  viewMode?: 'grid' | 'list';
}

// 分类翻译映射 (从 CollectionPage 复用或独立定义)
const CLASSIFICATION_MAP: Record<string, string> = {
    'Painting': '绘画',
    'Sculpture': '雕塑',
    'Drawing': '素描',
    'Print': '版画',
    'Photograph': '摄影',
    'Decorative Art': '装饰艺术',
    'Index of American Design': '美国设计索引',
    'Textile': '纺织品',
    'Costume': '服饰',
    'Furniture': '家具',
    'Ceramic': '陶瓷',
    'Metalwork': '金属工艺',
    'Glass': '玻璃工艺',
    'Book': '书籍',
    'Architecture': '建筑',
    'Time-Based Media': '时基媒体',
    'Time-Based Media Art': '时基媒体艺术',
    'Technical Material': '技术材料',
    'Portfolio': '作品集',
    'Volume': '卷册',
    'Media': '媒体'
};

const ObjectCard: React.FC<ObjectCardProps> = ({ object, viewMode = 'grid' }) => {
  const { t } = useTranslation();
  const translated = useTranslatedFields(object);
  const images = object.images || [];
  const hasImage = images.length > 0;
  const primaryImage = hasImage ? images.find(img => img.view_type === 'primary') : null;
  
  // 构建图片URL：优先使用IIIF URL（高画质），其次使用缩略图
  const getThumbnailUrl = () => {
    if (!primaryImage) return '';
    
    // 方案 1: 如果有缩略图URL，直接使用，但替换尺寸参数为更大的尺寸
    // NGA 缩略图通常是 .../full/!200,200/0/default.jpg
    // 我们尝试替换为 !800,800 以获得更高清的图片
    if (primaryImage.iiif_thumb_url) {
      return primaryImage.iiif_thumb_url.replace('!200,200', '!800,800');
    }
    
    // 方案 2: 如果没有缩略图URL，但有IIIF URL
    if (primaryImage.iiif_url) {
      // 构建标准IIIF请求: /full/!800,800/0/default.jpg
      if (primaryImage.iiif_url.includes('/info.json') || primaryImage.iiif_url.includes('/api')) {
         const baseUrl = primaryImage.iiif_url.replace('/info.json', '').replace('/api', '');
         return `${baseUrl}/full/!800,800/0/default.jpg`;
      }
      return primaryImage.iiif_url;
    }
    
    return '';
  };
  
  const thumbnailUrl = getThumbnailUrl();
  
  if (viewMode === 'list') {
    return (
      <Card className={cn("overflow-hidden border-border hover:shadow-elegant-md transition-all duration-300 dark:bg-card dark:text-card-foreground", "hover:-translate-y-0.5")}>
        <Link to={`/object/${object.object_id}`} className="flex gap-6">
          {hasImage && (
            <div className="w-32 h-32 md:w-40 md:h-40 shrink-0 bg-muted rounded-l overflow-hidden">
              <img 
                src={thumbnailUrl} 
                alt={translated.title}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
              />
            </div>
          )}
          <CardContent className="flex-1 flex flex-col justify-center min-w-0 p-6">
            <h3 className="font-serif font-semibold text-xl mb-2 line-clamp-2 leading-tight text-foreground" title={translated.title}>
              {translated.title || t('common.untitled')}
            </h3>
            <p className="text-sm text-muted-foreground mb-1">
              {translated.attribution || t('common.unknownArtist')}
            </p>
            <p className="text-sm text-muted-foreground/80 mb-3">
              {translated.display_date || 'Date unknown'}
            </p>
            <div className="flex gap-2 flex-wrap mt-auto">
              {translated.classification && (
                <Badge variant="secondary" className="text-xs uppercase tracking-wide">
                  {CLASSIFICATION_MAP[translated.classification] || translated.classification}
                </Badge>
              )}
              {translated.department && (
                <Badge variant="outline" className="text-xs">
                  {translated.department}
                </Badge>
              )}
            </div>
          </CardContent>
        </Link>
      </Card>
    );
  }
  
  return (
    <Card className={cn("group overflow-hidden border-border h-full flex flex-col dark:bg-card dark:text-card-foreground", "hover:shadow-elegant-md transition-all duration-300 hover:-translate-y-1")}>
      <Link to={`/object/${object.object_id}`}>
        <div className="relative pt-[133.33%] bg-muted overflow-hidden">
          {hasImage ? (
            <>
              <img 
                src={thumbnailUrl} 
                alt={translated.title}
                className="absolute top-0 left-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </>
          ) : (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              {t('common.noImage')}
            </div>
          )}
        </div>
        <CardContent className="p-4 md:p-5 flex-grow-0">
          <h3 className="font-serif font-semibold text-base mb-2 line-clamp-2 min-h-[3rem] leading-snug group-hover:text-primary transition-colors text-foreground" title={translated.title}>
            {translated.title || t('common.untitled')}
          </h3>
          <div className="text-sm text-muted-foreground line-clamp-1">
            {translated.attribution || t('common.unknownArtist')}
          </div>
        </CardContent>
      </Link>
    </Card>
  );
};

export default ObjectCard;
