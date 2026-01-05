import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  Menu as MenuIcon,
  Home as HomeIcon,
  Collections as CollectionsIcon,
  Timeline as TimelineIcon,
  Analytics as AnalyticsIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';

interface HeaderProps {
  onSearch?: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onSearch }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };
  
  const menuItems = [
    { text: '首页', icon: <HomeIcon />, path: '/' },
    { text: '藏品', icon: <CollectionsIcon />, path: '/collection' },
    { text: '时间线', icon: <TimelineIcon />, path: '/timeline' },
    { text: '分析', icon: <AnalyticsIcon />, path: '/analysis' },
    { text: '关于', icon: <InfoIcon />, path: '/about' },
  ];
  
  return (
    <AppBar position="sticky" color="default" elevation={1}>
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {/* Logo */}
          <Typography
            variant="h6"
            noWrap
            component={Link}
            to="/"
            sx={{
              mr: 2,
              display: 'flex',
              fontWeight: 700,
              color: 'inherit',
              textDecoration: 'none',
              flexGrow: isMobile ? 1 : 0,
            }}
          >
            NGA 线上博物馆
          </Typography>
          
          {/* Search bar - desktop only */}
          {!isMobile && (
            <Box
              component="form"
              onSubmit={handleSearch}
              sx={{ flexGrow: 1, mx: 4, maxWidth: 600 }}
            >
              <TextField
                fullWidth
                size="small"
                placeholder="搜索藏品、艺术家..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          )}
          
          {/* Desktop menu */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {menuItems.map((item) => (
                <Button
                  key={item.text}
                  component={Link}
                  to={item.path}
                  startIcon={item.icon}
                  color="inherit"
                >
                  {item.text}
                </Button>
              ))}
            </Box>
          )}
          
          {/* Mobile menu button */}
          {isMobile && (
            <IconButton
              color="inherit"
              edge="end"
              onClick={() => setMobileMenuOpen(true)}
            >
              <MenuIcon />
            </IconButton>
          )}
        </Toolbar>
      </Container>
      
      {/* Mobile drawer */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      >
        <Box sx={{ width: 280, pt: 2 }}>
          {/* Mobile search */}
          <Box
            component="form"
            onSubmit={handleSearch}
            sx={{ px: 2, mb: 2 }}
          >
            <TextField
              fullWidth
              size="small"
              placeholder="搜索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          
          <List>
            {menuItems.map((item) => (
              <ListItem
                key={item.text}
                disablePadding
              >
                <ListItemButton
                  component={Link}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
};

export default Header;
