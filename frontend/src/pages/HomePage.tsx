import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Button,
  useMediaQuery,
  useTheme,
  Chip,
  Stack,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { objectsApi } from '../services/api';
import type { Object } from '../types';
import Header from '../components/common/Header';

const HomePage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [featuredObjects, setFeaturedObjects] = useState<Object[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const response = await objectsApi.getList({
          search: '',
          classification: '',
          department: '',
          artist: '',
          beginYear: null,
          endYear: null,
          medium: '',
        }, 1, 12);
        setFeaturedObjects(response.data.slice(0, 12));
      } catch (err) {
        console.error('Error fetching featured objects:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fafafa' }}>
      <Header />
      
      {/* Hero Section with Featured Image */}
      <Box
        sx={{
          position: 'relative',
          minHeight: isMobile ? '50vh' : '70vh',
          bgcolor: '#1a1a1a',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        {featuredObjects[0]?.images?.[0] && (
          <Box
            component="img"
            src={featuredObjects[0].images[0].iiif_url 
              ? `${featuredObjects[0].images[0].iiif_url}/full/!1920,1080/0/default.jpg`
              : featuredObjects[0].images[0].iiif_thumb_url}
            alt={featuredObjects[0].title}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.4,
              zIndex: 0,
            }}
          />
        )}
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7))',
          }}
        >
          <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
            <Typography
              variant={isMobile ? 'h3' : 'h1'}
              component="h1"
              sx={{
                fontWeight: 700,
                mb: 2,
                textAlign: 'center',
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              }}
            >
              National Gallery of Art
            </Typography>
            <Typography
              variant={isMobile ? 'h6' : 'h5'}
              sx={{
                textAlign: 'center',
                opacity: 0.95,
                mb: 4,
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
              }}
            >
              探索超过62,000件艺术珍品
            </Typography>
            <Stack
              direction="row"
              spacing={2}
              justifyContent="center"
              sx={{ flexWrap: 'wrap', gap: 2 }}
            >
              <Button
                component={Link}
                to="/collection"
                variant="contained"
                size="large"
                sx={{
                  bgcolor: 'white',
                  color: 'primary.main',
                  px: 4,
                  py: 1.5,
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.9)',
                  },
                }}
              >
                浏览藏品
              </Button>
              <Button
                component={Link}
                to="/collection"
                variant="outlined"
                size="large"
                sx={{
                  borderColor: 'white',
                  color: 'white',
                  px: 4,
                  py: 1.5,
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                搜索
              </Button>
            </Stack>
          </Container>
        </Box>
      </Box>
      
      {/* Featured Collection */}
      <Container maxWidth="xl" sx={{ py: { xs: 4, md: 8 } }}>
        <Box sx={{ mb: { xs: 3, md: 6 }, textAlign: 'center' }}>
          <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 600, mb: 1 }}>
            精选藏品
          </Typography>
          <Typography variant="body1" color="text.secondary">
            探索我们的精选艺术品收藏
          </Typography>
        </Box>
        
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography>加载中...</Typography>
          </Box>
        ) : (
          <Grid container spacing={{ xs: 2, md: 3 }}>
            {featuredObjects.map((obj) => {
              const primaryImage = obj.images?.find(img => img.view_type === 'primary');
              const imageUrl = primaryImage?.iiif_url 
                ? `${primaryImage.iiif_url}/full/!600,600/0/default.jpg`
                : primaryImage?.iiif_thumb_url;
              
              return (
                <Grid size={{ xs: 6, sm: 4, md: 3 }} key={obj.object_id}>
                  <Card
                    component={Link}
                    to={`/object/${obj.object_id}`}
                    sx={{
                      height: '100%',
                      textDecoration: 'none',
                      transition: 'transform 0.3s, box-shadow 0.3s',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: 6,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        position: 'relative',
                        paddingTop: '100%',
                        bgcolor: '#f5f5f5',
                        overflow: 'hidden',
                      }}
                    >
                      {imageUrl ? (
                        <CardMedia
                          component="img"
                          image={imageUrl}
                          alt={obj.title}
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: 'text.secondary',
                          }}
                        >
                          无图片
                        </Box>
                      )}
                    </Box>
                    <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                      <Typography 
                        variant={isMobile ? 'body2' : 'subtitle2'} 
                        component="div" 
                        noWrap
                        sx={{ fontWeight: 500, mb: 0.5 }}
                      >
                        {obj.title || 'Untitled'}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        color="text.secondary" 
                        noWrap
                        sx={{ display: 'block', mb: 0.5 }}
                      >
                        {obj.attribution || 'Unknown Artist'}
                      </Typography>
                      {obj.classification && (
                        <Chip
                          label={obj.classification}
                          size="small"
                          sx={{ 
                            height: 20,
                            fontSize: '0.65rem',
                            mt: 0.5,
                          }}
                        />
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
        
        <Box sx={{ textAlign: 'center', mt: { xs: 4, md: 6 } }}>
          <Button
            component={Link}
            to="/collection"
            variant="outlined"
            size="large"
            sx={{ px: 4 }}
          >
            查看全部藏品
          </Button>
        </Box>
      </Container>
      
      {/* Quick Stats */}
      <Box sx={{ bgcolor: 'grey.100', py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} justifyContent="center">
            <Grid size={{ xs: 6, md: 3 }} sx={{ textAlign: 'center' }}>
              <Typography variant={isMobile ? 'h4' : 'h3'} sx={{ fontWeight: 700, color: 'primary.main' }}>
                62,307+
              </Typography>
              <Typography variant={isMobile ? 'body2' : 'body1'} color="text.secondary">
                藏品总数
              </Typography>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }} sx={{ textAlign: 'center' }}>
              <Typography variant={isMobile ? 'h4' : 'h3'} sx={{ fontWeight: 700, color: 'primary.main' }}>
                53,000+
              </Typography>
              <Typography variant={isMobile ? 'body2' : 'body1'} color="text.secondary">
                高清图片
              </Typography>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }} sx={{ textAlign: 'center' }}>
              <Typography variant={isMobile ? 'h4' : 'h3'} sx={{ fontWeight: 700, color: 'primary.main' }}>
                CC0
              </Typography>
              <Typography variant={isMobile ? 'body2' : 'body1'} color="text.secondary">
                公共领域许可
              </Typography>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }} sx={{ textAlign: 'center' }}>
              <Typography variant={isMobile ? 'h4' : 'h3'} sx={{ fontWeight: 700, color: 'primary.main' }}>
                100%
              </Typography>
              <Typography variant={isMobile ? 'body2' : 'body1'} color="text.secondary">
                免费开放
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>
      
      {/* Footer */}
      <Box component="footer" sx={{ bgcolor: 'grey.900', color: 'white', py: 4 }}>
        <Container maxWidth="lg">
          <Typography variant="body2" align="center">
            数据来源: 美国国家美术馆 (National Gallery of Art)
          </Typography>
          <Typography variant="body2" align="center" sx={{ mt: 1, opacity: 0.7 }}>
            Images are in the public domain (CC0)
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;
