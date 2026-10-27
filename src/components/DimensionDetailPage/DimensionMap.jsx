import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getStatusStyle } from '../../utils/statusColors.js';
import { formatDate } from '../../utils/formatUtils.js';
import { Star, MapPin } from 'lucide-react';
import './DimensionMap.css';

// Fix Leaflet default marker icons if missing
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createDimensionMarkerIcon(status, showLabel, placeName, isFavourite) {
  const statusStyle = getStatusStyle(status);
  const color = statusStyle.dotBg || '#10b981';
  const size = 26;
  const strokeColor = '#ffffff';
  const strokeWidth = 2;

  // Escape HTML in place name
  const safeName = placeName ? placeName.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

  const labelHtml = showLabel && safeName ? `
    <span class="marker-text-label" title="${safeName}">${safeName}</span>
  ` : '';

  const heartBadgeHtml = isFavourite ? `
    <span class="marker-fav-badge" aria-label="Favourite">
      <svg viewBox="0 0 24 24" width="10" height="10" fill="#ef4444" stroke="#ffffff" stroke-width="1.5">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    </span>
  ` : '';

  const svgHtml = `
    <div class="custom-marker-wrapper">
      <div class="custom-map-marker" style="width: ${size}px; height: ${size}px;">
        <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" 
                fill="${color}" 
                stroke="${strokeColor}" 
                stroke-width="${strokeWidth}" 
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.35))" />
          <circle cx="12" cy="9" r="2.8" fill="#ffffff" />
        </svg>
        ${heartBadgeHtml}
      </div>
      ${labelHtml}
    </div>
  `;

  return L.divIcon({
    className: 'leaflet-custom-div-icon',
    html: svgHtml,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 4],
  });
}

// Component to smoothly sync map bounds to encompass all valid places
function MapBoundsController({ places }) {
  const map = useMap();

  React.useEffect(() => {
    if (!places || places.length === 0) return;

    if (places.length === 1) {
      map.setView([places[0].latitude, places[0].longitude], 12);
      return;
    }

    const bounds = L.latLngBounds(places.map((p) => [p.latitude, p.longitude]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [places, map]);

  return null;
}

export default function DimensionMap({ places = [], onOpenPlace }) {
  const [showLabels, setShowLabels] = useState(true);

  // Only map places with valid numeric coordinates
  const validPlaces = useMemo(() => {
    return places.filter(
      (p) =>
        p.latitude !== null &&
        p.latitude !== undefined &&
        p.longitude !== null &&
        p.longitude !== undefined &&
        !isNaN(p.latitude) &&
        !isNaN(p.longitude)
    );
  }, [places]);

  if (validPlaces.length === 0) {
    return (
      <div className="dimension-map-empty">
        <MapPin size={24} className="dimension-map-empty-icon" />
        <p>No map coordinates available for these places yet.</p>
      </div>
    );
  }

  // Initial center calculation
  const centerLat =
    validPlaces.reduce((sum, p) => sum + p.latitude, 0) / validPlaces.length;
  const centerLng =
    validPlaces.reduce((sum, p) => sum + p.longitude, 0) / validPlaces.length;

  return (
    <div className="dimension-map-wrapper">
      <div className="dimension-map-floating-controls" title="Toggle place names on map pins">
        <label className="dimension-map-label-toggle">
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
            className="dimension-map-label-checkbox"
          />
          <span>Show labels</span>
        </label>
      </div>
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={validPlaces.length === 1 ? 12 : 8}
        scrollWheelZoom={false}
        className="dimension-map-container"
      >
        <MapBoundsController places={validPlaces} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validPlaces.map((place, idx) => {
          const icon = createDimensionMarkerIcon(place.status, showLabels, place.place, place.favourite);
          const statusStyle = getStatusStyle(place.status);

          return (
            <Marker
              key={place.id || `${place.place}-${idx}`}
              position={[place.latitude, place.longitude]}
              icon={icon}
            >
              <Popup className="dimension-map-popup">
                <div className="dim-popup-content">
                  {place.featurePhoto && (
                    <img
                      src={place.featurePhoto}
                      alt={place.place}
                      className="dim-popup-img"
                      loading="lazy"
                    />
                  )}
                  <h4 className="dim-popup-title">{place.place}</h4>
                  <div className="dim-popup-meta">
                    <span
                      className="dim-popup-status"
                      style={{
                        backgroundColor: statusStyle.badgeBg,
                        color: statusStyle.badgeText,
                        borderColor: statusStyle.badgeBorder,
                      }}
                    >
                      {place.status || 'Not planned'}
                    </span>
                    {place.rating ? (
                      <span className="dim-popup-rating">
                        <Star size={13} fill="#f59e0b" color="#f59e0b" />
                        {place.rating.toFixed(1)}
                      </span>
                    ) : null}
                  </div>
                  {place.date && (
                    <span className="dim-popup-date">{formatDate(place.date)}</span>
                  )}
                  {onOpenPlace && (
                    <button
                      type="button"
                      className="dim-popup-link-btn"
                      onClick={() => onOpenPlace(place)}
                    >
                      View place details &rarr;
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
