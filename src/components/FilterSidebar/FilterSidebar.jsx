import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, Check, Star, Heart } from 'lucide-react';
import { getStatusStyle, sortStatuses } from '../../utils/statusColors.js';
import './FilterSidebar.css';

export default function FilterSidebar({
  filterState,
  onUpdateFilter,
  onClearFilters,
  availableStatuses = [],
  availableLocations = [],
  availableCategories = [],
  locationLabelPlural = 'Locations',
  statusCounts = {},
  locationCounts = {},
  categoryCounts = {},
  ratingCounts = {},
}) {
  const [locSearch, setLocSearch] = useState('');
  const [catSearch, setCatSearch] = useState('');
  const [showAllLocations, setShowAllLocations] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Toggle helper for multi-select arrays
  const handleToggleArrayItem = (key, item) => {
    const current = filterState[key] || [];
    const updated = current.includes(item)
      ? current.filter((x) => x !== item)
      : [...current, item];
    onUpdateFilter(key, updated);
  };

  // Sort statuses in specified order: Complete, Visited, Planned, Unscheduled
  const orderedStatuses = sortStatuses(availableStatuses).filter(
    (st) => (statusCounts[st] || 0) > 0 || (filterState.statuses || []).includes(st)
  );

  // Filtered lists for sidebar: exclude items with 0 count unless currently selected
  const filteredLocs = availableLocations.filter((l) => {
    const matchesSearch = l.toLowerCase().includes(locSearch.toLowerCase());
    const hasCount = (locationCounts[l] || 0) > 0 || (filterState.locations || []).includes(l);
    return matchesSearch && hasCount;
  });
  const displayedLocs = showAllLocations ? filteredLocs : filteredLocs.slice(0, 6);

  const filteredCats = availableCategories.filter((c) => {
    const matchesSearch = c.toLowerCase().includes(catSearch.toLowerCase());
    const hasCount = (categoryCounts[c] || 0) > 0 || (filterState.categories || []).includes(c);
    return matchesSearch && hasCount;
  });
  const displayedCats = showAllCategories ? filteredCats : filteredCats.slice(0, 6);

  return (
    <aside className="filter-sidebar">
      {/* Sidebar Header */}
      <div className="sidebar-head">
        <div className="sidebar-title-row">
          <h2 className="sidebar-title">Filters</h2>
          <button type="button" className="clear-all-btn" onClick={onClearFilters}>
            Clear all
          </button>
        </div>

        {/* Global Search Input */}
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search places, parish, flora..."
            value={filterState.search}
            onChange={(e) => onUpdateFilter('search', e.target.value)}
            className="search-input"
          />
        </div>

        {/* Favourites Only Switch */}
        <div className="fav-toggle-row">
          <span className="fav-label">
            <Heart size={14} fill="#ef4444" color="#ef4444" className="fav-filter-heart" />
            Favourites Only
          </span>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={filterState.favouritesOnly}
              onChange={(e) => onUpdateFilter('favouritesOnly', e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      {/* Status Section */}
      <div className="filter-section">
        <h3 className="section-title">Status</h3>
        <div className="checkbox-list">
          {orderedStatuses.map((st) => {
            const isChecked = (filterState.statuses || []).includes(st);
            const statusInfo = getStatusStyle(st);
            const count = statusCounts[st] || 0;

            return (
              <label key={st} className="filter-checkbox-row">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggleArrayItem('statuses', st)}
                />
                <span className="custom-check">{isChecked && <Check size={12} />}</span>
                <span className="status-dot" style={{ backgroundColor: statusInfo.dotBg }} />
                <span className="checkbox-label">{statusInfo.label}</span>
                <span className="item-count">{count}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Location Section */}
      <div className="filter-section">
        <div className="section-header-row">
          <h3 className="section-title">{locationLabelPlural}</h3>
          {filteredLocs.length > 6 && (
            <button
              type="button"
              className="toggle-more-btn"
              onClick={() => setShowAllLocations(!showAllLocations)}
            >
              {showAllLocations ? 'Show less' : 'Show all'}
              {showAllLocations ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
        </div>

        <div className="sub-search-box">
          <Search size={13} className="search-icon" />
          <input
            type="text"
            placeholder={`Search ${locationLabelPlural.toLowerCase()}...`}
            value={locSearch}
            onChange={(e) => setLocSearch(e.target.value)}
            className="sub-search-input"
          />
        </div>

        <div className="checkbox-list">
          {displayedLocs.map((loc) => {
            const isChecked = (filterState.locations || []).includes(loc);
            const count = locationCounts[loc] || 0;

            return (
              <label key={loc} className="filter-checkbox-row">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggleArrayItem('locations', loc)}
                />
                <span className="custom-check">{isChecked && <Check size={12} />}</span>
                <span className="checkbox-label">{loc}</span>
                <span className="item-count">{count}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Categories Section */}
      <div className="filter-section">
        <div className="section-header-row">
          <h3 className="section-title">Categories</h3>
          {filteredCats.length > 6 && (
            <button
              type="button"
              className="toggle-more-btn"
              onClick={() => setShowAllCategories(!showAllCategories)}
            >
              {showAllCategories ? 'Show less' : 'Show all'}
              {showAllCategories ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
        </div>

        <div className="sub-search-box">
          <Search size={13} className="search-icon" />
          <input
            type="text"
            placeholder="Search categories..."
            value={catSearch}
            onChange={(e) => setCatSearch(e.target.value)}
            className="sub-search-input"
          />
        </div>

        <div className="checkbox-list">
          {displayedCats.map((cat) => {
            const isChecked = (filterState.categories || []).includes(cat);
            const count = categoryCounts[cat] || 0;

            return (
              <label key={cat} className="filter-checkbox-row">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggleArrayItem('categories', cat)}
                />
                <span className="custom-check">{isChecked && <Check size={12} />}</span>
                <span className="checkbox-label">{cat}</span>
                <span className="item-count">{count}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Ratings Section */}
      <div className="filter-section">
        <h3 className="section-title">Ratings</h3>
        <div className="checkbox-list">
          {[
            { value: 5, label: '5 and over' },
            { value: 4, label: '4 and over' },
            { value: 3, label: '3 and over' },
          ].map(({ value, label }) => {
            const isSelected = filterState.minRating === value;
            const count = ratingCounts[value] || 0;

            return (
              <label key={value} className="filter-checkbox-row">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() =>
                    onUpdateFilter('minRating', isSelected ? null : value)
                  }
                />
                <span className="custom-check">{isSelected && <Check size={12} />}</span>
                <Star size={13} fill="#f59e0b" color="#f59e0b" className="rating-star-icon" />
                <span className="checkbox-label">{label}</span>
                <span className="item-count">{count}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Date Range Section (Placed right at the bottom as requested) */}
      <div className="filter-section date-filter-section">
        <div className="section-header-row">
          <h3 className="section-title">Date Range</h3>
          {(filterState.startDate || filterState.endDate) && (
            <button
              type="button"
              className="reset-dates-btn"
              onClick={() => {
                onUpdateFilter('startDate', null);
                onUpdateFilter('endDate', null);
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Month Preset Picker (e.g. July 2026, June 2026, etc.) */}
        <div className="date-quick-month-row">
          <label className="date-input-label">Quick month:</label>
          <select
            className="month-picker-select"
            value={
              filterState.startDate && filterState.endDate && filterState.startDate.slice(0, 7) === filterState.endDate.slice(0, 7)
                ? filterState.startDate.slice(0, 7)
                : ''
            }
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                onUpdateFilter('startDate', null);
                onUpdateFilter('endDate', null);
              } else {
                // Determine last day of chosen month
                const [y, m] = val.split('-').map(Number);
                const lastDay = new Date(y, m, 0).getDate();
                const padM = String(m).padStart(2, '0');
                onUpdateFilter('startDate', `${val}-01`);
                onUpdateFilter('endDate', `${val}-${String(lastDay).padStart(2, '0')}`);
              }
            }}
          >
            <option value="">Choose month...</option>
            <option value="2026-09">September 2026</option>
            <option value="2026-08">August 2026</option>
            <option value="2026-07">July 2026</option>
            <option value="2026-06">June 2026</option>
            <option value="2026-05">May 2026</option>
            <option value="2026-04">April 2026</option>
            <option value="2026-03">March 2026</option>
            <option value="2026-02">February 2026</option>
            <option value="2026-01">January 2026</option>
            <option value="2025-11">November 2025</option>
            <option value="2025-10">October 2025</option>
            <option value="2025-09">September 2025</option>
            <option value="2025-08">August 2025</option>
            <option value="2025-07">July 2025</option>
          </select>
        </div>

        {/* Custom Start & End Date Pickers */}
        <div className="date-pickers-grid">
          <div className="date-field-wrap">
            <label className="date-input-label">From</label>
            <input
              type="date"
              className="date-picker-input"
              value={filterState.startDate || ''}
              onChange={(e) => onUpdateFilter('startDate', e.target.value || null)}
            />
          </div>
          <div className="date-field-wrap">
            <label className="date-input-label">To</label>
            <input
              type="date"
              className="date-picker-input"
              value={filterState.endDate || ''}
              onChange={(e) => onUpdateFilter('endDate', e.target.value || null)}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
