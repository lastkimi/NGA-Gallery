import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Button,
  Breadcrumbs,
  Tabs,
  Tab,
  ImageList,
  ImageListItem,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Share as ShareIcon,
  Favorite as FavoriteIcon,
  ZoomIn as ZoomInIcon,
} from '@mui/icons-material';
import { objectsApi } from '../services/api';
import type { Object as ObjectType } from '../types';
import Header from '../components/common/Header';
import ImageViewer from '../components/common/ImageViewer';

const ObjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [object, setObject] = useState<ObjectType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewerImageUrl, setViewerImageUrl] = useState<string>('');
  
  useEffect(() => {
    const fetchObject = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const data = await objectsApi.getDetails(id);
        setObject(data);
      } catch (err) {
        setError('无法加载藏品详情');
        console.error('Error fetching object:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchObject();
  }, [id]);
  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: object?.title,
        text: `Check out this artwork: ${object?.title}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('链接已复制到剪贴板');
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#fafafa' }}>
        <Header />
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress />
        </Container>
      </Box>
    );
  }
  
  if (error || !object) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#fafafa' }}>
        <Header />
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <Alert severity="error">{error || '藏品未找到'}</Alert>
          <Button component={Link} to="/collection" sx={{ mt: 2 }}>
            返回藏品列表
          </Button>
        </Container>
      </Box>
    );
  }
  
  const primaryImage = object.images?.find(img => img.view_type === 'primary');
  const allImages = object.images || [];
  
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fafafa' }}>
      <Header />
      
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Button component={Link} to="/" size="small">
            首页
          </Button>
          <Button component={Link} to="/collection" size="small">
            藏品
          </Button>
          <Typography color="text.primary" noWrap sx={{ maxWidth: 300 }}>
            {object.title || 'Untitled'}
          </Typography>
        </Breadcrumbs>
        
        {/* Back button and actions */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            component={Link}
            to="/collection"
            startIcon={<ArrowBackIcon />}
          >
            返回
          </Button>
          <Box>
            <Button startIcon={<FavoriteIcon />} sx={{ mr: 1 }}>
              收藏
            </Button>
            <Button variant="outlined" startIcon={<ShareIcon />} onClick={handleShare}>
              分享
            </Button>
          </Box>
        </Box>
        
        <Grid container spacing={4}>
          {/* Image section */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 2, mb: 3, position: 'relative' }}>
              {primaryImage ? (
                <Box
                  sx={{
                    position: 'relative',
                    cursor: 'zoom-in',
                    '&:hover .zoom-overlay': {
                      opacity: 1,
                    },
                  }}
                  onClick={() => {
                    if (primaryImage.iiif_url) {
                      setViewerImageUrl(primaryImage.iiif_url);
                      setImageViewerOpen(true);
                    }
                  }}
                >
                  <Box
                    component="img"
                    src={primaryImage.iiif_url ? `${primaryImage.iiif_url}/full/!1200,/0/default.jpg` : primaryImage.iiif_thumb_url}
                    alt={object.title}
                    sx={{
                      width: '100%',
                      height: 'auto',
                      maxHeight: '70vh',
                      objectFit: 'contain',
                      display: 'block',
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (primaryImage.iiif_thumb_url && !target.src.includes(primaryImage.iiif_thumb_url)) {
                        target.src = primaryImage.iiif_thumb_url;
                      }
                    }}
                  />
                  <Box
                    className="zoom-overlay"
                    sx={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      bgcolor: 'rgba(0, 0, 0, 0.6)',
                      color: 'white',
                      borderRadius: 1,
                      p: 1,
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    <ZoomInIcon fontSize="small" />
                    <Typography variant="caption">点击放大查看</Typography>
                  </Box>
                </Box>
              ) : (
                <Box
                  sx={{
                    width: '100%',
                    height: 400,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'grey.200',
                  }}
                >
                  <Typography color="text.secondary">暂无图片</Typography>
                </Box>
              )}
            </Paper>
            
            {/* Additional images */}
            {allImages.length > 1 && (
              <Box>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  更多图片
                </Typography>
                <ImageList cols={4} gap={8}>
                  {allImages.map((img) => (
                    <ImageListItem key={img.uuid}>
                      <Box
                        component="img"
                        src={img.iiif_thumb_url}
                        alt={img.view_type}
                        sx={{
                          width: '100%',
                          aspectRatio: '1',
                          objectFit: 'cover',
                          borderRadius: 1,
                          cursor: 'pointer',
                        }}
                      />
                    </ImageListItem>
                  ))}
                </ImageList>
              </Box>
            )}
          </Grid>
          
          {/* Details section */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
                {object.title || 'Untitled'}
              </Typography>
              
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                {object.attribution || 'Unknown Artist'}
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Chip
                  label={object.classification || '未分类'}
                  color="primary"
                  sx={{ mr: 1, mb: 1 }}
                />
                {object.department && (
                  <Chip label={object.department} variant="outlined" sx={{ mb: 1 }} />
                )}
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              {/* Metadata */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  日期
                </Typography>
                <Typography>{object.display_date || '未知'}</Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  媒材
                </Typography>
                <Typography>{object.medium || '未知'}</Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  尺寸
                </Typography>
                <Typography>{object.dimensions || '未知'}</Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  馆藏编号
                </Typography>
                <Typography>{object.accession_number || '未知'}</Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  捐赠/来源
                </Typography>
                <Typography>{object.credit_line || '未知'}</Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              {/* Tabs for additional info */}
              <Tabs
                value={activeTab}
                onChange={(_, value) => setActiveTab(value)}
                sx={{ mb: 2 }}
              >
                <Tab label="描述" />
                <Tab label="来源" />
                <Tab label="相关" />
              </Tabs>
              
              {activeTab === 0 && (
                <Typography variant="body2" color="text.secondary">
                  {object.provenance || '暂无描述信息'}
                </Typography>
              )}
              
              {activeTab === 1 && (
                <Typography variant="body2" color="text.secondary">
                  {object.provenance || '暂无来源信息'}
                </Typography>
              )}
              
              {activeTab === 2 && (
                <Typography variant="body2" color="text.secondary">
                  暂无相关信息
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
      
      {/* Image Viewer */}
      <ImageViewer
        open={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        imageUrl={viewerImageUrl}
        title={object.title}
      />
    </Box>
  );
};

export default ObjectDetailPage;
