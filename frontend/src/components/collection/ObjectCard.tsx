import React from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import type { Object } from '../../types';
import { Link } from 'react-router-dom';

interface ObjectCardProps {
  object: Object;
  viewMode?: 'grid' | 'list';
}

const ObjectCard: React.FC<ObjectCardProps> = ({ object, viewMode = 'grid' }) => {
  const images = object.images || [];
  const hasImage = images.length > 0;
  const primaryImage = hasImage ? images.find(img => img.view_type === 'primary') : null;
  // 使用更高分辨率的缩略图（400x400）
  const thumbnailUrl = primaryImage?.iiif_url 
    ? `${primaryImage.iiif_url}/full/!400,400/0/default.jpg`
    : primaryImage?.iiif_thumb_url || '';
  
  if (viewMode === 'list') {
    return (
      <Card
        component={Link}
        to={`/object/${object.object_id}`}
        sx={{
          display: 'flex',
          mb: 2,
          textDecoration: 'none',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 3,
          },
        }}
      >
        {hasImage && (
          <CardMedia
            component="img"
            sx={{ width: 150, height: 150, objectFit: 'cover' }}
            image={thumbnailUrl}
            alt={object.title}
          />
        )}
        <CardContent sx={{ flex: 1 }}>
          <Typography variant="h6" component="div" noWrap>
            {object.title || 'Untitled'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {object.attribution || 'Unknown Artist'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {object.display_date || 'Date unknown'}
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {object.classification && (
              <Chip label={object.classification} size="small" />
            )}
            {object.department && (
              <Chip label={object.department} size="small" variant="outlined" />
            )}
          </Box>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card
      component={Link}
      to={`/object/${object.object_id}`}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          paddingTop: '100%',
          backgroundColor: '#f5f5f5',
        }}
      >
        {hasImage ? (
          <CardMedia
            component="img"
            image={thumbnailUrl}
            alt={object.title}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              p: 1,
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
            No Image
          </Box>
        )}
      </Box>
      <CardContent sx={{ flex: 1, p: 2 }}>
        <Typography variant="subtitle1" component="div" noWrap title={object.title}>
          {object.title || 'Untitled'}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {object.attribution || 'Unknown Artist'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {object.display_date || 'Date unknown'}
        </Typography>
        {object.classification && (
          <Chip
            label={object.classification}
            size="small"
            sx={{ mt: 1 }}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default ObjectCard;
