import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/appStore';
import { objectsApi } from '../services/api';
import ObjectCard from '../components/collection/ObjectCard';
import TimelineFilter from '../components/collection/TimelineFilter';
import Pagination from '../components/common/Pagination';
import ScrollDownButton from '../components/common/ScrollDownButton';
import { Filter, Grid as GridIcon, List as ListIcon, RotateCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

declare global {
    interface Window {
        searchTimeout: any;
    }
}

// 艺术家列表 (仅保留数据库中存在数据的艺术家)
const TOP_ARTISTS_EN = [
    'Van Gogh', 'Monet', 'Picasso', 'Da Vinci', 'Rembrandt', 'Vermeer', 
    'Renoir', 'Degas', 'Gauguin', 'Manet', 'Matisse', 'Warhol', 'Klimt',
    'Munch', 'O\'Keeffe', 'Pollock', 'Rothko', 'Hopper', 'Whistler',
    'Sargent', 'Homer', 'Eakins', 'Cassatt', 'Rodin', 'Michelangelo', 'Raphael',
    'Dürer', 'Goya', 'Velázquez', 'El Greco', 'Rubens', 'Bosch', 'Bruegel',
    'Caravaggio', 'Bernini', 'Titian', 'Botticelli', 'Modigliani',
    'Chagall', 'Kandinsky', 'Magritte', 'Seurat',
    'Signac', 'Pissarro', 'Sisley', 'Morisot', 'Courbet', 'Millet', 'Rousseau',
    'Delacroix', 'Ingres', 'David', 'Turner', 'Constable', 'Blake', 'Friedrich',
    'Kuniyoshi', 'Hockney', 
    'Lichtenstein', 'Hirst', 'Sherman', 'Holzer', 'Kruger',
    'Bourgeois', 'Nevelson', 'Frankenthaler', 'Mitchell', 'Martin', 'Ryman',
    'Stella', 'Kelly', 'LeWitt', 'Judd', 'Andre', 'Flavin', 'Turrell'
];

const ARTIST_NAME_MAP: Record<string, string> = {
    'Van Gogh': '梵高',
    'Monet': '莫奈',
    'Picasso': '毕加索',
    'Da Vinci': '达芬奇',
    'Rembrandt': '伦勃朗',
    'Vermeer': '维米尔',
    'Renoir': '雷诺阿',
    'Degas': '德加',
    'Gauguin': '高更',
    'Manet': '马奈',
    'Matisse': '马蒂斯',
    'Warhol': '沃霍尔',
    'Klimt': '克里姆特',
    'Munch': '蒙克',
    'O\'Keeffe': '欧姬芙',
    'Pollock': '波洛克',
    'Rothko': '罗斯科',
    'Hopper': '霍普',
    'Whistler': '惠斯勒',
    'Sargent': '萨金特',
    'Homer': '霍默',
    'Eakins': '伊肯斯',
    'Cassatt': '卡萨特',
    'Rodin': '罗丹',
    'Michelangelo': '米开朗基罗',
    'Raphael': '拉斐尔',
    'Dürer': '丢勒',
    'Goya': '戈雅',
    'Velázquez': '委拉斯开兹',
    'El Greco': '埃尔·格列柯',
    'Rubens': '鲁本斯',
    'Bosch': '博斯',
    'Bruegel': '勃鲁盖尔',
    'Caravaggio': '卡拉瓦乔',
    'Bernini': '贝尼尼',
    'Titian': '提香',
    'Botticelli': '波提切利',
    'Modigliani': '莫迪利亚尼',
    'Chagall': '夏加尔',
    'Kandinsky': '康定斯基',
    'Magritte': '马格利特',
    'Seurat': '修拉',
    'Signac': '西涅克',
    'Pissarro': '毕沙罗',
    'Sisley': '西斯莱',
    'Morisot': '莫里索',
    'Courbet': '库尔贝',
    'Millet': '米勒',
    'Rousseau': '卢梭',
    'Delacroix': '德拉克洛瓦',
    'Ingres': '安格尔',
    'David': '大卫',
    'Turner': '透纳',
    'Constable': '康斯太勃尔',
    'Blake': '布莱克',
    'Friedrich': '弗里德里希',
    'Kuniyoshi': '歌川国芳',
    'Hockney': '霍克尼',
    'Lichtenstein': '利希滕斯坦',
    'Hirst': '赫斯特',
    'Sherman': '舍曼',
    'Holzer': '霍尔泽',
    'Kruger': '克鲁格',
    'Bourgeois': '布尔乔亚',
    'Nevelson': '尼维尔森',
    'Frankenthaler': '弗兰肯塔勒',
    'Mitchell': '米切尔',
    'Martin': '马丁',
    'Ryman': '赖曼',
    'Stella': '斯特拉',
    'Kelly': '凯利',
    'LeWitt': '勒维特',
    'Judd': '贾德',
    'Andre': '安德烈',
    'Flavin': '弗拉文',
    'Turrell': '特瑞尔'
};

// 分类翻译映射
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
    'Time-Based Media': '时基媒体', // 修正 key 或保留兼容
    'Time-Based Media Art': '时基媒体艺术', // 新增
    'Technical Material': '技术材料',
    'Portfolio': '作品集',
    'Volume': '卷册',
    'Media': '媒体'
};

const CollectionPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    objects,
    pagination,
    isLoading,
    viewMode,
    setViewMode,
    setPagination,
    setFilters,
    resetFilters,
    setObjects,
    setIsLoading,
    filters,
  } = useAppStore();
  
  const [searchParams] = useSearchParams();
  const [classifications, setClassifications] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  
  const [localFilters, setLocalFilters] = useState({
    search: '',
    classification: '',
    department: '',
    artist: '',
    beginYear: '',
    endYear: '',
  });
  
  // 初始化：从 URL 读取参数并设置 filters
  useEffect(() => {
    const classificationParam = searchParams.get('classification');
    const departmentParam = searchParams.get('department');
    const searchParam = searchParams.get('q');
    
    if (classificationParam || departmentParam || searchParam) {
      setFilters({
        ...filters,
        classification: classificationParam || '',
        department: departmentParam || '',
        search: searchParam || '',
      });
    }
  }, [searchParams]);

  // 同步filters到localFilters
  useEffect(() => {
    setLocalFilters(prev => ({
      ...prev,
      search: filters.search || '',
      classification: filters.classification || 'all_items',
      department: filters.department || 'all_items',
      artist: filters.artist || '',
      beginYear: filters.beginYear ? filters.beginYear.toString() : '',
      endYear: filters.endYear ? filters.endYear.toString() : '',
    }));
  }, [filters]);
  
  useEffect(() => {
    let ignore = false;
    const fetchObjects = async () => {
      setIsLoading(true);
      try {
        const response = await objectsApi.getList(filters, pagination.page, pagination.limit);
        
        if (ignore) {
          return;
        }
        
        if (response.data && response.data.length > 0) {
        setObjects(response.data);
        } else {
          setObjects([]);
        }
        
        setPagination({
          page: response.pagination.page,
          limit: response.pagination.limit,
          total: response.pagination.total,
          totalPages: response.pagination.totalPages,
        });
      } catch (err: any) {
        if (ignore) return;
        
        console.error('[CollectionPage] Error fetching objects:', err);
        setObjects([]);
        setPagination({
          page: 1,
          limit: pagination.limit,
          total: 0,
          totalPages: 0,
        });
      } finally {
        if (!ignore) {
        setIsLoading(false);
        }
      }
    };
    fetchObjects();
    return () => {
      ignore = true;
    };
  }, [filters.search, filters.classification, filters.department, filters.artist, filters.beginYear, filters.endYear, filters.medium, pagination.page, pagination.limit]);
  
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [classifs, depts] = await Promise.all([
          objectsApi.getClassifications(),
          objectsApi.getDepartments(),
        ]);
        setClassifications(classifs);
        setDepartments(depts);
      } catch (err) {
        console.error('Error fetching filters:', err);
      }
    };
    fetchFilterOptions();
  }, []);
  
  const handleFilterApply = () => {
    setFilters({
      search: localFilters.search,
      classification: localFilters.classification === 'all_items' ? '' : localFilters.classification,
      department: localFilters.department === 'all_items' ? '' : localFilters.department,
      artist: localFilters.artist,
      beginYear: localFilters.beginYear ? parseInt(localFilters.beginYear) : null,
      endYear: localFilters.endYear ? parseInt(localFilters.endYear) : null,
    });
    setPagination({ page: 1 });
    setFilterPanelOpen(false);
  };
  
  const handleReset = () => {
    setLocalFilters({
      search: '',
      classification: '',
      department: '',
      artist: '',
      beginYear: '',
      endYear: '',
    });
    resetFilters();
    setPagination({ page: 1 });
  };
  
  const handlePageChange = (page: number) => {
    setPagination({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const activeFiltersCount = [
    filters.classification,
    filters.department,
    filters.artist,
    filters.beginYear,
    filters.endYear,
  ].filter(Boolean).length;
  
  return (
    <div className="bg-background min-h-screen pb-12 text-foreground">
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 pb-8 border-b border-border">
          <div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-3 tracking-tight text-foreground">{t('collection.title')}</h1>
            <p className="text-muted-foreground">
              {t('collection.artworksCount', { count: pagination.total })}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3 items-center w-full md:w-auto justify-between md:justify-end">
            <div className="inline-flex border border-border rounded-md p-1 bg-card">
              <Button
                variant={viewMode === 'grid' ? "default" : "ghost"}
                size="icon"
                className="h-9 w-9"
                onClick={() => setViewMode('grid')}
              >
                <GridIcon size={18} />
              </Button>
              <Button
                variant={viewMode === 'list' ? "default" : "ghost"}
                size="icon"
                className="h-9 w-9"
                onClick={() => setViewMode('list')}
              >
                <ListIcon size={18} />
              </Button>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => window.location.reload()}
            >
              <RotateCw size={18} />
            </Button>
          </div>
        </div>

        {/* Search & Timeline Section */}
        <div className="mb-10 space-y-6">
            {/* Visual Timeline Filter - Main View */}
            <div className="bg-muted/30 rounded-lg p-6 border border-border">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-serif font-semibold text-lg text-foreground">{t('collection.yearRange')}</h3>
                    <div className="text-sm text-muted-foreground">
                        {filters.beginYear || 1200} — {filters.endYear || 2024}
                    </div>
                </div>
                <TimelineFilter 
                  beginYear={filters.beginYear ? parseInt(filters.beginYear.toString()) : null}
                  endYear={filters.endYear ? parseInt(filters.endYear.toString()) : null}
                  onChange={(start, end) => {
                    setFilters({
                        beginYear: start ? start : null,
                        endYear: end ? end : null
                    });
                    setLocalFilters(prev => ({
                        ...prev,
                        beginYear: start ? start.toString() : '',
                        endYear: end ? end.toString() : ''
                    }));
                  }}
                  className="w-full"
                />
            </div>

            {/* Combined Search Input (Below Timeline) */}
            <div className="relative">
                <Input
                    placeholder="搜索标题、艺术家或描述..."
                    value={localFilters.search}
                    onChange={(e) => {
                        const val = e.target.value;
                        setLocalFilters(prev => ({ ...prev, search: val }));
                        // Debounce update to filters
                        if (window.searchTimeout) clearTimeout(window.searchTimeout);
                        window.searchTimeout = setTimeout(() => {
                            setFilters({ ...filters, search: val });
                            setPagination({ page: 1 });
                        }, 500);
                    }}
                    className="pl-10 h-12 text-lg bg-background border-border shadow-sm text-foreground placeholder:text-muted-foreground"
                />
                <div className="absolute left-3 top-3.5 text-muted-foreground">
                    <Filter size={20} />
                </div>
            </div>
        </div>
        
        {/* Top Artists Tags (Scrollable Grid) */}
        <div className="mb-8">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">热门艺术家</h3>
            <div className="overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                <div className="grid grid-rows-5 grid-flow-col gap-3 min-w-max">
                    {TOP_ARTISTS_EN.map(artist => (
                        <Button
                            key={artist}
                            variant={filters.artist === artist ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                                const newValue = filters.artist === artist ? '' : artist;
                                setFilters({ ...filters, artist: newValue });
                                setPagination({ page: 1 });
                            }}
                            className={cn(
                                "rounded-md text-xs px-3 h-8 whitespace-nowrap justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
                                filters.artist === artist && "bg-primary text-primary-foreground hover:bg-primary/90 shadow"
                            )}
                        >
                            {ARTIST_NAME_MAP[artist] || artist}
                        </Button>
                    ))}
                </div>
            </div>
        </div>
        
        {/* Classification Categories - Quick Filters */}
        <div className="mb-8">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            <Button 
              variant={!filters.classification ? "default" : "outline"}
              size="sm"
              onClick={() => setFilters({ ...filters, classification: '' })}
              className="whitespace-nowrap flex-shrink-0 h-8 text-xs font-medium px-3 rounded-md shadow-sm"
            >
              全部
            </Button>
            {classifications.map((c) => (
              <Button
                key={c}
                variant={filters.classification === c ? "default" : "outline"}
                size="sm"
                onClick={() => setFilters({ ...filters, classification: c })}
                className="whitespace-nowrap flex-shrink-0 h-8 text-xs font-medium px-3 rounded-md shadow-sm"
              >
                {CLASSIFICATION_MAP[c] || c}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {filters.classification && (
              <Badge variant="secondary" className="gap-2">
                分类: {filters.classification}
                <button 
                  onClick={() => setFilters({ ...filters, classification: '' })}
                  className="ml-1 hover:text-neutral-900"
                >
                  <X size={14} />
                </button>
              </Badge>
            )}
            {filters.department && (
              <Badge variant="secondary" className="gap-2">
                部门: {filters.department}
                <button 
                  onClick={() => setFilters({ ...filters, department: '' })}
                  className="ml-1 hover:text-neutral-900"
                >
                  <X size={14} />
                </button>
              </Badge>
            )}
            {filters.artist && (
              <Badge variant="secondary" className="gap-2">
                艺术家: {filters.artist}
                <button 
                  onClick={() => setFilters({ ...filters, artist: '' })}
                  className="ml-1 hover:text-neutral-900"
                >
                  <X size={14} />
                </button>
              </Badge>
            )}
            {(filters.beginYear || filters.endYear) && (
              <Badge variant="secondary" className="gap-2">
                年份: {filters.beginYear || '...'} - {filters.endYear || '...'}
                <button 
                  onClick={() => setFilters({ ...filters, beginYear: null, endYear: null })}
                  className="ml-1 hover:text-neutral-900"
                >
                  <X size={14} />
                </button>
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              className="h-7 text-xs"
              onClick={handleReset}
            >
              清除全部
            </Button>
          </div>
        )}
        
        {/* Loading / Empty / Content */}
        {isLoading && objects.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i}>
                <Skeleton className="aspect-square w-full" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : objects.length === 0 ? (
          <Card className="text-center py-20">
            <CardContent>
              {pagination.total > 0 ? (
                <>
                  <h3 className="text-2xl font-serif font-semibold mb-2">当前页无数据</h3>
                  <p className="text-neutral-600 mb-6">您所在的页码 ({pagination.page}) 超出了结果范围</p>
                  <Button onClick={() => setPagination({ page: 1 })}>
                    返回第一页
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-serif font-semibold mb-2">未找到匹配的藏品</h3>
                  <p className="text-neutral-600 mb-6">尝试调整筛选条件或搜索词</p>
                  <Button variant="outline" onClick={handleReset}>
              清除筛选条件
            </Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className={cn(
              "grid gap-6",
              viewMode === 'grid' 
                ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" 
                : "grid-cols-1"
            )}>
              {objects.map((object) => (
                <div key={object.object_id || object.id} className={viewMode === 'list' ? 'w-full' : ''}>
                  <ObjectCard object={object} viewMode={viewMode} />
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                />
            )}
            
            <ScrollDownButton />
          </>
        )}
      </div>
    </div>
  );
};

export default CollectionPage;
