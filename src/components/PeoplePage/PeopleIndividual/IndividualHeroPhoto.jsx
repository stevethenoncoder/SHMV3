import React, { useState, useEffect, useRef } from 'react';
import { Camera, ChevronLeft, ChevronRight, Utensils } from 'lucide-react';

export default function IndividualHeroPhoto({ heroPhotos = [], personName = '' }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  const totalPhotos = heroPhotos.length;

  useEffect(() => {
    setCurrentIndex(0);
  }, [personName]);

  useEffect(() => {
    if (totalPhotos <= 1 || isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalPhotos);
    }, 8000); // Gentle 8s interval

    return () => clearInterval(timerRef.current);
  }, [totalPhotos, isPaused]);

  if (totalPhotos === 0) {
    return (
      <div className="individual-hero-photo-wrap" style={{ minHeight: '220px', background: 'var(--bg-subtle)' }}>
        <div className="hero-photo-fallback">
          <Utensils size={36} style={{ color: 'var(--text-muted)' }} />
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>No meal photographs on file</strong>
            <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
              Photographs from meals with {personName} will appear here when added to the archive.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activePhoto = heroPhotos[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + totalPhotos) % totalPhotos);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % totalPhotos);
  };

  return (
    <div
      className="individual-hero-photo-wrap"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <img
        src={activePhoto.url}
        alt={`Meal at ${activePhoto.restaurantName}`}
        className="hero-meal-image"
      />

      {/* Floating Caption & Overlay */}
      <div className="hero-photo-overlay">
        <div>
          <div className="hero-photo-caption">
            {activePhoto.caption || activePhoto.restaurantName}
          </div>
          <div className="hero-photo-sub">
            Meal at {activePhoto.restaurantName} • {activePhoto.date}
            {activePhoto.rating && activePhoto.rating !== 'Unrated' ? ` • ${activePhoto.rating}` : ''}
            <span style={{ marginLeft: '8px', opacity: 0.75, fontSize: '0.72rem' }}>
              (Food & venue photography)
            </span>
          </div>
        </div>

        {totalPhotos > 1 && (
          <div className="hero-photo-controls">
            <button
              type="button"
              className="hero-btn"
              onClick={handlePrev}
              title="Previous photo"
              aria-label="Previous photo"
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
              {currentIndex + 1} / {totalPhotos}
            </span>
            <button
              type="button"
              className="hero-btn"
              onClick={handleNext}
              title="Next photo"
              aria-label="Next photo"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
