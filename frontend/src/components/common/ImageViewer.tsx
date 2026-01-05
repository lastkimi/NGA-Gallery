import React, { useEffect, useRef } from 'react';
import { Box, Dialog, IconButton, Toolbar, AppBar, Typography } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

interface ImageViewerProps {
  open: boolean;
  onClose: () => void;
  imageUrl?: string;
  title?: string;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ open, onClose, imageUrl, title }) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (open && imageUrl && viewerRef.current) {
      // 清理之前的实例
      if (viewerInstanceRef.current) {
        viewerInstanceRef.current.destroy();
        viewerInstanceRef.current = null;
      }

      // 动态导入OpenSeadragon
      import('openseadragon').then((OpenSeadragon) => {
        if (viewerRef.current && imageUrl) {
          // IIIF URL格式转换 - OpenSeadragon需要info.json URL
          const tileSource = imageUrl.endsWith('/info.json') ? imageUrl : `${imageUrl}/info.json`;
          
          viewerInstanceRef.current = OpenSeadragon.default({
            element: viewerRef.current,
            prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@4.1.0/build/openseadragon/images/',
            tileSources: tileSource,
            showNavigationControl: true,
            showZoomControl: true,
            showHomeControl: true,
            showFullPageControl: true,
            showRotationControl: false,
            gestureSettingsMouse: {
              clickToZoom: true,
              dblClickToZoom: true,
              flickEnabled: true,
              pinchToZoom: true,
            },
            zoomPerClick: 1.2,
            zoomPerScroll: 1.2,
            maxZoomLevel: 10,
            minZoomLevel: 0.5,
            visibilityRatio: 0.5,
            constrainDuringPan: true,
            animationTime: 1.2,
            blendTime: 0.0,
            alwaysBlend: false,
            smoothTileEdgesMinZoom: 1.5,
            timeout: 30000,
            useCanvas: true,
          });
        }
      }).catch((err) => {
        console.error('Error loading OpenSeadragon:', err);
      });
    }

    return () => {
      if (viewerInstanceRef.current) {
        viewerInstanceRef.current.destroy();
        viewerInstanceRef.current = null;
      }
    };
  }, [open, imageUrl]);

  if (!open) return null;

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDialog-paper': {
          bgcolor: 'rgba(0, 0, 0, 0.95)',
        },
      }}
    >
      <AppBar sx={{ position: 'relative', bgcolor: 'rgba(0, 0, 0, 0.8)' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flex: 1, color: 'white' }}>
            {title || '图片查看器'}
          </Typography>
          <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box
        ref={viewerRef}
        sx={{
          width: '100%',
          height: 'calc(100vh - 64px)',
          bgcolor: '#000',
        }}
      />
    </Dialog>
  );
};

export default ImageViewer;
