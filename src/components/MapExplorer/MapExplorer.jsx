import React, { useEffect, useRef, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getStatusStyle } from '../../utils/statusColors.js';
import MapRailCard from '../MapRailCard/MapRailCard.jsx';
import MobileMapCard from '../MobileMapCard/MobileMapCard.jsx';
import MapPopupCard from '../MapPopupCard/MapPopupCard.jsx';
import { MapPin } from 'lucide-react';
import './MapExplorer.css';

// Component to smoothly sync map bounds or fly to active selection
function MapViewController({ mappedItems, selectedItem, defaultCenter, defaultZoom, isMobile }) {
  const map = useMap();
  const initialFitDone = useRef(false);
  const prevItemsSig = useRef('');

  const bottomPadding = isMobile ? 185 : 40;

  // Recenter or fit bounds when mapped items set changes significantly or on first load
  useEffect(() => {
    if (mappedItems.length === 0) {
      if (defaultCenter && defaultZoom) {
        map.setView(defaultCenter, defaultZoom);
      }
      return;
    }

    const itemsSig = mappedItems.map((it) => it.id).join(',');
    // If items changed or initial load, fit to all visible markers
    if (!initialFitDone.current || prevItemsSig.current !== itemsSig) {
      const bounds = L.latLngBounds(mappedItems.map((it) => [it.latitude, it.longitude]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          paddingTopLeft: [40, 40],
          paddingBottomRight: [40, bottomPadding],
          maxZoom: 14,
        });
      }
      initialFitDone.current = true;
      prevItemsSig.current = itemsSig;
    }
  }, [mappedItems, map, defaultCenter, defaultZoom, bottomPadding]);

  // When a specific place is selected, pan smoothly to it
  useEffect(() => {
    if (selectedItem && selectedItem.latitude !== null && selectedItem.longitude !== null) {
      map.flyTo([selectedItem.latitude, selectedItem.longitude], Math.max(map.getZoom(), 12), {
        duration: 0.6,
      });
    } else if (!selectedItem && initialFitDone.current && mappedItems.length > 0) {
      // Formats the map back to the current selection of mapped items
      const bounds = L.latLngBounds(mappedItems.map((it) => [it.latitude, it.longitude]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          paddingTopLeft: [40, 40],
          paddingBottomRight: [40, bottomPadding],
          maxZoom: 14,
        });
      }
    }
  }, [selectedItem, map, mappedItems, bottomPadding]);

  return null;
}

// Map event listener for background map clicks and popup close events
function MapEventsHandler({ onDeselect, isMobile }) {
  const map = useMap();

  useEffect(() => {
    const handleMapClick = (e) => {
      // If clicking map background (not marker)
      if (e.originalEvent && e.originalEvent._stopped) return;
      if (isMobile) return; // Keep selected place active while interacting on mobile
      onDeselect();
    };

    const handlePopupClose = () => {
      if (!isMobile) onDeselect();
    };

    map.on('click', handleMapClick);
    map.on('popupclose', handlePopupClose);

    return () => {
      map.off('click', handleMapClick);
      map.off('popupclose', handlePopupClose);
    };
  }, [map, onDeselect, isMobile]);

  return null;
}

// Create custom status-colored SVG markers with optional place label and favourite heart
function createCustomMarkerIcon(status, isSelected, showLabel, placeName, isFavourite) {
  const statusInfo = getStatusStyle(status);
  const color = statusInfo.dotBg || '#3b82f6';
  const size = isSelected ? 34 : 26;
  const strokeColor = '#ffffff';
  const strokeWidth = isSelected ? 2.5 : 2;

  // Escape HTML in place name
  const safeName = placeName ? placeName.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

  const labelHtml = showLabel && safeName ? `
    <span class="marker-text-label" title="${safeName}">${safeName}</span>
  ` : '';

  // If favourite, show small red heart icon badge on the pin
  const heartBadgeHtml = isFavourite ? `
    <span class="marker-fav-badge" aria-label="Favourite">
      <svg viewBox="0 0 24 24" width="${isSelected ? 13 : 10}" height="${isSelected ? 13 : 10}" fill="#ef4444" stroke="#ffffff" stroke-width="1.5">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    </span>
  ` : '';

  const pulseRingHtml = isSelected ? `
    <span class="marker-pulse-ring" style="border-color: ${color}; background-color: ${color}33;"></span>
  ` : '';

  const html = `
    <div class="custom-marker-wrapper ${isSelected ? 'is-selected' : ''}">
      <div class="custom-map-marker ${isSelected ? 'marker-selected' : ''}" style="width: ${size}px; height: ${size}px;">
        ${pulseRingHtml}
        <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" 
                fill="${color}" 
                stroke="${strokeColor}" 
                stroke-width="${strokeWidth}" 
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.35))" />
          <circle cx="12" cy="9" r="${isSelected ? 3.5 : 2.8}" fill="#ffffff" />
        </svg>
        ${heartBadgeHtml}
      </div>
      ${labelHtml}
    </div>
  `;

  return L.divIcon({
    className: 'leaflet-custom-div-icon',
    html: html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 4],
  });
}

