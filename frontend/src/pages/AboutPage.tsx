import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Link,
  Divider,
} from '@mui/material';
import Header from '../components/common/Header';

const AboutPage: React.FC = () => {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fafafa' }}>
      <Header />
      
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 4 }}>
          关于项目
        </Typography>
        
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 4, mb: 4 }}>
              <Typography variant="h5" sx={{ mb: 3 }}>
                NGA 线上博物馆
              </Typography>
              <Typography variant="body1" paragraph>
                这是一个基于美国国家美术馆(National Gallery of Art)开放数据构建的在线博物馆网站。
                项目旨在让更多人能够方便地探索和欣赏这些珍贵的艺术藏品。
              </Typography>
              <Typography variant="body1" paragraph>
                网站提供了丰富的搜索和筛选功能，支持按艺术家、时期、风格、媒材等多个维度进行检索。
                同时，我们还提供了数据分析工具，帮助用户深入了解艺术收藏的分布和特点。
              </Typography>
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" sx={{ mb: 2 }}>
                数据来源
              </Typography>
              <Typography variant="body2" paragraph>
                本网站使用的数据全部来自美国国家美术馆的开放获取资源，包括：
              </Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                <li>
                  <Link href="https://github.com/NationalGalleryOfArt/opendata" target="_blank">
                    NGA Open Data (GitHub)
                  </Link>
                  - 包含超过150,000件艺术品的元数据
                </li>
                <li>
                  <Link href="https://commons.wikimedia.org/wiki/Commons:NGA" target="_blank">
                    Wikimedia Commons
                  </Link>
                  - 53,000+张高分辨率公共领域图片
                </li>
                <li>
                  <Link href="https://www.wikidata.org/" target="_blank">
                    Wikidata
                  </Link>
                  - 结构化链接数据
                </li>
              </Box>
              
              <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                所有图片均采用CC0公共领域许可，可自由使用。
              </Typography>
            </Paper>
            
            <Paper sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ mb: 3 }}>
                技术栈
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="subtitle2">前端</Typography>
                  <Typography variant="body2" color="text.secondary">
                    React + TypeScript
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="subtitle2">UI框架</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Material-UI
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="subtitle2">后端</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Node.js + Express
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="subtitle2">数据库</Typography>
                  <Typography variant="body2" color="text.secondary">
                    PostgreSQL
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                快速链接
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Link href="https://www.nga.gov/" target="_blank">
                  NGA 官方网站
                </Link>
                <Link href="https://www.nga.gov/collection.html" target="_blank">
                  NGA 藏品
                </Link>
                <Link href="https://www.nga.gov/open-access-images.html" target="_blank">
                  开放获取图片
                </Link>
                <Divider />
                <Link href="https://github.com/" target="_blank">
                  GitHub
                </Link>
                <Link href="https://commons.wikimedia.org/" target="_blank">
                  Wikimedia Commons
                </Link>
              </Box>
            </Paper>
            
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                统计数据
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2">
                  <strong>62,307+</strong> 件藏品
                </Typography>
                <Typography variant="body2">
                  <strong>53,000+</strong> 张图片
                </Typography>
                <Typography variant="body2">
                  <strong>CC0</strong> 公共领域许可
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default AboutPage;
