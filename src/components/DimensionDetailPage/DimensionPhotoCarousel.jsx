import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './DimensionPhotoCarousel.css';

export default function DimensionPhotoCarousel({ images = [], onOpenPlace }) {
  const scrollRef = useRef(null);

  if (!images || images.length === 0) {
    return null;
  }

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 360;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="dimension-photo-carousel-container">
      <div className="dimension-photo-carousel-header">
        <h3 className="carousel-title">Images from the Journey</h3>
        <div className="carousel-controls">
          <button
            type="button"
            className="carousel-btn"
            onClick={() => handleScroll('left')}
            aria-label="Previous photos"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="carousel-btn"
            onClick={() => handleScroll('right')}
            aria-label="Next photos"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="dimension-photo-strip" ref={scrollRef}>
        {images.map((item, idx) => (
          <div
            key={`${item.url}-${idx}`}
            className={`photo-card ${item.place ? 'clickable' : ''}`}
            onClick={() => {
              if (item.place && onOpenPlace) {
                onOpenPlace(item.place);
              }
            }}
            title={item.title || item.placeName || 'Journey image'}
          >
            <img
              src={item.url}
              alt={item.title || item.placeName || 'Journey image'}
              className="carousel-img"
              loading="lazy"
            />
            {item.placeName && (
              <div className="photo-caption">
                <span className="caption-text">{item.placeName}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
