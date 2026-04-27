"use client";

import { useState, useRef, useEffect, MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageCropperProps {
  imageUrl: string;
  onCropComplete: (croppedImageUrl: string) => void;
  onCancel: () => void;
}

export default function ImageCropper({ imageUrl, onCropComplete, onCancel }: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 200, height: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      // Set initial crop to center
      const initialSize = Math.min(img.width, img.height, 400);
      setCrop({
        x: (img.width - initialSize) / 2,
        y: (img.height - initialSize) / 2,
        width: initialSize,
        height: initialSize
      });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Draw canvas
  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to fit container
    const containerWidth = 600;
    const containerHeight = 400;
    canvas.width = containerWidth;
    canvas.height = containerHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate scale to fit image
    const scaleX = containerWidth / image.width;
    const scaleY = containerHeight / image.height;
    const displayScale = Math.min(scaleX, scaleY, 1) * scale;

    const displayWidth = image.width * displayScale;
    const displayHeight = image.height * displayScale;
    const offsetX = (containerWidth - displayWidth) / 2;
    const offsetY = (containerHeight - displayHeight) / 2;

    // Draw image
    ctx.save();
    ctx.translate(offsetX + displayWidth / 2, offsetY + displayHeight / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(image, -displayWidth / 2, -displayHeight / 2, displayWidth, displayHeight);
    ctx.restore();

    // Draw crop area
    const cropX = offsetX + (crop.x * displayScale);
    const cropY = offsetY + (crop.y * displayScale);
    const cropWidth = crop.width * displayScale;
    const cropHeight = crop.height * displayScale;

    // Darken outside crop area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, cropY);
    ctx.fillRect(0, cropY, cropX, cropHeight);
    ctx.fillRect(cropX + cropWidth, cropY, canvas.width - (cropX + cropWidth), cropHeight);
    ctx.fillRect(0, cropY + cropHeight, canvas.width, canvas.height - (cropY + cropHeight));

    // Draw crop box
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropX, cropY, cropWidth, cropHeight);

    // Draw resize handles
    const handleSize = 10;
    ctx.fillStyle = '#0ea5e9';
    // Corners
    ctx.fillRect(cropX - handleSize / 2, cropY - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(cropX + cropWidth - handleSize / 2, cropY - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(cropX - handleSize / 2, cropY + cropHeight - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(cropX + cropWidth - handleSize / 2, cropY + cropHeight - handleSize / 2, handleSize, handleSize);
    // Edges
    ctx.fillRect(cropX + cropWidth / 2 - handleSize / 2, cropY - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(cropX + cropWidth / 2 - handleSize / 2, cropY + cropHeight - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(cropX - handleSize / 2, cropY + cropHeight / 2 - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(cropX + cropWidth - handleSize / 2, cropY + cropHeight / 2 - handleSize / 2, handleSize, handleSize);

  }, [image, crop, scale, rotation]);

  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !image) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const containerWidth = 600;
    const containerHeight = 400;
    const scaleX = containerWidth / image.width;
    const scaleY = containerHeight / image.height;
    const displayScale = Math.min(scaleX, scaleY, 1) * scale;
    const displayWidth = image.width * displayScale;
    const displayHeight = image.height * displayScale;
    const offsetX = (containerWidth - displayWidth) / 2;
    const offsetY = (containerHeight - displayHeight) / 2;

    const cropX = offsetX + (crop.x * displayScale);
    const cropY = offsetY + (crop.y * displayScale);
    const cropWidth = crop.width * displayScale;
    const cropHeight = crop.height * displayScale;

    const handleSize = 10;

    // Check if clicking on resize handles
    const handles = {
      'nw': { x: cropX, y: cropY },
      'ne': { x: cropX + cropWidth, y: cropY },
      'sw': { x: cropX, y: cropY + cropHeight },
      'se': { x: cropX + cropWidth, y: cropY + cropHeight },
      'n': { x: cropX + cropWidth / 2, y: cropY },
      's': { x: cropX + cropWidth / 2, y: cropY + cropHeight },
      'w': { x: cropX, y: cropY + cropHeight / 2 },
      'e': { x: cropX + cropWidth, y: cropY + cropHeight / 2 }
    };

    for (const [dir, handle] of Object.entries(handles)) {
      if (Math.abs(x - handle.x) < handleSize && Math.abs(y - handle.y) < handleSize) {
        setIsResizing(dir);
        setDragStart({ x, y });
        return;
      }
    }

    // Check if clicking inside crop area
    if (x >= cropX && x <= cropX + cropWidth && y >= cropY && y <= cropY + cropHeight) {
      setIsDragging(true);
      setDragStart({ x: x - cropX, y: y - cropY });
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !image || (!isDragging && !isResizing)) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const containerWidth = 600;
    const containerHeight = 400;
    const scaleX = containerWidth / image.width;
    const scaleY = containerHeight / image.height;
    const displayScale = Math.min(scaleX, scaleY, 1) * scale;

    if (isDragging) {
      const newX = (x - dragStart.x - (containerWidth - image.width * displayScale) / 2) / displayScale;
      const newY = (y - dragStart.y - (containerHeight - image.height * displayScale) / 2) / displayScale;

      setCrop(prev => ({
        ...prev,
        x: Math.max(0, Math.min(newX, image.width - prev.width)),
        y: Math.max(0, Math.min(newY, image.height - prev.height))
      }));
    } else if (isResizing) {
      const dx = (x - dragStart.x) / displayScale;
      const dy = (y - dragStart.y) / displayScale;

      setCrop(prev => {
        const newCrop = { ...prev };

        if (isResizing.includes('n')) {
          newCrop.y = Math.max(0, prev.y + dy);
          newCrop.height = Math.max(50, prev.height - dy);
        }
        if (isResizing.includes('s')) {
          newCrop.height = Math.max(50, Math.min(image.height - prev.y, prev.height + dy));
        }
        if (isResizing.includes('w')) {
          newCrop.x = Math.max(0, prev.x + dx);
          newCrop.width = Math.max(50, prev.width - dx);
        }
        if (isResizing.includes('e')) {
          newCrop.width = Math.max(50, Math.min(image.width - prev.x, prev.width + dx));
        }

        return newCrop;
      });

      setDragStart({ x, y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(null);
  };

  // Touch event handlers for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !image || e.touches.length === 0) return;
    e.preventDefault();

    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const containerWidth = 600;
    const containerHeight = 400;
    const scaleX = containerWidth / image.width;
    const scaleY = containerHeight / image.height;
    const displayScale = Math.min(scaleX, scaleY, 1) * scale;
    const displayWidth = image.width * displayScale;
    const displayHeight = image.height * displayScale;
    const offsetX = (containerWidth - displayWidth) / 2;
    const offsetY = (containerHeight - displayHeight) / 2;

    const cropX = offsetX + (crop.x * displayScale);
    const cropY = offsetY + (crop.y * displayScale);
    const cropWidth = crop.width * displayScale;
    const cropHeight = crop.height * displayScale;

    const handleSize = 15; // Larger for touch

    // Check resize handles
    const handles = {
      'nw': { x: cropX, y: cropY },
      'ne': { x: cropX + cropWidth, y: cropY },
      'sw': { x: cropX, y: cropY + cropHeight },
      'se': { x: cropX + cropWidth, y: cropY + cropHeight },
      'n': { x: cropX + cropWidth / 2, y: cropY },
      's': { x: cropX + cropWidth / 2, y: cropY + cropHeight },
      'w': { x: cropX, y: cropY + cropHeight / 2 },
      'e': { x: cropX + cropWidth, y: cropY + cropHeight / 2 }
    };

    for (const [dir, handle] of Object.entries(handles)) {
      if (Math.abs(x - handle.x) < handleSize && Math.abs(y - handle.y) < handleSize) {
        setIsResizing(dir);
        setDragStart({ x, y });
        return;
      }
    }

    // Check crop area
    if (x >= cropX && x <= cropX + cropWidth && y >= cropY && y <= cropY + cropHeight) {
      setIsDragging(true);
      setDragStart({ x: x - cropX, y: y - cropY });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !image || (!isDragging && !isResizing) || e.touches.length === 0) return;
    e.preventDefault();

    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const containerWidth = 600;
    const containerHeight = 400;
    const scaleX = containerWidth / image.width;
    const scaleY = containerHeight / image.height;
    const displayScale = Math.min(scaleX, scaleY, 1) * scale;

    if (isDragging) {
      const newX = (x - dragStart.x - (containerWidth - image.width * displayScale) / 2) / displayScale;
      const newY = (y - dragStart.y - (containerHeight - image.height * displayScale) / 2) / displayScale;

      setCrop(prev => ({
        ...prev,
        x: Math.max(0, Math.min(newX, image.width - prev.width)),
        y: Math.max(0, Math.min(newY, image.height - prev.height))
      }));
    } else if (isResizing) {
      const dx = (x - dragStart.x) / displayScale;
      const dy = (y - dragStart.y) / displayScale;

      setCrop(prev => {
        const newCrop = { ...prev };

        if (isResizing.includes('n')) {
          newCrop.y = Math.max(0, prev.y + dy);
          newCrop.height = Math.max(50, prev.height - dy);
        }
        if (isResizing.includes('s')) {
          newCrop.height = Math.max(50, Math.min(image.height - prev.y, prev.height + dy));
        }
        if (isResizing.includes('w')) {
          newCrop.x = Math.max(0, prev.x + dx);
          newCrop.width = Math.max(50, prev.width - dx);
        }
        if (isResizing.includes('e')) {
          newCrop.width = Math.max(50, Math.min(image.width - prev.x, prev.width + dx));
        }

        return newCrop;
      });

      setDragStart({ x, y });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setIsResizing(null);
  };

  const handleCrop = () => {
    if (!image) return;

    const canvas = document.createElement('canvas');
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Apply rotation if needed
    if (rotation !== 0) {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      tempCanvas.width = image.width;
      tempCanvas.height = image.height;
      tempCtx.translate(image.width / 2, image.height / 2);
      tempCtx.rotate((rotation * Math.PI) / 180);
      tempCtx.drawImage(image, -image.width / 2, -image.height / 2);

      ctx.drawImage(tempCanvas, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
    } else {
      ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        onCropComplete(url);
      }
    }, 'image/png');
  };

  if (typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4" style={{ touchAction: 'none' }}>
      <div className="bg-white rounded-3xl border-4 border-black p-6 max-w-4xl w-full relative shadow-[8px_8px_0px_rgba(0,0,0,1)]">
        <h2 className="text-2xl font-extrabold text-black mb-4">Crop Image</h2>
        
        <div className="bg-gray-100 rounded-xl overflow-hidden mb-4">
          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="cursor-move max-w-full h-auto touch-none"
            style={{ display: 'block', margin: '0 auto', touchAction: 'none' }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
              className="p-2 bg-[#93C5FD] border-2 border-black text-black rounded-lg hover:-translate-y-1 transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none"
              title="Zoom Out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={() => setScale(s => Math.min(2, s + 0.1))}
              className="p-2 bg-[#93C5FD] border-2 border-black text-black rounded-lg hover:-translate-y-1 transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none"
              title="Zoom In"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={() => setRotation(r => (r + 90) % 360)}
              className="p-2 bg-[#93C5FD] border-2 border-black text-black rounded-lg hover:-translate-y-1 transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none"
              title="Rotate"
            >
              <RotateCw className="w-5 h-5" />
            </button>
          </div>
          
          <div className="text-xs md:text-sm font-bold text-black text-center md:text-left">
            Drag to move • Drag handles to resize • Zoom: {Math.round(scale * 100)}%
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-400 border-2 border-black text-black rounded-xl 
                      hover:-translate-y-1 transition-all font-bold shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none"
          >
            <X className="w-5 h-5" />
            Cancel
          </button>
          <button
            onClick={handleCrop}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#93C5FD] border-2 border-black text-black rounded-xl 
                      hover:-translate-y-1 transition-all font-bold shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none"
          >
            <Check className="w-5 h-5" />
            Apply Crop
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
