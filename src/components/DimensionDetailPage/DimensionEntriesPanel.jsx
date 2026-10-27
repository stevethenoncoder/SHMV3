import React, { useState, useMemo } from 'react';
import {
  Star,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Heart,
  Filter,
} from 'lucide-react';
import { getStatusStyle } from '../../utils/statusColors.js';
import { formatDate, parseDate } from '../../utils/formatUtils.js';
import './DimensionEntriesPanel.css';

const STATUS_PRIORITY = {
  blogged: 4,
  complete: 4,
  visited: 3,
  planned: 2,
  'not planned': 1,
};

export default function DimensionEntriesPanel({
  dimension, // 'location' | 'category'
  entityName,
  places = [],
  allTargetPeers = [],
  rawProjectRows = [],
  totalEntriesCount = 0,
  onOpenPlace,
  isExpanded = false,
  onToggleExpand,
}) {
  const [sortField, setSortField] = useState('dimension'); // 'dimension' | 'place' | 'favourite' | 'date' | 'rating' | 'status'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
  const [showOnlyFavourites, setShowOnlyFavourites] = useState(false);
  // Default is false: displays populated entries; when clicked, displays Not planned entries and button says Remove Not Planned
  const [showNotPlanned, setShowNotPlanned] = useState(false);

  const handleHeaderClick = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // Default dates, ratings, statuses, favorites to desc; text fields to asc
      if (
        field === 'date' ||
        field === 'rating' ||
        field === 'status' ||
        field === 'favourite'
      ) {
        setSortDirection('desc');
      } else {
        setSortDirection('asc');
      }
    }
  };

  // Combine populated places with unpopulated matrix rows when showNotPlanned is true
  const combinedEntries = useMemo(() => {
    // 1. Process places and normalise any rows that are Not planned / Not yet started
    let list = places.map((p) => {
      const isNP =
        (p.status || '').trim().toLowerCase() === 'not planned' ||
        (p.place || '').trim().toLowerCase() === 'not yet started' ||
        (p.place || '').trim().toLowerCase() === 'not planned';

      if (isNP) {
        return {
          ...p,
          place: 'Not planned',
          isNotStarted: true,
          status: 'Not planned',
        };
      }
      return p;
    });

    // 2. Collect all peers present in list
    const presentPeers = new Set(
      list
        .map((p) => (dimension === 'location' ? p.category : p.location))
        .filter(Boolean)
    );

    // 3. Map rawProjectRows for this entity so we can get existing status if present
    const rawRowsByPeer = new Map();
    if (Array.isArray(rawProjectRows)) {
      for (const row of rawProjectRows) {
        const matchEntity =
          dimension === 'location'
            ? row.location === entityName
            : row.category === entityName;
        if (matchEntity) {
          const peerKey =
            dimension === 'location' ? row.category : row.location;
          if (peerKey && !rawRowsByPeer.has(peerKey)) {
            rawRowsByPeer.set(peerKey, row);
          }
        }
      }
    }

    // 4. Add any target peer that does not exist in list
    for (const peer of allTargetPeers) {
      if (!presentPeers.has(peer)) {
        const rawRow = rawRowsByPeer.get(peer);
        list.push({
          id: `unstarted-${dimension}-${entityName}-${peer}`,
          projectKey: rawRow?.projectKey || '',
          location: dimension === 'location' ? entityName : peer,
          category: dimension === 'location' ? peer : entityName,
          place: 'Not planned',
          isNotStarted: true,
          favourite: false,
          rating: null,
          status: rawRow?.status || 'Not planned',
          date: null,
        });
      }
    }

    // 5. If showNotPlanned is FALSE, filter out all Not planned rows!
    if (!showNotPlanned) {
      list = list.filter(
        (p) =>
          !p.isNotStarted &&
          (p.status || '').trim().toLowerCase() !== 'not planned'
      );
    }

    if (showOnlyFavourites) {
      list = list.filter((p) => p.favourite);
    }

    return list;
  }, [
    places,
    showNotPlanned,
    showOnlyFavourites,
    allTargetPeers,
    rawProjectRows,
    dimension,
    entityName,
  ]);

  const sortedPlaces = useMemo(() => {
    const list = [...combinedEntries];

    list.sort((a, b) => {
      let comparison = 0;

      if (sortField === 'favourite') {
        const aFav = a.favourite ? 1 : 0;
        const bFav = b.favourite ? 1 : 0;
        comparison = aFav - bFav;
      } else if (sortField === 'dimension') {
        const aVal = (dimension === 'location' ? a.category : a.location) || '';
        const bVal = (dimension === 'location' ? b.category : b.location) || '';
        comparison = aVal.localeCompare(bVal);
      } else if (sortField === 'place') {
        const aVal = a.place || '';
        const bVal = b.place || '';
        comparison = aVal.localeCompare(bVal);
      } else if (sortField === 'date') {
        const aTs = a.date ? (parseDate(a.date).timestamp || 0) : 0;
        const bTs = b.date ? (parseDate(b.date).timestamp || 0) : 0;
        comparison = aTs - bTs;
      } else if (sortField === 'rating') {
        const aR = typeof a.rating === 'number' ? a.rating : -1;
        const bR = typeof b.rating === 'number' ? b.rating : -1;
        comparison = aR - bR;
      } else if (sortField === 'status') {
        const aSt = (a.status || 'not planned').trim().toLowerCase();
        const bSt = (b.status || 'not planned').trim().toLowerCase();
        const aP = STATUS_PRIORITY[aSt] || 0;
        const bP = STATUS_PRIORITY[bSt] || 0;
        comparison = aP - bP;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [combinedEntries, sortField, sortDirection, dimension]);

  // When collapsed, show only top 3 entries
  const displayedPlaces = useMemo(() => {
    if (!isExpanded) {
      return sortedPlaces.slice(0, 3);
    }
    return sortedPlaces;
  }, [sortedPlaces, isExpanded]);

  const renderSortIndicator = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} className="sort-icon-inactive" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={12} className="sort-icon-active" />
    ) : (
      <ArrowDown size={12} className="sort-icon-active" />
    );
  };

  return (
    <div className={`dimension-entries-panel ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}>
      <div className="dimension-entries-header">
        <div className="entries-header-top-row">
          <div className="entries-title-and-badge">
            <h3 className="entries-panel-title">Places</h3>
            {!isExpanded && sortedPlaces.length > 3 && (
              <span className="collapsed-preview-badge">
                Showing 3 of {sortedPlaces.length}
              </span>
            )}
            {/* Expand / Collapse Button on the same line as Showing 3 of X */}
            {onToggleExpand && sortedPlaces.length > 3 && (
              <button
                type="button"
                className="collapse-toggle-btn"
                onClick={onToggleExpand}
                title={isExpanded ? 'Collapse' : 'Expand all'}
                aria-expanded={isExpanded}
              >
                <span>{isExpanded ? 'Collapse' : 'Expand all'}</span>
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>
        </div>

        <div className="entries-header-controls">
          {/* Favourites filter toggle */}
          <button
            type="button"
            className={`entry-filter-toggle-btn ${showOnlyFavourites ? 'active' : ''}`}
            onClick={() => setShowOnlyFavourites(!showOnlyFavourites)}
            title={showOnlyFavourites ? 'Show all places' : 'Filter by favorites'}
            aria-pressed={showOnlyFavourites}
          >
            <Heart
              size={14}
              fill={showOnlyFavourites ? '#ef4444' : 'none'}
              color={showOnlyFavourites ? '#ef4444' : 'currentColor'}
            />
            <span className="control-btn-label">Favorites</span>
          </button>

          {/* Display / Remove Not Planned toggle */}
          <button
            type="button"
            className={`entry-filter-toggle-btn ${showNotPlanned ? 'active' : ''}`}
            onClick={() => setShowNotPlanned(!showNotPlanned)}
            title={showNotPlanned ? 'Remove Not Planned places' : 'Display Not Planned places'}
            aria-pressed={showNotPlanned}
          >
            <Filter size={13} />
            <span className="control-btn-label">
              {showNotPlanned ? 'Remove Not Planned' : 'Display Not Planned'}
            </span>
          </button>
        </div>
      </div>

      {displayedPlaces.length === 0 ? (
        <div className="entries-empty-state">
          <p>No matching places found.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table (hidden on mobile via CSS) */}
          <div className="entries-table-wrapper desktop-entries-table">
            <table className="entries-table">
              <thead>
                <tr>
                  {/* 1. Dimension: Category for Counties, Location for Categories */}
                  <th
                    className="sortable-th"
                    onClick={() => handleHeaderClick('dimension')}
                    role="button"
                    tabIndex={0}
                  >
                    <span>{dimension === 'location' ? 'Category' : 'Location'}</span>
                    {renderSortIndicator('dimension')}
                  </th>

                  {/* 2. Place */}
                  <th
                    className="sortable-th"
                    onClick={() => handleHeaderClick('place')}
                    role="button"
                    tabIndex={0}
                  >
                    <span>Place</span>
                    {renderSortIndicator('place')}
                  </th>

                  {/* 3. Favorites Column */}
                  <th
                    className="sortable-th th-fav-col"
                    onClick={() => handleHeaderClick('favourite')}
                    role="button"
                    tabIndex={0}
                    title="Sort by favorites"
                  >
                    <span className="th-fav-wrap">
                      <Heart size={14} className="th-heart-icon" fill="#ef4444" color="#ef4444" />
                      {renderSortIndicator('favourite')}
                    </span>
                  </th>

                  {/* 4. Date */}
                  <th
                    className="sortable-th"
                    onClick={() => handleHeaderClick('date')}
                    role="button"
                    tabIndex={0}
                  >
                    <span>Date</span>
                    {renderSortIndicator('date')}
                  </th>

                  {/* 5. Rating */}
                  <th
                    className="sortable-th"
                    onClick={() => handleHeaderClick('rating')}
                    role="button"
                    tabIndex={0}
                  >
                    <span>Rating</span>
                    {renderSortIndicator('rating')}
                  </th>

                  {/* 6. Status */}
                  <th
                    className="sortable-th"
                    onClick={() => handleHeaderClick('status')}
                    role="button"
                    tabIndex={0}
                  >
                    <span>Status</span>
                    {renderSortIndicator('status')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedPlaces.map((place, idx) => {
                  const statusStyle = getStatusStyle(place.status);
                  const firstColValue =
                    dimension === 'location' ? place.category : place.location;

                  return (
                    <tr
                      key={place.id || `${place.place}-${idx}`}
                      className={place.isNotStarted ? 'row-not-started' : ''}
                    >
                      {/* 1. Category / Location */}
                      <td className="entry-dim-col">{firstColValue || '—'}</td>

                      {/* 2. Place */}
                      <td className="entry-place-col">
                        {place.isNotStarted ? (
                          <span className="place-unstarted-label">Not planned</span>
                        ) : (
                          <button
                            type="button"
                            className="place-link-btn"
                            onClick={() => onOpenPlace && onOpenPlace(place)}
                          >
                            {place.place}
                          </button>
                        )}
                      </td>

                      {/* 3. Favorites */}
                      <td className="entry-fav-col">
                        {place.favourite ? (
                          <Heart
                            size={14}
                            className="entry-fav-icon"
                            fill="#ef4444"
                            color="#ef4444"
                            title="Favorite place"
                          />
                        ) : null}
                      </td>
                      <td className="entry-date-col">
                        {place.date ? formatDate(place.date) : '—'}
                      </td>
                      <td className="entry-rating-col">
                        {place.rating !== null && place.rating !== undefined ? (
                          <span className="rating-pill">
                            <Star size={13} fill="#f59e0b" color="#f59e0b" />
                            <span>{place.rating.toFixed(1)}</span>
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="entry-status-col">
                        <span
                          className="status-pill"
                          style={{
                            backgroundColor: statusStyle.badgeBg,
                            color: statusStyle.badgeText,
                            borderColor: statusStyle.badgeBorder,
                          }}
                        >
                          <span
                            className="status-dot"
                            style={{ backgroundColor: statusStyle.dotBg }}
                          />
                          {place.status || 'Not planned'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Mini-Tile List (Mobile only, multi-row layout per place) */}
          <div className="entries-mobile-list">
            <div className="mobile-entries-tiles-grid">
              {displayedPlaces.map((place, idx) => {
                const statusStyle = getStatusStyle(place.status);
                const entityDimValue = dimension === 'location' ? place.category : place.location;

                return (
                  <div
                    key={place.id || `${place.place}-${idx}`}
                    className={`mobile-entry-tile ${place.isNotStarted ? 'row-not-started' : ''}`}
                    onClick={() => !place.isNotStarted && onOpenPlace && onOpenPlace(place)}
                    role={!place.isNotStarted ? 'button' : undefined}
                    tabIndex={!place.isNotStarted ? 0 : undefined}
                  >
                    {/* Column 1: County or Category */}
                    <div className="mobile-entry-dim-col">
                      {entityDimValue || '—'}
                    </div>

                    {/* Column 2: Place Name + Metadata aligned underneath */}
                    <div className="mobile-entry-content-col">
                      <div className="mobile-entry-place-title">
                        {place.isNotStarted ? (
                          <span className="place-unstarted-label">Not planned</span>
                        ) : (
                          <span className="place-clickable-title">{place.place}</span>
                        )}
                      </div>

                      {/* Metadata Line: Status Pill, Date, Rating, Favorite, Map Pin */}
                      <div className="mobile-entry-meta-line">
                        {/* Status Pill */}
                        <span
                          className="status-pill mobile-entry-status"
                          style={{
                            backgroundColor: statusStyle.badgeBg,
                            color: statusStyle.badgeText,
                            borderColor: statusStyle.badgeBorder,
                          }}
                        >
                          <span
                            className="status-dot"
                            style={{ backgroundColor: statusStyle.dotBg }}
                          />
                          {place.status || 'Not planned'}
                        </span>

                        {/* Rating */}
                        {typeof place.rating === 'number' && (
                          <span className="rating-pill mobile-entry-rating">
                            <Star size={11} fill="#f59e0b" color="#f59e0b" />
                            <span>{place.rating.toFixed(1)}</span>
                          </span>
                        )}

                        {/* Favorite Heart */}
                        {place.favourite && (
                          <span className="mobile-entry-fav" title="Favorite place">
                            <Heart size={13} fill="#ef4444" color="#ef4444" />
                          </span>
                        )}

                        {/* Google Maps link */}
                        {place.googleMapLink && (
                          <a
                            href={place.googleMapLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mobile-entry-gmaps-link"
                            onClick={(e) => e.stopPropagation()}
                            title="Open in Google Maps"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#4285F4" />
                              <circle cx="12" cy="9" r="2.5" fill="#ffffff" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