export default function MapExplorer({
  items = [],
  selectedItem,
  onSelectItem,
  onToggleStatusFilter,
  onToggleLocationFilter,
  onToggleCategoryFilter,
  onSelectDetail,
  activeConfig,
  isMobile = false,
  showLabels: propShowLabels,
  onToggleShowLabels,
}) {
  const effectiveIsMobile = isMobile || (typeof window !== 'undefined' && window.innerWidth < 768);

  const [internalShowLabels, setInternalShowLabels] = useState(false);
  const showLabels = propShowLabels !== undefined ? propShowLabels : internalShowLabels;
  const setShowLabels = onToggleShowLabels || setInternalShowLabels;
  // On mobile, labels are always permanently on
  const effectiveShowLabels = effectiveIsMobile ? true : showLabels;

  // Filter only items that have valid latitude and longitude
  const mappedItems = useMemo(() => {
    return items.filter(
      (it) =>
        it.latitude !== null &&
        it.longitude !== null &&
        !isNaN(it.latitude) &&
        !isNaN(it.longitude)
    );
  }, [items]);

  // Center / Zoom based on active config or fallback
  const defaultCenter = useMemo(() => {
    if (activeConfig && activeConfig.mapCenter) {
      return activeConfig.mapCenter;
    }
    return [52.3555, -1.1743]; // UK center
  }, [activeConfig]);

  const defaultZoom = activeConfig && activeConfig.mapZoom ? activeConfig.mapZoom : 7;

  // Rail scroll ref to auto-scroll active card into view on desktop
  const railContainerRef = useRef(null);

  useEffect(() => {
    if (selectedItem && railContainerRef.current) {
      const activeEl = railContainerRef.current.querySelector('.map-rail-card.is-selected');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedItem]);

  // Keep refs to markers so clicking from rail can open its popup
  const markerRefs = useRef({});

  // Mobile carousel refs & state
  const carouselRef = useRef(null);
  const slideRefs = useRef({});
  const isProgrammaticScroll = useRef(false);
  const isUserInteracting = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const scrollDebounceRef = useRef(null);

  // Reset user interacting flag when selection is cleared
  useEffect(() => {
    if (!selectedItem) {
      isUserInteracting.current = false;
    }
  }, [selectedItem]);

  // When selectedItem changes from rail or elsewhere, open popup on desktop
  useEffect(() => {
    if (!effectiveIsMobile && selectedItem && markerRefs.current[selectedItem.id]) {
      const marker = markerRefs.current[selectedItem.id];
      if (marker && marker.openPopup) {
        marker.openPopup();
      }
    }
  }, [selectedItem, effectiveIsMobile]);

  // When selectedItem changes, center it in the mobile carousel
  useEffect(() => {
    if (!effectiveIsMobile || !selectedItem) return;
    const slideEl = slideRefs.current[selectedItem.id];
    const carouselEl = carouselRef.current;
    if (slideEl && carouselEl) {
      const slideRect = slideEl.getBoundingClientRect();
      const carouselRect = carouselEl.getBoundingClientRect();
      const diff = Math.abs((slideRect.left + slideRect.width / 2) - (carouselRect.left + carouselRect.width / 2));
      if (diff > 20) {
        isProgrammaticScroll.current = true;
        slideEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
          isProgrammaticScroll.current = false;
        }, 450);
      }
    }
  }, [selectedItem, effectiveIsMobile]);

  // When user actively swipes mobile carousel, detect centered card and select it
  const handleCarouselScroll = () => {
    if (isProgrammaticScroll.current || !isUserInteracting.current) return;
    if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
    scrollDebounceRef.current = setTimeout(() => {
      if (isProgrammaticScroll.current || !isUserInteracting.current || !carouselRef.current) return;
      const carouselEl = carouselRef.current;
      const carouselCenter = carouselEl.scrollLeft + carouselEl.clientWidth / 2;

      let closestItem = null;
      let minDistance = Infinity;

      mappedItems.forEach((item) => {
        const el = slideRefs.current[item.id];
        if (el) {
          const itemCenter = el.offsetLeft + el.offsetWidth / 2;
          const dist = Math.abs(carouselCenter - itemCenter);
          if (dist < minDistance) {
            minDistance = dist;
            closestItem = item;
          }
        }
      });

      if (closestItem && (!selectedItem || selectedItem.id !== closestItem.id)) {
        onSelectItem(closestItem);
      }
    }, 120);
  };

  return (
    <div className={`map-explorer-layout ${effectiveIsMobile ? 'is-mobile-map' : ''}`}>
      {/* 1. Main Map Container */}
      <div className="map-canvas-wrapper">
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          scrollWheelZoom={true}
          className="leaflet-map-element"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapViewController
            mappedItems={mappedItems}
            selectedItem={selectedItem}
            defaultCenter={defaultCenter}
            defaultZoom={defaultZoom}
            isMobile={effectiveIsMobile}
          />

          <MapEventsHandler onDeselect={() => onSelectItem(null)} isMobile={effectiveIsMobile} />

          {mappedItems.map((item) => {
            const isSelected = selectedItem && selectedItem.id === item.id;
            const icon = createCustomMarkerIcon(item.status, isSelected, effectiveShowLabels, item.place, item.favourite);

            return (
              <Marker
                key={item.id}
                position={[item.latitude, item.longitude]}
                icon={icon}
                ref={(ref) => {
                  if (ref) {
                    markerRefs.current[item.id] = ref;
                  } else {
                    delete markerRefs.current[item.id];
                  }
                }}
                eventHandlers={{
                  click: () => {
                    isUserInteracting.current = true;
                    onSelectItem(item);
                  },
                }}
              >
                {!effectiveIsMobile && (
                  <Popup closeButton={true} autoPan={true} offset={[0, -10]}>
                    <MapPopupCard
                      item={item}
                      onToggleStatusFilter={onToggleStatusFilter}
                      onToggleLocationFilter={onToggleLocationFilter}
                      onToggleCategoryFilter={onToggleCategoryFilter}
                      onSelectDetail={onSelectDetail}
                    />
                  </Popup>
                )}
              </Marker>
            );
          })}
        </MapContainer>

        {/* Empty Coordinates notification overlay if filtered items exist but have no coords */}
        {mappedItems.length === 0 && (
          <div className="map-no-coords-banner">
            <MapPin size={20} />
            <span>No mapped places match these filters (or items have no valid coordinates).</span>
          </div>
        )}

        {/* Mobile Swipeable Carousel of Mapped Places at Bottom */}
        {effectiveIsMobile && mappedItems.length > 0 && (
          <div className="mobile-map-carousel-wrapper" aria-label="Places carousel">
            <div
              className="mobile-map-carousel"
              ref={carouselRef}
              onScroll={handleCarouselScroll}
              onTouchStart={() => {
                isUserInteracting.current = true;
              }}
              onPointerDown={() => {
                isUserInteracting.current = true;
              }}
              onWheel={() => {
                isUserInteracting.current = true;
              }}
            >
              {mappedItems.map((item) => {
                const isSelected = selectedItem && selectedItem.id === item.id;
                return (
                  <div
                    key={item.id}
                    ref={(el) => {
                      if (el) slideRefs.current[item.id] = el;
                      else delete slideRefs.current[item.id];
                    }}
                    className={`mobile-map-carousel-slide ${isSelected ? 'is-active' : ''}`}
                    onClick={() => {
                      isUserInteracting.current = true;
                      onSelectItem(item);
                    }}
                  >
                    <MobileMapCard
                      item={item}
                      isCarousel={true}
                      onToggleStatusFilter={onToggleStatusFilter}
                      onToggleLocationFilter={onToggleLocationFilter}
                      onToggleCategoryFilter={onToggleCategoryFilter}
                      onSelectDetail={onSelectDetail}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. Desktop Right-hand Compact Results Rail (hidden on mobile via CSS) */}
      <aside className="map-results-rail" aria-label="Mapped places list">
        <div className="map-rail-header">
          <div className="map-rail-title-group">
            <h3 className="map-rail-title">Mapped Places</h3>
            <span className="map-rail-badge">{mappedItems.length}</span>
          </div>

          {/* Show Label Checkbox */}
          <label className="map-label-toggle" title="Show or hide place names beside pins on the map">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              className="map-label-checkbox"
            />
            <span>Show Label</span>
          </label>
        </div>

        <div className="map-rail-scroll" ref={railContainerRef}>
          {mappedItems.length === 0 ? (
            <div className="map-rail-empty">
              <p>No mapped places found.</p>
            </div>
          ) : (
            mappedItems.map((item) => (
              <MapRailCard
                key={item.id}
                item={item}
                isSelected={selectedItem && selectedItem.id === item.id}
                onSelect={() => onSelectItem(item)}
                onToggleStatusFilter={onToggleStatusFilter}
                onToggleLocationFilter={onToggleLocationFilter}
                onToggleCategoryFilter={onToggleCategoryFilter}
                onSelectDetail={onSelectDetail}
              />
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
