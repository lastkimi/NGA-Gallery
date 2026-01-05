import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { analysisApi } from '../services/api';
import Header from '../components/common/Header';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

interface StatisticsData {
  totalObjects: number;
  byClassification: { classification: string; count: number }[];
  byDepartment: { department: string; count: number }[];
  byCentury: { century: string; count: number }[];
  dateRange: { earliest: number; latest: number };
  topArtists: { attribution: string; count: number }[];
}

const AnalysisPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatisticsData | null>(null);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await analysisApi.getStatistics();
        setStats(response as unknown as StatisticsData);
      } catch (err) {
        setError('无法加载统计数据');
        console.error('Error fetching statistics:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);
  
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
  
  if (error || !stats) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#fafafa' }}>
        <Header />
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </Box>
    );
  }
  
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fafafa' }}>
      <Header />
      
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 4 }}>
          数据分析
        </Typography>
        
        {/* Overview cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  总藏品数
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {stats.totalObjects.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  最早作品
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                  {stats.dateRange.earliest}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  最近作品
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                  {stats.dateRange.latest}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  分类数量
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                  {stats.byClassification.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Charts */}
        <Grid container spacing={4}>
          {/* Classification distribution */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                分类分布
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={stats.byClassification.slice(0, 10)}
                  layout={isMobile ? 'vertical' : 'horizontal'}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  {isMobile ? (
                    <>
                      <XAxis type="number" />
                      <YAxis dataKey="classification" type="category" width={100} />
                    </>
                  ) : (
                    <>
                      <XAxis dataKey="classification" />
                      <YAxis />
                    </>
                  )}
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          
          {/* Department distribution */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                部门分布
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.byDepartment}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name || 'Unknown'} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {stats.byDepartment.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          
          {/* Century distribution */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                世纪分布
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={stats.byCentury}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="century" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                    name="作品数量"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          
          {/* Top artists */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                作品最多的艺术家
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={stats.topArtists.slice(0, 10)}
                  layout={isMobile ? 'vertical' : 'horizontal'}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  {isMobile ? (
                    <>
                      <XAxis type="number" />
                      <YAxis dataKey="attribution" type="category" width={120} />
                    </>
                  ) : (
                    <>
                      <XAxis dataKey="attribution" />
                      <YAxis />
                    </>
                  )}
                  <Tooltip />
                  <Bar dataKey="count" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default AnalysisPage;
