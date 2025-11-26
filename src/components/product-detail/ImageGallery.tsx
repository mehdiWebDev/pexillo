// src/components/product-detail/ImageGallery.tsx
'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Thumbs, FreeMode } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/thumbs';
import 'swiper/css/free-mode';

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
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const mainSwiperRef = useRef<SwiperType | null>(null);

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
      <div className="flex flex-col gap-4">
        {/* Main Swiper */}
        <div className="relative">
          <Swiper
            onSwiper={(swiper) => (mainSwiperRef.current = swiper)}
            modules={[Navigation, Thumbs]}
            thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
            spaceBetween={10}
            navigation={{
              prevEl: '.swiper-button-prev-custom',
              nextEl: '.swiper-button-next-custom',
            }}
            className="h-[500px] bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 product-main-swiper"
          >
            {images.map((image, index) => (
              <SwiperSlide key={index}>
                <div
                  className="relative w-full h-full group cursor-pointer"
                  onClick={() => openLightbox(index)}
                >
                  <Image
                    src={image.image_url}
                    alt={image.alt_text || productName}
                    fill
                    className="object-contain"
                    priority={index === 0}
                  />

                  {/* Badge - only on first slide */}
                  {badge && index === 0 && (
                    <div className="absolute top-4 left-4 z-10">
                      <span className="bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded transform -rotate-1">
                        {badge}
                      </span>
                    </div>
                  )}

                  {/* Zoom hint on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center z-10">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-3 py-2 rounded-lg flex items-center gap-2">
                      <ZoomIn size={16} />
                      <span className="text-sm font-bold">Click to zoom</span>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}

            {/* Custom Navigation Buttons */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="swiper-button-prev-custom absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
                  aria-label="Previous image"
                  onClick={(e) => e.preventDefault()}
                >
                  <ChevronLeft size={24} className="text-gray-900" />
                </button>
                <button
                  type="button"
                  className="swiper-button-next-custom absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
                  aria-label="Next image"
                  onClick={(e) => e.preventDefault()}
                >
                  <ChevronRight size={24} className="text-gray-900" />
                </button>
              </>
            )}
          </Swiper>
        </div>

        {/* Thumbnail Swiper */}
        {images.length > 1 && (
          <Swiper
            onSwiper={setThumbsSwiper}
            modules={[FreeMode, Thumbs]}
            spaceBetween={12}
            slidesPerView="auto"
            freeMode={true}
            watchSlidesProgress={true}
            className="product-thumbs-swiper w-full"
          >
            {images.map((image, index) => (
              <SwiperSlide
                key={index}
                className="!w-auto cursor-pointer"
              >
                <div className="h-[90px] w-[90px] bg-gray-100 rounded-xl overflow-hidden border-2 transition-all hover:border-gray-400">
                  <Image
                    src={image.image_url}
                    alt={image.alt_text || `${productName} view ${index + 1}`}
                    width={90}
                    height={90}
                    className="w-full h-full object-cover"
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </div>

      <style jsx global>{`
        .product-main-swiper:hover .swiper-button-prev-custom,
        .product-main-swiper:hover .swiper-button-next-custom {
          opacity: 1;
        }

        .product-thumbs-swiper .swiper-slide-thumb-active > div {
          border-color: #111827 !important;
        }

        .swiper-button-prev-custom,
        .swiper-button-next-custom {
          pointer-events: auto !important;
        }

        .swiper-button-prev-custom:active,
        .swiper-button-next-custom:active {
          transform: translateY(-50%) !important;
        }
      `}</style>

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
            <Image
              src={images[lightboxIndex]?.image_url}
              alt={images[lightboxIndex]?.alt_text || productName}
              width={1200}
              height={1200}
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
