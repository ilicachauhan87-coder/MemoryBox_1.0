import React from 'react';
import { Button } from './ui/button';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Slider } from './ui/slider';

interface ZoomControlsProps {
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
  minZoom?: number;
  maxZoom?: number;
  isMobile?: boolean;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoomLevel,
  onZoomChange,
  minZoom = 0.5,
  maxZoom = 3,
  isMobile = false
}) => {
  const handleZoomIn = () => {
    const newZoom = Math.min(maxZoom, zoomLevel + 0.25);
    onZoomChange(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(minZoom, zoomLevel - 0.25);
    onZoomChange(newZoom);
  };

  const handleReset = () => {
    onZoomChange(1);
  };

  const handleSliderChange = (value: number[]) => {
    onZoomChange(value[0]);
  };

  const zoomPercentage = Math.round(zoomLevel * 100);

  return (
    <div
      className={`inline-flex items-center gap-2 ${
        isMobile 
          ? 'bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5' 
          : 'bg-gray-50 border border-gray-200 rounded-lg px-3 py-2'
      }`}
    >
      {/* Zoom Out Button */}
      <Button
        onClick={handleZoomOut}
        disabled={zoomLevel <= minZoom}
        variant="ghost"
        size={isMobile ? "sm" : "sm"}
        className={`h-7 w-7 p-0 ${zoomLevel <= minZoom ? 'opacity-40' : 'hover:bg-gray-200'}`}
        title="Zoom out (Ctrl + -)"
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </Button>

      {/* Slider - Desktop Only */}
      {!isMobile && (
        <div className="w-24 px-1">
          <Slider
            value={[zoomLevel]}
            onValueChange={handleSliderChange}
            min={minZoom}
            max={maxZoom}
            step={0.05}
            className="w-full"
          />
        </div>
      )}

      {/* Zoom Percentage - Clickable to reset */}
      <button
        onClick={handleReset}
        className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors min-w-[42px] text-center"
        title="Click to reset to 100%"
      >
        {zoomPercentage}%
      </button>

      {/* Zoom In Button */}
      <Button
        onClick={handleZoomIn}
        disabled={zoomLevel >= maxZoom}
        variant="ghost"
        size={isMobile ? "sm" : "sm"}
        className={`h-7 w-7 p-0 ${zoomLevel >= maxZoom ? 'opacity-40' : 'hover:bg-gray-200'}`}
        title="Zoom in (Ctrl + +)"
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </Button>

      {/* Reset Button - Desktop Only */}
      {!isMobile && (
        <Button
          onClick={handleReset}
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 hover:bg-gray-200"
          title="Reset zoom to 100%"
        >
          <Maximize2 className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
};
