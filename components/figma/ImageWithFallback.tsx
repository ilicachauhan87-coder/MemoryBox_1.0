import React, { useState } from 'react'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [didError, setDidError] = useState(false)

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    
    // 🔍 ENHANCED DIAGNOSTICS: Log detailed error information
    console.error('❌ ImageWithFallback: Failed to load image:', {
      src: props.src,
      alt: props.alt,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      complete: img.complete,
      currentSrc: img.currentSrc,
      error: e,
      errorType: 'Failed to load image - likely CORS, 403, or network issue',
      possibleCauses: [
        '1. Supabase Storage bucket is PRIVATE (should be PUBLIC)',
        '2. CORS not configured for Supabase Storage',
        '3. Invalid or expired URL',
        '4. Network connectivity issue'
      ],
      fix: 'Go to Supabase Dashboard → Storage → make-2544f7d4-memory-files → Settings → Make PUBLIC'
    });
    
    setDidError(true)
  }

  const { src, alt, style, className, ...rest } = props

  // 🔍 ENHANCED DIAGNOSTICS: Log when image loads successfully
  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    console.log('✅ ImageWithFallback: Image loaded successfully:', {
      src: props.src,
      alt: props.alt,
      dimensions: `${img.naturalWidth}x${img.naturalHeight}`,
      size: img.currentSrc?.length || 'unknown'
    });
    
    // Call original onLoad if provided
    if (props.onLoad) {
      props.onLoad(e);
    }
  };

  return didError ? (
    <div
      className={`inline-block bg-red-50 text-center align-middle border-2 border-red-300 ${className ?? ''}`}
      style={style}
    >
      <div className="flex flex-col items-center justify-center w-full h-full p-4 gap-2">
        <img src={ERROR_IMG_SRC} alt="Error loading image" className="w-12 h-12 opacity-50" />
        <div className="text-xs text-red-600 text-center">
          <div>Image failed to load</div>
          <div className="text-[10px] mt-1">Check Supabase Storage permissions</div>
        </div>
      </div>
    </div>
  ) : (
    <img 
      src={src} 
      alt={alt} 
      className={className} 
      style={style} 
      {...rest} 
      onError={handleError}
      onLoad={handleLoad}
    />
  )
}
