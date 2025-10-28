import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Share2, ZoomIn, ZoomOut, Maximize2, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner@2.0.3';

interface MediaFile {
  file?: File | Blob;
  preview?: string;
  url?: string; // Supabase Storage URL
  type: 'photo' | 'video' | 'audio' | 'text';
  name: string;
  size?: number;
  compressed?: boolean;
}

interface MemoryMediaViewerProps {
  files: MediaFile[];
  initialIndex?: number;
  onClose: () => void;
  memoryTitle?: string;
}

export const MemoryMediaViewer: React.FC<MemoryMediaViewerProps> = ({
  files,
  initialIndex = 0,
  onClose,
  memoryTitle = 'Memory'
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPinching, setIsPinching] = useState(false);
  const [touchDistance, setTouchDistance] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [isFullscreenSupported, setIsFullscreenSupported] = useState(false);

  const currentFile = files[currentIndex];
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < files.length - 1;

  // Check if fullscreen is supported on mount
  useEffect(() => {
    const checkFullscreenSupport = () => {
      const element = document.createElement('div');
      const isSupported = !!(
        element.requestFullscreen ||
        // @ts-ignore - vendor prefixes
        element.webkitRequestFullscreen ||
        // @ts-ignore
        element.mozRequestFullScreen ||
        // @ts-ignore
        element.msRequestFullscreen
      );
      setIsFullscreenSupported(isSupported);
    };
    checkFullscreenSupport();
  }, []);

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    if (hasPrevious) {
      setCurrentIndex(prev => prev - 1);
      setZoomLevel(1);
      setIsZoomed(false);
      setIsPlaying(false);
    }
  }, [hasPrevious]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      setCurrentIndex(prev => prev + 1);
      setZoomLevel(1);
      setIsZoomed(false);
      setIsPlaying(false);
    }
  }, [hasNext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === ' ') {
        e.preventDefault();
        if (currentFile.type === 'video' && videoRef) {
          if (isPlaying) {
            videoRef.pause();
            setIsPlaying(false);
          } else {
            videoRef.play();
            setIsPlaying(true);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handlePrevious, handleNext, currentFile, isPlaying, videoRef]);

  // Touch gesture handlers for swipe
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch gesture
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchDistance(distance);
      setIsPinching(true);
    } else if (e.touches.length === 1) {
      // Swipe gesture
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setTouchEnd(null);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPinching && currentFile.type === 'photo') {
      // Pinch to zoom
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = distance / touchDistance;
      const newZoom = Math.max(1, Math.min(3, zoomLevel * scale));
      setZoomLevel(newZoom);
      setTouchDistance(distance);
      if (newZoom > 1) setIsZoomed(true);
    } else if (e.touches.length === 1) {
      setTouchEnd({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchEnd = () => {
    if (isPinching) {
      setIsPinching(false);
      if (zoomLevel <= 1.1) {
        setZoomLevel(1);
        setIsZoomed(false);
      }
      return;
    }

    if (!touchStart || !touchEnd) return;

    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;
    const minSwipeDistance = 50;

    // Horizontal swipe (navigate)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        handleNext();
      } else {
        handlePrevious();
      }
    }

    // Vertical swipe down (close)
    if (deltaY < -minSwipeDistance && Math.abs(deltaY) > Math.abs(deltaX)) {
      onClose();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  // Download handler
  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = currentFile.url || currentFile.preview;
      link.download = currentFile.name || `memory-${currentIndex + 1}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started!');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download file');
    }
  };

  // Share handler
  const handleShare = async () => {
    try {
      const fileUrl = currentFile.url || currentFile.preview;
      if (navigator.share) {
        await navigator.share({
          title: memoryTitle,
          text: `Check out this memory: ${currentFile.name}`,
          url: fileUrl
        });
        toast.success('Shared successfully!');
      } else {
        // Fallback: copy link to clipboard
        await navigator.clipboard.writeText(fileUrl);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Share failed:', error);
      if (error.name !== 'AbortError') {
        toast.error('Failed to share');
      }
    }
  };

  // Zoom handlers
  const handleZoomIn = () => {
    if (currentFile.type === 'photo') {
      const newZoom = Math.min(3, zoomLevel + 0.5);
      setZoomLevel(newZoom);
      setIsZoomed(newZoom > 1);
    }
  };

  const handleZoomOut = () => {
    if (currentFile.type === 'photo') {
      const newZoom = Math.max(1, zoomLevel - 0.5);
      setZoomLevel(newZoom);
      setIsZoomed(newZoom > 1);
    }
  };

  const handleFullscreen = async () => {
    try {
      const element = document.getElementById('media-viewer-container');
      if (!element) return;

      // Check if fullscreen is already active
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      // Feature detection and permissions check
      if (!element.requestFullscreen) {
        console.warn('Fullscreen API not supported');
        toast.error('Fullscreen not supported on this device');
        return;
      }

      // Check if fullscreen is allowed by permissions policy
      if ('permissions' in navigator) {
        try {
          // @ts-ignore - fullscreen permission may not be in types
          const result = await navigator.permissions.query({ name: 'fullscreen' });
          if (result.state === 'denied') {
            toast.error('Fullscreen access is blocked. Please enable it in browser settings.');
            return;
          }
        } catch (e) {
          // Permissions API may not support fullscreen query, continue anyway
          console.log('Permissions API check not available, attempting fullscreen anyway');
        }
      }

      // Attempt to enter fullscreen
      await element.requestFullscreen();
    } catch (error: any) {
      console.error('Fullscreen error:', error);
      
      // User-friendly error messages
      if (error.message?.includes('permissions policy')) {
        toast.error('Fullscreen is blocked by your browser settings');
      } else if (error.name === 'TypeError') {
        toast.error('Unable to enter fullscreen mode on this device');
      } else {
        toast.error('Could not enter fullscreen mode');
      }
    }
  };

  // Video controls
  const togglePlayPause = () => {
    if (videoRef) {
      if (isPlaying) {
        videoRef.pause();
        setIsPlaying(false);
      } else {
        videoRef.play();
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef) {
      videoRef.muted = !videoRef.muted;
      setIsMuted(!isMuted);
    }
    if (audioRef) {
      audioRef.muted = !audioRef.muted;
      setIsMuted(!isMuted);
    }
  };

  // Auto-pause video when switching
  useEffect(() => {
    if (videoRef) {
      setIsPlaying(false);
      videoRef.pause();
    }
  }, [currentIndex]);

  return (
    <div
      id="media-viewer-container"
      className="fixed inset-0 z-[100] bg-black"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-10">
        <div className="flex-1 min-w-0">
          <h3 className="text-white text-lg truncate">{currentFile.name}</h3>
          <p className="text-white/70 text-sm">
            {currentIndex + 1} of {files.length}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20 ml-4 flex-shrink-0"
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      {/* Main Content - Fixed to prevent cutoff and ensure full display */}
      <div className="w-full h-full flex items-center justify-center px-2 pt-20 pb-24 sm:px-4 sm:pb-32">
        {currentFile.type === 'photo' && (
          <div 
            className={`w-full h-full flex items-center justify-center ${isZoomed ? 'overflow-auto' : 'overflow-hidden'}`}
          >
            <div
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
                transition: isPinching ? 'none' : 'transform 0.2s ease-out',
                cursor: isZoomed ? 'zoom-out' : 'zoom-in'
              }}
              onClick={() => {
                if (isZoomed) {
                  setZoomLevel(1);
                  setIsZoomed(false);
                } else {
                  setZoomLevel(2);
                  setIsZoomed(true);
                }
              }}
            >
              <ImageWithFallback
                src={currentFile.url || currentFile.preview}
                alt={currentFile.name}
                className="block"
                style={{
                  maxWidth: '100vw',
                  maxHeight: 'calc(100vh - 14rem)',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain'
                }}
              />
            </div>
          </div>
        )}

        {currentFile.type === 'video' && (
          <div className="w-full h-full flex items-center justify-center">
            <video
              ref={setVideoRef}
              src={currentFile.url || currentFile.preview}
              controls
              controlsList="nodownload"
              className="block"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain'
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              playsInline
              preload="metadata"
            />
          </div>
        )}

        {currentFile.type === 'audio' && (
          <div className="flex flex-col items-center justify-center gap-6 p-8 bg-gradient-to-br from-green-900/50 to-emerald-900/50 rounded-2xl">
            <div className="p-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full">
              <Volume2 className="w-16 h-16 text-white" />
            </div>
            <div className="text-center">
              <h4 className="text-white text-xl mb-2">Audio File</h4>
              <p className="text-white/70">{currentFile.name}</p>
            </div>
            <audio
              ref={setAudioRef}
              src={currentFile.url || currentFile.preview}
              controls
              className="w-full max-w-md"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>
        )}
      </div>

      {/* Navigation - Left */}
      {hasPrevious && (
        <button
          onClick={handlePrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/80 rounded-full transition-all z-10 backdrop-blur-sm"
        >
          <ChevronLeft className="w-8 h-8 text-white" />
        </button>
      )}

      {/* Navigation - Right */}
      {hasNext && (
        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/80 rounded-full transition-all z-10 backdrop-blur-sm"
        >
          <ChevronRight className="w-8 h-8 text-white" />
        </button>
      )}

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent z-10">
        {/* Action Buttons */}
        <div className="flex justify-center gap-2 p-4">
          {currentFile.type === 'photo' && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                className="text-white hover:bg-white/20"
                disabled={zoomLevel >= 3}
              >
                <ZoomIn className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                className="text-white hover:bg-white/20"
                disabled={zoomLevel <= 1}
              >
                <ZoomOut className="w-5 h-5" />
              </Button>
            </>
          )}
          
          {/* Only show fullscreen button if API is supported */}
          {isFullscreenSupported && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFullscreen}
              className="text-white hover:bg-white/20"
            >
              <Maximize2 className="w-5 h-5" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="text-white hover:bg-white/20"
          >
            <Download className="w-5 h-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            className="text-white hover:bg-white/20"
          >
            <Share2 className="w-5 h-5" />
          </Button>
        </div>

        {/* Thumbnail Strip */}
        <div className="flex gap-2 overflow-x-auto p-4 pt-0 scrollbar-hide">
          {files.map((file, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentIndex(idx);
                setZoomLevel(1);
                setIsZoomed(false);
              }}
              className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all ${
                idx === currentIndex
                  ? 'border-white scale-110'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              {file.type === 'photo' && (
                <ImageWithFallback
                  src={file.url || file.preview}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              )}
              {file.type === 'video' && (
                <div className="w-full h-full bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center">
                  <Play className="w-6 h-6 text-white" />
                </div>
              )}
              {file.type === 'audio' && (
                <div className="w-full h-full bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center">
                  <Volume2 className="w-6 h-6 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Swipe hint for mobile */}
      {files.length > 1 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-white/60 text-sm text-center pointer-events-none">
          Swipe left/right to navigate • Swipe down to close
        </div>
      )}
    </div>
  );
};
