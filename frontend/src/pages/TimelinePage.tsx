import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { analysisApi } from '../services/api';
import Header from '../components/common/Header';

interface TimelineData {
  period: string;
  count: number;
  startYear: number;
}

const TimelinePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TimelineData[]>([]);
  const [interval, setInterval] = useState('decade');
  const [startYear, setStartYear] = useState(1000);
  const [endYear, setEndYear] = useState(2024);
  
  const intervals = [
    { value: 'year', label: '年度' },
    { value: 'decade', label: '十年' },
    { value: 'century', label: '世纪' },
  ];
  
  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const timelineData = await analysisApi.getTimeline(
          startYear,
          endYear,
          interval
        );
        setData(timelineData);
      } catch (err) {
        setError('无法加载时间线数据');
        console.error('Error fetching timeline:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTimeline();
  }, [startYear, endYear, interval]);
  
  const handleYearRangeChange = (_: Event, newValue: number | number[]) => {
    const values = newValue as number[];
    setStartYear(values[0]);
    setEndYear(values[1]);
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
  
  if (error) {
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
          艺术时间线
        </Typography>
        
        {/* Controls */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>时间间隔</InputLabel>
                <Select
                  value={interval}
                  label="时间间隔"
                  onChange={(e) => setInterval(e.target.value)}
                >
                  {intervals.map((int) => (
                    <MenuItem key={int.value} value={int.value}>
                      {int.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <Typography gutterBottom>年份范围: {startYear} - {endYear}</Typography>
              <Slider
                value={[startYear, endYear]}
                onChange={handleYearRangeChange}
                valueLabelDisplay="auto"
                min={1000}
                max={2024}
                step={interval === 'century' ? 100 : interval === 'decade' ? 10 : 1}
              />
            </Grid>
          </Grid>
        </Paper>
        
        {/* Timeline chart */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3 }}>
            作品数量时间分布
          </Typography>
          <ResponsiveContainer width="100%" height={500}>
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="period"
                angle={-45}
                textAnchor="end"
                height={80}
                interval={Math.ceil(data.length / 20) - 1}
              />
              <YAxis />
              <Tooltip
                formatter={(value: number | undefined) => [value ?? 0, '作品数量']}
                labelFormatter={(label) => `${label}年代`}
              />
              <Bar dataKey="count" fill="#8884d8" name="作品数量" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
        
        {/* Statistics */}
        <Grid container spacing={3} sx={{ mt: 4 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                总计作品
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {data.reduce((sum, item) => sum + item.count, 0).toLocaleString()}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                时间跨度
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                {endYear - startYear}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                年
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                最密集时期
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                {data.reduce((max, item) =>
                  item.count > max.count ? item : max
                , data[0] || { period: '', count: 0 }).period}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                作品最多
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default TimelinePage;
