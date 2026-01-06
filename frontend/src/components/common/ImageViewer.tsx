import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

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
      // Clean up previous instance
      if (viewerInstanceRef.current) {
        viewerInstanceRef.current.destroy();
        viewerInstanceRef.current = null;
      }

      // Dynamic import OpenSeadragon
      import('openseadragon').then((OpenSeadragon) => {
        if (viewerRef.current && imageUrl) {
          // IIIF URL conversion
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
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95">
      <div className="flex items-center justify-between p-4 bg-black/80 text-white">
        <h3 className="text-lg font-medium truncate flex-1 pr-4">
          {title || 'ImageViewer'}
        </h3>
        <button 
          onClick={onClose} 
          className="btn btn-ghost btn-circle btn-sm text-white hover:bg-white/20"
        >
          <X size={24} />
        </button>
      </div>
      <div 
        ref={viewerRef}
        className="w-full flex-1 bg-black"
      />
    </div>
  );
};

export default ImageViewer;
