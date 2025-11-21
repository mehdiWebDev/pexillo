// src/components/product-detail/ImageGallery.tsx
'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn, Check } from 'lucide-react';
import { Badge } from '@/src/components/ui/badge';

interface ProductImage {
  id?: string;
  image_url: string;
  alt_text: string;
  is_primary?: boolean;
  view_type?: 'front' | 'back' | 'side' | 'detail';
}

interface ImageGalleryProps {
  images: ProductImage[];
  productName: string;
  badge?: 'NEW' | 'HOT' | 'SALE' | 'LIMITED' | null;
}

export default function ImageGallery({ images, productName, badge }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
  };

  const lightboxNext = () => {
    setLightboxIndex((prev) => (prev + 1) % images.length);
  };

  const lightboxPrevious = () => {
    setLightboxIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Handle keyboard navigation in lightbox
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isLightboxOpen) return;
    if (e.key === 'ArrowLeft') lightboxPrevious();
    if (e.key === 'ArrowRight') lightboxNext();
    if (e.key === 'Escape') closeLightbox();
  };

  return (
    <>
      <div className="image-gallery">
        {/* Main Image */}
        <div className="image-gallery__main">
          <div
            className="image-gallery__main-container"
            onClick={() => openLightbox(currentIndex)}
            role="button"
            tabIndex={0}
            aria-label="Click to zoom"
          >
            <img
              src={images[currentIndex]?.image_url}
              alt={images[currentIndex]?.alt_text || productName}
              className="image-gallery__main-image"
            />

            {/* Badge */}
            {badge && (
              <div className="image-gallery__badge">
                <Badge variant={badge === 'SALE' ? 'destructive' : 'default'}>
                  {badge}
                </Badge>
              </div>
            )}

            {/* Zoom Icon */}
            <div className="image-gallery__zoom-hint">
              <ZoomIn size={20} />
              <span>Click to zoom</span>
            </div>

            {/* Image Counter */}
            <div className="image-gallery__counter">
              {currentIndex + 1} / {images.length}
            </div>

            {/* Navigation Arrows (only if multiple images) */}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrevious();
                  }}
                  className="image-gallery__nav image-gallery__nav--prev"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNext();
                  }}
                  className="image-gallery__nav image-gallery__nav--next"
                  aria-label="Next image"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="image-gallery__thumbnails">
            <div className="image-gallery__thumbnails-track">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`image-gallery__thumbnail ${
                    index === currentIndex ? 'image-gallery__thumbnail--active' : ''
                  }`}
                  aria-label={`View image ${index + 1}`}
                >
                  <img
                    src={image.image_url}
                    alt={image.alt_text || `${productName} view ${index + 1}`}
                  />
                  {index === currentIndex && (
                    <div className="image-gallery__thumbnail-check">
                      <Check size={16} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="image-gallery__lightbox"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
        >
          <div className="image-gallery__lightbox-content" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              onClick={closeLightbox}
              className="image-gallery__lightbox-close"
              aria-label="Close lightbox"
            >
              <X size={24} />
            </button>

            {/* Lightbox Image */}
            <img
              src={images[lightboxIndex]?.image_url}
              alt={images[lightboxIndex]?.alt_text || productName}
              className="image-gallery__lightbox-image"
            />

            {/* Lightbox Navigation */}
            {images.length > 1 && (
              <>
                <button
                  onClick={lightboxPrevious}
                  className="image-gallery__lightbox-nav image-gallery__lightbox-nav--prev"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={32} />
                </button>
                <button
                  onClick={lightboxNext}
                  className="image-gallery__lightbox-nav image-gallery__lightbox-nav--next"
                  aria-label="Next image"
                >
                  <ChevronRight size={32} />
                </button>
              </>
            )}

            {/* Lightbox Counter */}
            <div className="image-gallery__lightbox-counter">
              {lightboxIndex + 1} / {images.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
