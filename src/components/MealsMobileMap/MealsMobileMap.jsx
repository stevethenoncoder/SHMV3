import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import Supercluster from 'supercluster';
import 'leaflet/dist/leaflet.css';
import { Star, MapPin, Tag, X, Calendar, Utensils } from 'lucide-react';
import { formatRatingLabel } from '../../utils/restaurantsFilter.js';
import './MealsMobileMap.css';

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
      <div class="meals-cluster-bubble ${sizeClass}" title="Cluster of ${count} meals — tap to zoom in">
        <span class="cluster-count">${count}</span>
      </div>
    `,
    className: 'meals-cluster-div-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

  clusterIconCache.set(count, icon);
  return icon;
}

/**
 * Cache for meal teardrop pin icons with knife-and-fork motif.
 */
const pinIconCache = new Map();

function createMealPinIcon(meal, isSelected) {
  const color = getMarkerColor(meal.rating);
  const cacheKey = `${color}:${isSelected ? 'sel' : 'def'}`;

  if (pinIconCache.has(cacheKey)) {
    return pinIconCache.get(cacheKey);
  }

  const strokeColor = isSelected ? '#0f172a' : '#ffffff';
  const strokeWidth = isSelected ? '3.2' : '2.5';
  const scaleClass = isSelected ? 'is-selected' : '';

  const html = `
    <div class="meal-map-pin-wrap ${scaleClass}" title="${meal.dishName || meal.restaurant?.name || 'Meal'}">
      <svg class="meal-pin-svg" width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
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
    </div>
  `;

  const icon = L.divIcon({
    html,
    className: 'meal-pin-div-icon',
    iconSize: [32, 40],
    iconAnchor: [16, 38],
  });

  pinIconCache.set(cacheKey, icon);
  return icon;
}

/**
 * Controller to fit map bounds to mapped meals on initial load or filter change.
 */
function MapBoundsController({ mappedMeals }) {
  const map = useMap();
  const prevSig = useRef('');

  useEffect(() => {
    if (!mappedMeals || mappedMeals.length === 0) return;

    const sig = `${mappedMeals.length}:${mappedMeals[0]?.id}:${mappedMeals[mappedMeals.length - 1]?.id}`;
    if (prevSig.current === sig) return;
    prevSig.current = sig;

    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
        const bounds = L.latLngBounds(
          mappedMeals.map((m) => [m.restaurant.latitude, m.restaurant.longitude])
        );
        if (bounds.isValid()) {
          map.fitBounds(bounds, {
            paddingTopLeft: [24, 24],
            paddingBottomRight: [24, 160], // room for bottom floating card
            maxZoom: mappedMeals.length === 1 ? 14 : 14,
          });
        }
      } catch (err) {
        console.warn('Map fitBounds error:', err);
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [mappedMeals, map]);

  return null;
}

/**
 * Clusters layer rendering Supercluster bubbles and individual meal pins.
 */
function MealsClustersLayer({
  mappedMeals,
  selectedMeal,
  onSelectMealPin,
}) {
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

  // 1. Supercluster index
  const supercluster = useMemo(() => {
    const sc = new Supercluster({
      radius: 56,
      maxZoom: 16,
      extent: 512,
    });

    const points = mappedMeals.map((meal) => ({
      type: 'Feature',
      properties: {
        cluster: false,
        mealId: meal.id,
        meal,
      },
      geometry: {
        type: 'Point',
        coordinates: [meal.restaurant.longitude, meal.restaurant.latitude],
      },
    }));

    sc.load(points);
    return sc;
  }, [mappedMeals]);

  // 2. Viewport tracking
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

  // 3. Cluster expansion
  const handleClusterClick = useCallback(
    (clusterId, lat, lng) => {
      if (!supercluster) return;
      try {
        const expansionZoom = supercluster.getClusterExpansionZoom(clusterId);
        const nextZoom = Math.min(expansionZoom, 17);
        map.setView([lat, lng], nextZoom, {
          animate: true,
          duration: 0.45,
        });
      } catch {
        map.setView([lat, lng], Math.min(map.getZoom() + 2, 17), {
          animate: true,
          duration: 0.45,
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

  // 5. Separate clusters and individual pins with radial fan-out for co-located spots
  const { clusterItems, individualPins, multiGroupDecorations } = useMemo(() => {
    const clusterItems = [];
    const unclustered = [];

    clusters.forEach((item) => {
      if (item.properties.cluster) {
        clusterItems.push(item);
      } else if (item.properties.meal) {
        unclustered.push(item.properties.meal);
      }
    });

    // Group co-located meals
    const coordGroups = new Map();
    unclustered.forEach((meal) => {
      const lat = meal.restaurant.latitude;
      const lng = meal.restaurant.longitude;
      const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
      if (!coordGroups.has(key)) coordGroups.set(key, []);
      coordGroups.get(key).push(meal);
    });

    const individualPins = [];
    const multiGroupDecorations = [];

    coordGroups.forEach((group, key) => {
      const centerLat = group[0].restaurant.latitude;
      const centerLng = group[0].restaurant.longitude;

      if (group.length === 1) {
        individualPins.push({
          meal: group[0],
          position: [centerLat, centerLng],
        });
      } else {
        // Render ground center anchor dot
        multiGroupDecorations.push({
          key: `center-${key}`,
          center: [centerLat, centerLng],
        });

        // Fan out each co-located meal pin
        const offsetRadius = 0.00022; // ~22 meters
        group.forEach((meal, idx) => {
          const angle = (2 * Math.PI * idx) / group.length - Math.PI / 2;
          const pinLat = centerLat + Math.cos(angle) * offsetRadius;
          const pinLng = centerLng + Math.sin(angle) * offsetRadius;

          multiGroupDecorations.push({
            key: `line-${key}-${meal.id}`,
            isLine: true,
            positions: [
              [centerLat, centerLng],
              [pinLat, pinLng],
            ],
          });

          individualPins.push({
            meal,
            position: [pinLat, pinLng],
          });
        });
      }
    });

    return { clusterItems, individualPins, multiGroupDecorations };
  }, [clusters]);

  return (
    <>
      {/* Connector lines for fanned-out pins */}
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

      {/* Individual Meal Pins */}
      {individualPins.map(({ meal, position }) => {
        const isSelected = selectedMeal?.id === meal.id;
        const pinIcon = createMealPinIcon(meal, isSelected);

        return (
          <Marker
            key={`meal-${meal.id}`}
            position={position}
            icon={pinIcon}
            eventHandlers={{
              click: () => onSelectMealPin(meal),
            }}
          />
        );
      })}
    </>
  );
}

export default function MealsMobileMap({
  meals = [],
  onSelectMeal,
}) {
  // Filter meals with valid coordinates
  const mappedMeals = useMemo(() => {
    return meals.filter(
      (m) =>
        m.restaurant &&
        typeof m.restaurant.latitude === 'number' &&
        typeof m.restaurant.longitude === 'number' &&
        !isNaN(m.restaurant.latitude) &&
        !isNaN(m.restaurant.longitude)
    );
  }, [meals]);

  const [selectedMeal, setSelectedMeal] = useState(null);
  const [showPreview, setShowPreview] = useState(true);

  // Default to first mapped meal if none selected
  useEffect(() => {
    if (mappedMeals.length > 0 && !selectedMeal) {
      setSelectedMeal(mappedMeals[0]);
      setShowPreview(true);
    }
  }, [mappedMeals, selectedMeal]);

  const handleSelectMealPin = useCallback((meal) => {
    setSelectedMeal(meal);
    setShowPreview(true);
  }, []);

  return (
    <div className="meals-mobile-map-container" aria-label="Mobile Meals Map">
      <MapContainer
        center={[52.2, -1.5]}
        zoom={6}
        scrollWheelZoom={true}
        className="meals-mobile-leaflet-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapBoundsController mappedMeals={mappedMeals} />

        <MealsClustersLayer
          mappedMeals={mappedMeals}
          selectedMeal={selectedMeal}
          onSelectMealPin={handleSelectMealPin}
        />
      </MapContainer>

      {/* Floating Preview Card at Bottom (Matching Screenshot 2) */}
      {selectedMeal && showPreview && (
        <div
          className="meals-mobile-map-preview-sheet"
          onClick={() => onSelectMeal && onSelectMeal(selectedMeal.id)}
          role="button"
          tabIndex={0}
          aria-label={`View details for ${selectedMeal.dishName || selectedMeal.restaurant?.name}`}
        >
          <div className="meals-map-card">
            <button
              type="button"
              className="meals-map-card-close"
              onClick={(e) => {
                e.stopPropagation();
                setShowPreview(false);
              }}
              aria-label="Dismiss preview"
            >
              <X size={15} />
            </button>

            <h3 className="meals-map-card-title">
              {selectedMeal.dishName || selectedMeal.restaurant?.name}
            </h3>

            <div className="meals-map-card-row">
              <div className="meals-map-card-thumb">
                {selectedMeal.photos && selectedMeal.photos.length > 0 ? (
                  <img
                    src={selectedMeal.photos[0]}
                    alt={selectedMeal.dishName || selectedMeal.restaurant?.name}
                    className="meals-map-card-img"
                    loading="lazy"
                  />
                ) : (
                  <div className="meals-map-card-placeholder">
                    <Utensils size={20} className="placeholder-icon" />
                  </div>
                )}
              </div>

              <div className="meals-map-card-info">
                {selectedMeal.restaurant?.name && (
                  <div className="meals-map-card-restaurant">
                    {selectedMeal.restaurant.name}
                  </div>
                )}

                <div className="meals-map-card-meta">
                  {selectedMeal.rating && (
                    <span className="meals-map-meta-item rating">
                      <Star size={11} fill="currentColor" />
                      <span>{formatRatingLabel(selectedMeal.rating)}</span>
                    </span>
                  )}

                  {selectedMeal.formattedDate && (
                    <span className="meals-map-meta-item date">
                      <Calendar size={11} />
                      <span>{selectedMeal.formattedDate}</span>
                    </span>
                  )}
                </div>

                <div className="meals-map-card-tags">
                  {selectedMeal.restaurant?.city?.name && (
                    <span className="meals-map-tag location">
                      <MapPin size={10} />
                      <span>{selectedMeal.restaurant.city.name}</span>
                    </span>
                  )}

                  {selectedMeal.restaurant?.type?.name && (
                    <span className="meals-map-tag type">
                      <Tag size={10} />
                      <span>{selectedMeal.restaurant.type.name}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
