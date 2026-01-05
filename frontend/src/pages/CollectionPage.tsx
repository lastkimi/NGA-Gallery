import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  CircularProgress,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Chip,
  Stack,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Collapse,
  useMediaQuery,
  useTheme,
  Slider,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  ViewModule as GridViewIcon,
  ViewList as ListViewIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useAppStore } from '../store/appStore';
import { objectsApi } from '../services/api';
import ObjectCard from '../components/collection/ObjectCard';
import Header from '../components/common/Header';

const CollectionPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
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
  
  const [classifications, setClassifications] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  // 初始化yearRange，如果有filters中的年份信息则使用，否则使用默认值
  const [yearRange, setYearRange] = useState<number[]>([
    filters.beginYear || 1000,
    filters.endYear || 2024,
  ]);
  const [localFilters, setLocalFilters] = useState({
    search: '',
    classification: '',
    department: '',
    artist: '',
    beginYear: '',
    endYear: '',
  });
  
  // 同步filters到yearRange（当filters从外部改变时）
  useEffect(() => {
    if (filters.beginYear !== null || filters.endYear !== null) {
      setYearRange([
        filters.beginYear || 1000,
        filters.endYear || 2024,
      ]);
    }
  }, [filters.beginYear, filters.endYear]);
  
  // Fetch objects data
  useEffect(() => {
    const fetchObjects = async () => {
      setIsLoading(true);
      try {
        const response = await objectsApi.getList(filters, pagination.page, pagination.limit);
        setObjects(response.data);
        setPagination({
          page: response.pagination.page,
          limit: response.pagination.limit,
          total: response.pagination.total,
          totalPages: response.pagination.totalPages,
        });
      } catch (err) {
        console.error('Error fetching objects:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchObjects();
  }, [filters, pagination.page, pagination.limit, setObjects, setPagination, setIsLoading]);
  
  // Fetch filter options
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
    // 如果年份范围是默认的[1000, 2024]，则不应用年份筛选（设置为null）
    // 否则应用选择的年份范围
    const defaultYearRange = [1000, 2024];
    const isDefaultRange = yearRange[0] === defaultYearRange[0] && yearRange[1] === defaultYearRange[1];
    
    setFilters({
      search: localFilters.search,
      classification: localFilters.classification,
      department: localFilters.department,
      artist: localFilters.artist,
      beginYear: isDefaultRange ? null : yearRange[0],
      endYear: isDefaultRange ? null : yearRange[1],
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
    setYearRange([1000, 2024]);
    resetFilters();
    setPagination({ page: 1 });
  };
  
  const handleYearRangeChange = (_: Event, newValue: number | number[]) => {
    const values = newValue as number[];
    setYearRange(values);
    setLocalFilters({
      ...localFilters,
      beginYear: values[0].toString(),
      endYear: values[1].toString(),
    });
  };
  
  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    setPagination({ page });
  };
  
  const activeFiltersCount = [
    localFilters.classification,
    localFilters.department,
    localFilters.artist,
    yearRange[0] !== 1000 || yearRange[1] !== 2024 ? 'year' : null,
  ].filter(Boolean).length;
  
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fafafa' }}>
      <Header />
      
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 1, sm: 2, md: 3 } }}>
        {/* Page header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            mb: { xs: 2, md: 4 },
            flexWrap: 'wrap',
            gap: 2,
            flexDirection: { xs: 'column', sm: 'row' },
          }}
        >
          <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 600 }}>
              藏品浏览
            </Typography>
            <Typography variant="body2" color="text.secondary">
              共 {pagination.total.toLocaleString()} 件藏品
            </Typography>
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            gap: { xs: 1, md: 2 }, 
            alignItems: 'center',
            width: { xs: '100%', sm: 'auto' },
            justifyContent: { xs: 'space-between', sm: 'flex-end' },
          }}>
            {/* Filter button */}
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => setFilterPanelOpen(!filterPanelOpen)}
              sx={{ position: 'relative' }}
            >
              筛选
              {activeFiltersCount > 0 && (
                <Chip
                  label={activeFiltersCount}
                  size="small"
                  color="primary"
                  sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    minWidth: 20,
                    height: 20,
                  }}
                />
              )}
            </Button>
            
            {/* View mode toggle */}
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, value) => value && setViewMode(value)}
              size="small"
            >
              <ToggleButton value="grid">
                <GridViewIcon />
              </ToggleButton>
              <ToggleButton value="list">
                <ListViewIcon />
              </ToggleButton>
            </ToggleButtonGroup>
            
            {/* Refresh button */}
            <IconButton onClick={() => window.location.reload()}>
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>
        
        {/* Filter panel */}
        <Collapse in={filterPanelOpen}>
          <Paper sx={{ p: 3, mb: 4 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
              }}
            >
              <Typography variant="h6">高级筛选</Typography>
              <IconButton onClick={() => setFilterPanelOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
            
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="搜索"
                  value={localFilters.search}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, search: e.target.value })
                  }
                  placeholder="搜索标题、描述..."
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="艺术家"
                  value={localFilters.artist}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, artist: e.target.value })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>分类</InputLabel>
                  <Select
                    value={localFilters.classification}
                    label="分类"
                    onChange={(e) =>
                      setLocalFilters({ ...localFilters, classification: e.target.value })
                    }
                  >
                    <MenuItem value="">全部</MenuItem>
                    {classifications.map((c) => (
                      <MenuItem key={c} value={c}>
                        {c}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>部门</InputLabel>
                  <Select
                    value={localFilters.department}
                    label="部门"
                    onChange={(e) =>
                      setLocalFilters({ ...localFilters, department: e.target.value })
                    }
                  >
                    <MenuItem value="">全部</MenuItem>
                    {departments.map((d) => (
                      <MenuItem key={d} value={d}>
                        {d}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box>
                  <Typography gutterBottom sx={{ mb: 2 }}>
                    年份范围: {yearRange[0]} - {yearRange[1]}
                  </Typography>
                  <Slider
                    value={yearRange}
                    onChange={handleYearRangeChange}
                    valueLabelDisplay="auto"
                    min={1000}
                    max={2024}
                    step={10}
                    marks={[
                      { value: 1000, label: '1000' },
                      { value: 1500, label: '1500' },
                      { value: 1800, label: '1800' },
                      { value: 2024, label: '2024' },
                    ]}
                  />
                </Box>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button onClick={handleReset}>重置</Button>
              <Button variant="contained" onClick={handleFilterApply}>
                应用筛选
              </Button>
            </Box>
          </Paper>
        </Collapse>
        
        {/* Active filters */}
        {activeFiltersCount > 0 && (
          <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
            {localFilters.classification && (
              <Chip
                label={`分类: ${localFilters.classification}`}
                onDelete={() =>
                  setLocalFilters({ ...localFilters, classification: '' })
                }
              />
            )}
            {localFilters.department && (
              <Chip
                label={`部门: ${localFilters.department}`}
                onDelete={() =>
                  setLocalFilters({ ...localFilters, department: '' })
                }
              />
            )}
            {localFilters.artist && (
              <Chip
                label={`艺术家: ${localFilters.artist}`}
                onDelete={() =>
                  setLocalFilters({ ...localFilters, artist: '' })
                }
              />
            )}
            {(yearRange[0] !== 1000 || yearRange[1] !== 2024) && (
              <Chip
                label={`年份: ${yearRange[0]} - ${yearRange[1]}`}
                onDelete={() => {
                  setYearRange([1000, 2024]);
                  setLocalFilters({ ...localFilters, beginYear: '', endYear: '' });
                }}
              />
            )}
          </Stack>
        )}
        
        {/* Content */}
        {isLoading && objects.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : objects.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary">
              未找到匹配的藏品
            </Typography>
            <Button onClick={handleReset} sx={{ mt: 2 }}>
              清除筛选条件
            </Button>
          </Box>
        ) : (
          <>
            {/* Objects grid/list */}
            <Grid container spacing={3}>
              {objects.map((object) => (
                <Grid
                  size={{
                    xs: 12,
                    sm: viewMode === 'grid' ? 6 : 12,
                    md: viewMode === 'grid' ? 4 : 12,
                    lg: viewMode === 'grid' ? 3 : 12,
                  }}
                  key={object.object_id || object.id}
                >
                  <ObjectCard object={object} viewMode={viewMode} />
                </Grid>
              ))}
            </Grid>
            
            {/* Loading indicator for infinite scroll */}
            {isLoading && objects.length > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            )}
            
            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <Pagination
                  count={pagination.totalPages}
                  page={pagination.page}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                />
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  );
};

export default CollectionPage;
