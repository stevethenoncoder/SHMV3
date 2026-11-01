import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import Supercluster from 'supercluster';
import 'leaflet/dist/leaflet.css';
import { Star, MapPin, Utensils, Calendar, ArrowRight, Compass, Layers } from 'lucide-react';
import { formatRatingLabel } from '../../utils/mealsFilter.js';
import './RestaurantsMap.css';

/**
 * Returns marker fill color matching canonical rating conventions.
 */
function getMarkerColor(ratingText) {
  const r = (ratingText || '').toLowerCase();
  if (r.includes('the dogs') || r.includes('exceptional')) return '#f59e0b'; // Amber / Gold
  if (r.includes('very good') || r.includes('superb')) return '#10b981'; // Emerald Green
  if (r.includes('fine') || r.includes('good')) return '#3b82f6'; // Royal Blue
  if (r.includes('ok')) return '#64748b'; // Slate Gray
  if (r.includes('bad') || r.includes('never again') || r.includes('worst')) return '#ef4444'; // Crimson
  return '#3b82f6'; // Default Royal Blue
}

/**
 * Style for the compact popup rating pill.
 */
function getRatingPillStyle(ratingText) {
  const r = (ratingText || '').toLowerCase();
  if (r.includes('the dogs') || r.includes('exceptional')) {
    return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
  }
  if (r.includes('very good') || r.includes('superb')) {
    return { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' };
  }
  if (r.includes('fine') || r.includes('good')) {
    return { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' };
  }
  if (r.includes('ok')) {
    return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
  }
  if (r.includes('bad') || r.includes('never again') || r.includes('worst')) {
    return { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' };
  }
  return { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' };
}

/**
 * Formats first and latest visit dates cleanly.
 */
function formatVisitDates(restaurant) {
  const first = restaurant.firstVisit?.formattedDate;
  const latest = restaurant.latestVisit?.formattedDate;
  if (!first && !latest) return null;
  if (!latest || first === latest) return first || latest;
  return `${first} – ${latest}`;
}

/**
 * Cache for cluster icons to prevent recreating L.divIcon instances on every render.
 */
const clusterIconCache = new Map();

function getClusterIcon(count) {
  if (clusterIconCache.has(count)) {
    return clusterIconCache.get(count);
  }

  let sizeClass = 'cluster-sm';
  let size = 36;
  if (count >= 100) {
    sizeClass = 'cluster-xl';
    size = 54;
  } else if (count >= 50) {
    sizeClass = 'cluster-lg';
    size = 48;
  } else if (count >= 10) {
    sizeClass = 'cluster-md';
    size = 42;
  }

  const icon = L.divIcon({
    html: `
      <div class="restaurants-cluster-bubble ${sizeClass}" title="Cluster of ${count} restaurants — click to zoom in">
        <span class="cluster-count">${count}</span>
      </div>
    `,
    className: 'restaurants-cluster-div-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

  clusterIconCache.set(count, icon);
  return icon;
}

/**
 * Cache for restaurant teardrop pin icons.
 */
const pinIconCache = new Map();

function createRestaurantPinIcon(restaurant, isSelected, multiInfo) {
  const color = getMarkerColor(restaurant.averageRatingText);
  const isMulti = multiInfo && multiInfo.total > 1;
  const cacheKey = `${color}:${isSelected}:${isMulti ? `${multiInfo.index}_${multiInfo.total}` : 'single'}`;

  if (pinIconCache.has(cacheKey)) {
    return pinIconCache.get(cacheKey);
  }

  const badgeHtml = isMulti
    ? `<span class="pin-multi-indicator" title="Restaurant ${multiInfo.index + 1} of ${multiInfo.total} at this address">${multiInfo.index + 1}/${multiInfo.total}</span>`
    : '';

  const strokeColor = isSelected ? '#0f172a' : '#ffffff';
  const strokeWidth = isSelected ? '3.2' : '2.5';
  const scaleClass = isSelected ? 'is-selected' : '';

  const html = `
    <div class="restaurant-map-pin-wrap ${scaleClass}" title="${restaurant.name}">
      <svg class="restaurant-pin-svg" width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 38C16 38 28 26.5 28 16C28 9.37258 22.6274 4 16 4C9.37258 4 4 9.37258 4 16C4 26.5 16 38 16 38Z"
              fill="${color}"
              stroke="${strokeColor}"
              stroke-width="${strokeWidth}"
              stroke-linejoin="round"/>
        <g transform="translate(9, 9) scale(0.6)" stroke="#ffffff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/>
          <path d="M6 2v5a2 2 0 0 0 2 2 2 2 0 0 0 2-2V2"/>
          <path d="M8 9v13"/>
          <path d="M15 11v9"/>
        </g>
      </svg>
      ${badgeHtml}
    </div>
  `;

  const icon = L.divIcon({
    html,
    className: 'restaurant-pin-div-icon',
    iconSize: [32, 40],
    iconAnchor: [16, 38], // Pin tip points directly to ground coordinate
    popupAnchor: [0, -36], // Popup opens right above pin head
  });

  pinIconCache.set(cacheKey, icon);
  return icon;
}

/**
 * Automatically adjusts map viewport / bounds when the filtered scope of restaurants changes,
 * ensuring the map is focused on the relevant scope on initial load and whenever filters change.
 */
function MapBoundsController({ mappedRestaurants }) {
  const map = useMap();
  const prevSig = useRef('');

  useEffect(() => {
    if (!mappedRestaurants || mappedRestaurants.length === 0) return;

    // Stable signature based on count, first, middle, and last IDs
    const sig = `${mappedRestaurants.length}:${mappedRestaurants[0]?.id}:${mappedRestaurants[Math.floor(mappedRestaurants.length / 2)]?.id}:${mappedRestaurants[mappedRestaurants.length - 1]?.id}`;
    if (prevSig.current === sig) return;
    prevSig.current = sig;

    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
        const bounds = L.latLngBounds(mappedRestaurants.map((r) => [r.latitude, r.longitude]));
        if (bounds.isValid()) {
          map.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: mappedRestaurants.length === 1 ? 14 : 15,
          });
        }
      } catch (err) {
        console.warn('Map fitBounds error:', err);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [mappedRestaurants, map]);

  return null;
}

/**
 * Individual restaurant pin component with multi-venue popup support.
 */
function SingleRestaurantPin({
  restaurant,
  position,
  coLocatedGroup = [],
  isSelected,
  onSelect,
  multiInfo,
  onSelectRestaurantForChronicle,
}) {
  const [activeRestaurant, setActiveRestaurant] = useState(restaurant);

  // Sync if parent restaurant changes
  useEffect(() => {
    setActiveRestaurant(restaurant);
  }, [restaurant]);

  const mealCount = activeRestaurant.mealCount || activeRestaurant.meals?.length || 1;
  const visitDates = formatVisitDates(activeRestaurant);
  const ratingStyle = getRatingPillStyle(activeRestaurant.averageRatingText);
  const locationText = [activeRestaurant.city?.name, activeRestaurant.city?.country?.name]
    .filter(Boolean)
    .join(', ');

  const pinIcon = useMemo(
    () => createRestaurantPinIcon(restaurant, isSelected, multiInfo),
    [restaurant, isSelected, multiInfo]
  );

  return (
    <Marker
      position={position}
      icon={pinIcon}
      eventHandlers={{
        click: onSelect,
      }}
    >
      <Popup offset={[0, -4]} autoPan={true} className="restaurants-map-popup-leaf">
        <div
          className="restaurant-map-popup-card"
          onClick={() => {
            if (onSelectRestaurantForChronicle) {
              onSelectRestaurantForChronicle(activeRestaurant);
            }
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (onSelectRestaurantForChronicle) {
                onSelectRestaurantForChronicle(activeRestaurant);
              }
            }
          }}
          title="Click to view all meals in Chronicle"
        >
          {/* Multi-Venue Switcher if multiple restaurants share this address */}
          {coLocatedGroup.length > 1 && (
            <div
              className="popup-multi-venue-header"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="popup-multi-venue-title">
                <Layers size={12} />
                <span>{coLocatedGroup.length} venues at this location</span>
              </div>
              <div className="popup-multi-venue-pills">
                {coLocatedGroup.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`popup-venue-pill ${r.id === activeRestaurant.id ? 'active' : ''}`}
                    onClick={() => setActiveRestaurant(r)}
                    title={`View ${r.name}`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Header: Title & Rating Badge */}
          <div className="popup-card-header">
            <h4 className="popup-restaurant-title">{activeRestaurant.name}</h4>
            {activeRestaurant.averageRatingText && (
              <span
                className="popup-rating-pill"
                style={{
                  backgroundColor: ratingStyle.bg,
                  color: ratingStyle.text,
                  borderColor: ratingStyle.border,
                }}
              >
                <Star size={10} fill="currentColor" />
                <span>{formatRatingLabel(activeRestaurant.averageRatingText)}</span>
              </span>
            )}
          </div>

          {/* Location & Cuisine Subtitle */}
          <div className="popup-restaurant-location">
            <MapPin size={12} className="popup-pin-icon" />
            <span>{locationText || 'Location unrecorded'}</span>
            {activeRestaurant.type?.name && (
              <>
                <span className="popup-dot">•</span>
                <span className="popup-cuisine-tag">{activeRestaurant.type.name}</span>
              </>
            )}
          </div>

          {/* Summary Metrics: Number of meals, First & Last visit dates */}
          <div className="popup-metrics-grid">
            <div className="popup-metric-item">
              <span className="popup-metric-label">Meals</span>
              <span className="popup-metric-val">
                <Utensils size={12} className="popup-metric-icon" />
                <strong>{mealCount}</strong>
                <span className="popup-unit">{mealCount === 1 ? 'meal' : 'meals'}</span>
              </span>
            </div>

            {visitDates && (
              <div className="popup-metric-item">
                <span className="popup-metric-label">Visit History</span>
                <span className="popup-metric-val">
                  <Calendar size={12} className="popup-metric-icon" />
                  <span className="popup-dates-text">{visitDates}</span>
                </span>
              </div>
            )}
          </div>

          {/* Click Action Hint */}
          <div className="popup-action-row">
            <span className="popup-action-text">
              View {mealCount} {mealCount === 1 ? 'meal' : 'meals'} in Chronicle
            </span>
            <ArrowRight size={13} className="popup-action-arrow" />
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

/**
 * Renders hierarchical clusters and prominent individual restaurant markers dynamically.
 * Automatically resolves co-located restaurants at the same address with radial fan-out and connector lines.
 */
function ClustersLayer({ mappedRestaurants, onSelectRestaurantForChronicle }) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => Math.floor(map.getZoom() || 6));
  const [bounds, setBounds] = useState(() => {
    try {
      const b = map.getBounds();
      if (b && b.isValid()) {
        return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
      }
    } catch {}
    return [-180, -85, 180, 85];
  });
  const [selectedId, setSelectedId] = useState(null);

  // 1. Build Supercluster index from mapped restaurants
  const supercluster = useMemo(() => {
    const sc = new Supercluster({
      radius: 60,
      maxZoom: 16,
      extent: 512,
    });

    const points = mappedRestaurants.map((restaurant) => ({
      type: 'Feature',
      properties: {
        cluster: false,
        restaurantId: restaurant.id,
        restaurant,
      },
      geometry: {
        type: 'Point',
        coordinates: [restaurant.longitude, restaurant.latitude],
      },
    }));

    sc.load(points);
    return sc;
  }, [mappedRestaurants]);

  // 2. Synchronize viewport on map movements or zoom
  const updateViewport = useCallback(() => {
    try {
      const b = map.getBounds();
      if (b && b.isValid()) {
        setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
        setZoom(Math.floor(map.getZoom()));
      }
    } catch (err) {
      console.warn('Error reading map bounds:', err);
    }
  }, [map]);

  useEffect(() => {
    updateViewport();
    map.on('moveend', updateViewport);
    return () => {
      map.off('moveend', updateViewport);
    };
  }, [map, updateViewport]);

  // 3. Cluster expansion click handler: smoothly zooms into the cluster to resolve it
  const handleClusterClick = useCallback(
    (clusterId, lat, lng) => {
      if (!supercluster) return;
      try {
        const expansionZoom = supercluster.getClusterExpansionZoom(clusterId);
        const nextZoom = Math.min(expansionZoom, 17);
        map.setView([lat, lng], nextZoom, {
          animate: true,
          duration: 0.5,
        });
      } catch {
        map.setView([lat, lng], Math.min(map.getZoom() + 2, 17), {
          animate: true,
          duration: 0.5,
        });
      }
    },
    [supercluster, map]
  );

  // 4. Retrieve clusters for current viewport
  const clusters = useMemo(() => {
    if (!supercluster || !bounds) return [];
    try {
      return supercluster.getClusters(bounds, zoom);
    } catch (err) {
      console.warn('Error computing clusters:', err);
      return [];
    }
  }, [supercluster, bounds, zoom]);

  // 5. Separate cluster markers from individual venues and group co-located venues
  const { clusterItems, individualPins, multiGroupDecorations } = useMemo(() => {
    const clusterItems = [];
    const unclustered = [];

    clusters.forEach((item) => {
      if (item.properties.cluster) {
        clusterItems.push(item);
      } else if (item.properties.restaurant) {
        unclustered.push(item.properties.restaurant);
      }
    });

    // Group co-located venues by coordinates (~1m precision)
    const coordGroups = new Map();
    unclustered.forEach((restaurant) => {
      const key = `${restaurant.latitude.toFixed(5)},${restaurant.longitude.toFixed(5)}`;
      if (!coordGroups.has(key)) coordGroups.set(key, []);
      coordGroups.get(key).push(restaurant);
    });

    const individualPins = [];
    const multiGroupDecorations = [];

    coordGroups.forEach((group, key) => {
      const centerLat = group[0].latitude;
      const centerLng = group[0].longitude;

      if (group.length === 1) {
        // Single isolated restaurant at this spot
        const restaurant = group[0];
        individualPins.push({
          restaurant,
          position: [centerLat, centerLng],
          coLocatedGroup: group,
          multiInfo: null,
        });
      } else {
        // Multiple restaurants co-located at this exact address:
        // Render ground center anchor dot and connector lines
        multiGroupDecorations.push({
          key: `center-${key}`,
          center: [centerLat, centerLng],
          total: group.length,
        });

        // Fan out each restaurant radially around the ground coordinate
        const offsetRadius = 0.00022; // ~22 meters at street zoom
        group.forEach((restaurant, idx) => {
          const angle = (2 * Math.PI * idx) / group.length - Math.PI / 2;
          const pinLat = centerLat + Math.cos(angle) * offsetRadius;
          const pinLng = centerLng + Math.sin(angle) * offsetRadius;

          multiGroupDecorations.push({
            key: `line-${key}-${restaurant.id}`,
            isLine: true,
            positions: [
              [centerLat, centerLng],
              [pinLat, pinLng],
            ],
          });

          individualPins.push({
            restaurant,
            position: [pinLat, pinLng],
            coLocatedGroup: group,
            multiInfo: { index: idx, total: group.length },
          });
        });
      }
    });

    return { clusterItems, individualPins, multiGroupDecorations };
  }, [clusters]);

  return (
    <>
      {/* Connector lines & ground center dots for multi-restaurant locations */}
      {multiGroupDecorations.map((item) => {
        if (item.isLine) {
          return (
            <Polyline
              key={item.key}
              positions={item.positions}
              pathOptions={{
                color: '#64748b',
                weight: 1.5,
                dashArray: '3, 4',
                opacity: 0.75,
              }}
            />
          );
        }
        return (
          <CircleMarker
            key={item.key}
            center={item.center}
            radius={4}
            pathOptions={{
              color: '#475569',
              weight: 1.5,
              fillColor: '#0f172a',
              fillOpacity: 0.9,
            }}
          />
        );
      })}

      {/* Cluster Markers */}
      {clusterItems.map((item) => {
        const [lng, lat] = item.geometry.coordinates;
        const { cluster_id, point_count } = item.properties;

        return (
          <Marker
            key={`cluster-${cluster_id}`}
            position={[lat, lng]}
            icon={getClusterIcon(point_count)}
            eventHandlers={{
              click: () => handleClusterClick(cluster_id, lat, lng),
            }}
          />
        );
      })}

      {/* Prominent Individual Restaurant Pins */}
      {individualPins.map(({ restaurant, position, coLocatedGroup, multiInfo }) => {
        const isSelected = selectedId === restaurant.id;

        return (
          <SingleRestaurantPin
            key={`restaurant-${restaurant.id}`}
            restaurant={restaurant}
            position={position}
            coLocatedGroup={coLocatedGroup}
            isSelected={isSelected}
            onSelect={() => setSelectedId(restaurant.id)}
            multiInfo={multiInfo}
            onSelectRestaurantForChronicle={onSelectRestaurantForChronicle}
          />
        );
      })}
    </>
  );
}

export default function RestaurantsMap({
  restaurants = [],
  onSelectRestaurantForChronicle,
}) {
  // Filter to restaurants that have valid coordinates
  const mappedRestaurants = useMemo(() => {
    return restaurants.filter(
      (r) =>
        r.latitude !== null &&
        r.longitude !== null &&
        !isNaN(r.latitude) &&
        !isNaN(r.longitude)
    );
  }, [restaurants]);

  // Default initial center (London / UK)
  const defaultCenter = [51.505, -0.09];
  const defaultZoom = 6;

  return (
    <div className="restaurants-map-wrapper">
      <div className="restaurants-map-canvas-container">
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          scrollWheelZoom={true}
          className="restaurants-leaflet-map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapBoundsController mappedRestaurants={mappedRestaurants} />

          <ClustersLayer
            mappedRestaurants={mappedRestaurants}
            onSelectRestaurantForChronicle={onSelectRestaurantForChronicle}
          />
        </MapContainer>

        {/* Floating Summary Counter */}
        <div className="restaurants-map-badge-counter">
          <Compass size={14} className="counter-icon" />
          <span>
            Showing <strong>{mappedRestaurants.length.toLocaleString()}</strong> of{' '}
            <strong>{restaurants.length.toLocaleString()}</strong> restaurants on map
          </span>
        </div>

        {/* Empty Overlay if no restaurants have valid coordinates */}
        {mappedRestaurants.length === 0 && (
          <div className="restaurants-map-empty-overlay">
            <MapPin size={28} />
            <p>No mapped restaurants match your current filter selections.</p>
          </div>
        )}
      </div>
    </div>
  );
}
