import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  InputAdornment,
  Button,
} from '@mui/material';
import {
  Search as SearchIcon,
} from '@mui/icons-material';
import { useAppStore } from '../store/appStore';
import CollectionPage from './CollectionPage';

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { setFilters } = useAppStore();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      setFilters({ search: q });
    }
  }, [searchParams, setFilters]);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: query });
    setFilters({ search: query });
  };
  
  return (
    <Box>
      {/* Search header */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          py: 6,
          mb: 4,
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h4" sx={{ mb: 3, textAlign: 'center' }}>
            搜索藏品
          </Typography>
          <Box
            component="form"
            onSubmit={handleSearch}
            sx={{ display: 'flex', gap: 2 }}
          >
            <TextField
              fullWidth
              placeholder="搜索标题、艺术家、媒材..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              sx={{
                bgcolor: 'white',
                borderRadius: 1,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                px: 4,
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.9)',
                },
              }}
            >
              搜索
            </Button>
          </Box>
          {searchParams.get('q') && (
            <Typography sx={{ mt: 2, textAlign: 'center', opacity: 0.9 }}>
              搜索结果: "{searchParams.get('q')}"
            </Typography>
          )}
        </Container>
      </Box>
      
      {/* Results */}
      <CollectionPage />
    </Box>
  );
};

export default SearchPage;
