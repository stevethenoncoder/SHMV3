import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Heart, Compass } from 'lucide-react';
import { getStatusStyle, sortStatuses } from '../../utils/statusColors.js';
import { filterItems } from '../../utils/filterAndSort.js';
import './MobileFilterSheet.css';

export default function MobileFilterSheet({
  isOpen,
  filterType, // 'favorites' | 'category' | 'location' | 'status'
  onClose,
  filterState = {},
  onApplyFilters,
  explorerItems = [],
  availableStatuses = [],
  availableLocations = [],
  availableCategories = [],
  locationLabel = 'County',
  locationLabelPlural = 'Counties',
  statusCounts = {},
  locationCounts = {},
  categoryCounts = {},
}) {
  if (!isOpen || !filterType) return null;

  // Local draft state so user can select/check and tap Apply
  const [draftFilters, setDraftFilters] = useState({ ...filterState });

  // Sync draft state whenever sheet opens or filterType changes
  useEffect(() => {
    setDraftFilters({ ...filterState });
  }, [filterState, filterType, isOpen]);

  const handleToggleArray = (key, val) => {
    const list = draftFilters[key] || [];
    const updated = list.includes(val)
      ? list.filter((x) => x !== val)
      : [...list, val];
    setDraftFilters({ ...draftFilters, [key]: updated });
  };

  const orderedStatuses = useMemo(() => {
    return sortStatuses(availableStatuses).filter(
      (st) => (statusCounts[st] || 0) > 0 || (draftFilters.statuses || []).includes(st)
    );
  }, [availableStatuses, statusCounts, draftFilters.statuses]);

  const filteredLocs = useMemo(() => {
    return availableLocations.filter((l) => {
      const hasCount = (locationCounts[l] || 0) > 0 || (draftFilters.locations || []).includes(l);
      return hasCount;
    });
  }, [availableLocations, locationCounts, draftFilters.locations]);

  const filteredCats = useMemo(() => {
    return availableCategories.filter((c) => {
      const hasCount = (categoryCounts[c] || 0) > 0 || (draftFilters.categories || []).includes(c);
      return hasCount;
    });
  }, [availableCategories, categoryCounts, draftFilters.categories]);

  const handleApply = () => {
    onApplyFilters(draftFilters);
    onClose();
  };

  const handleClearCurrentType = () => {
    const updated = { ...draftFilters };
    if (filterType === 'favorites') {
      updated.favouritesOnly = false;
    } else if (filterType === 'category') {
      updated.categories = [];
    } else if (filterType === 'location') {
      updated.locations = [];
    } else if (filterType === 'status') {
      updated.statuses = [];
    }
    setDraftFilters(updated);
    onApplyFilters(updated);
    onClose();
  };

  // Calculate number of matching places resulting from current draft filters
  const matchingPlacesCount = useMemo(() => {
    if (!explorerItems || explorerItems.length === 0) return 0;
    return filterItems(explorerItems, draftFilters).length;
  }, [explorerItems, draftFilters]);

  const hasSelectedOptions = useMemo(() => {
    if (filterType === 'category') return (draftFilters.categories || []).length > 0;
    if (filterType === 'location') return (draftFilters.locations || []).length > 0;
    if (filterType === 'status') return (draftFilters.statuses || []).length > 0;
    if (filterType === 'favorites') return Boolean(draftFilters.favouritesOnly);
    return false;
  }, [filterType, draftFilters]);

  // Determine Title
  let sheetTitle = 'Filter';
  if (filterType === 'favorites') {
    sheetTitle = 'Favorites';
  } else if (filterType === 'category') {
    sheetTitle = 'Category';
  } else if (filterType === 'location') {
    sheetTitle = locationLabelPlural || locationLabel || 'Counties';
  } else if (filterType === 'status') {
    sheetTitle = 'Status';
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
        {/* Handle / Header */}
        <div className="sheet-handle-bar" />
        <div className="sheet-header">
          <h2 className="sheet-title">Filter by {sheetTitle}</h2>
          <button type="button" className="sheet-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Sheet Scrollable Body */}
        <div className="sheet-body">
          {/* 1. Favorites Overlay */}
          {filterType === 'favorites' && (
            <div className="sheet-fav-options">
              <button
                type="button"
                className={`sheet-fav-option-card ${!draftFilters.favouritesOnly ? 'is-selected' : ''}`}
                onClick={() => {
                  onApplyFilters({ ...draftFilters, favouritesOnly: false });
                  onClose();
                }}
              >
                <div className="fav-option-icon-box">
                  <Compass size={20} />
                </div>
                <div className="fav-option-text">
                  <div className="fav-option-title">All Places</div>
                  <div className="fav-option-sub">Show all places without favorites filter</div>
                </div>
                {!draftFilters.favouritesOnly && <Check size={18} className="fav-option-check" />}
              </button>

              <button
                type="button"
                className={`sheet-fav-option-card ${draftFilters.favouritesOnly ? 'is-selected' : ''}`}
                onClick={() => {
                  onApplyFilters({ ...draftFilters, favouritesOnly: true });
                  onClose();
                }}
              >
                <div className="fav-option-icon-box fav-red-box">
                  <Heart size={20} fill="#ef4444" color="#ef4444" />
                </div>
                <div className="fav-option-text">
                  <div className="fav-option-title">Favorites Only</div>
                  <div className="fav-option-sub">Show only places marked as favorites</div>
                </div>
                {draftFilters.favouritesOnly && <Check size={18} className="fav-option-check" />}
              </button>
            </div>
          )}

          {/* 2. Category Overlay */}
          {filterType === 'category' && (
            <div className="sheet-checkbox-list">
              {filteredCats.length === 0 ? (
                <div className="sheet-empty-hint">No categories available.</div>
              ) : (
                filteredCats.map((cat) => {
                  const isChecked = (draftFilters.categories || []).includes(cat);
                  const count = categoryCounts[cat] || 0;

                  return (
                    <label key={cat} className="sheet-checkbox-row">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleArray('categories', cat)}
                      />
                      <span className="sheet-custom-check">{isChecked && <Check size={12} />}</span>
                      <span className="sheet-item-label">{cat}</span>
                      <span className="sheet-item-count">{count}</span>
                    </label>
                  );
                })
              )}
            </div>
          )}

          {/* 3. County / Location Overlay */}
          {filterType === 'location' && (
            <div className="sheet-checkbox-list">
              {filteredLocs.length === 0 ? (
                <div className="sheet-empty-hint">No locations available.</div>
              ) : (
                filteredLocs.map((loc) => {
                  const isChecked = (draftFilters.locations || []).includes(loc);
                  const count = locationCounts[loc] || 0;

                  return (
                    <label key={loc} className="sheet-checkbox-row">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleArray('locations', loc)}
                      />
                      <span className="sheet-custom-check">{isChecked && <Check size={12} />}</span>
                      <span className="sheet-item-label">{loc}</span>
                      <span className="sheet-item-count">{count}</span>
                    </label>
                  );
                })
              )}
            </div>
          )}

          {/* 4. Status Overlay */}
          {filterType === 'status' && (
            <div className="sheet-checkbox-list">
              {orderedStatuses.map((st) => {
                const isChecked = (draftFilters.statuses || []).includes(st);
                const statusInfo = getStatusStyle(st);
                const count = statusCounts[st] || 0;

                return (
                  <label key={st} className="sheet-checkbox-row">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleArray('statuses', st)}
                    />
                    <span className="sheet-custom-check">{isChecked && <Check size={12} />}</span>
                    <span className="status-dot" style={{ backgroundColor: statusInfo.dotBg }} />
                    <span className="sheet-item-label">{statusInfo.label}</span>
                    <span className="sheet-item-count">{count}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Sheet Footer Actions (for multi-option filters: Category, County, Status) */}
        {filterType !== 'favorites' && (
          <div className="sheet-footer">
            <button type="button" className="sheet-reset-btn" onClick={handleClearCurrentType}>
              Clear
            </button>
            <button type="button" className="sheet-apply-btn" onClick={handleApply}>
              Apply Filter {hasSelectedOptions ? `(${matchingPlacesCount})` : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
