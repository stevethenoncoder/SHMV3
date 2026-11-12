import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Globe as GlobeIcon, MapPin } from 'lucide-react';
import { createPlacesGlobe } from '../../../places/placesGlobe.module.js';
import geo from '../../../journey/film-geo.json';

export default function IndividualGlobeSection({ globeCityPoints = [], personName = '' }) {
  const containerRef = useRef(null);
  const globeInstanceRef = useRef(null);
  const [selectedCity, setSelectedCity] = useState(null);

  // Initialize Places Globe
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    try {
      const globe = createPlacesGlobe(container, {
        THREE,
        geo,
        onSelect: (pt) => {
          setSelectedCity(pt);
        },
      });
      globeInstanceRef.current = globe;
    } catch (err) {
      console.warn('Could not initialize PlacesGlobe in Individual view:', err);
    }

    return () => {
      if (globeInstanceRef.current) {
        try {
          globeInstanceRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying globe:', e);
        }
        globeInstanceRef.current = null;
      }
    };
  }, []);

  // Update points when globeCityPoints change
  useEffect(() => {
    if (globeInstanceRef.current && globeCityPoints.length > 0) {
      globeInstanceRef.current.update(globeCityPoints);
    }
  }, [globeCityPoints]);

  if (globeCityPoints.length === 0) return null;

  return (
    <div className="people-card">
      <div className="people-card-header">
        <div className="people-card-title-group">
          <h3 className="people-card-title">
            <GlobeIcon size={18} />
            Dining Geography & Places Globe
          </h3>
        </div>
      </div>

      <div className="individual-globe-layout">
        {/* 3D WebGL Globe Canvas */}
        <div className="individual-globe-canvas-wrap" ref={containerRef} />

        {/* City Breakdown List */}
        <div className="individual-city-list">
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Cities Visited Together ({globeCityPoints.length})
          </h4>

          {globeCityPoints
            .sort((a, b) => b.n - a.n)
            .map((city) => (
              <div
                key={city.id}
                className="city-stat-card"
                onClick={() => {
                  setSelectedCity(city);
                  if (globeInstanceRef.current) {
                    globeInstanceRef.current.highlight(city.id);
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={14} style={{ color: 'var(--brand-green)' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{city.name}</span>
                </div>
                <span className="group-meals-badge">
                  {city.n.toLocaleString()} {city.n === 1 ? 'meal' : 'meals'}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
