import React from 'react';
import { LayoutGrid, List, Map, ChevronDown } from 'lucide-react';
import ActiveFilterChips from '../ActiveFilterChips/ActiveFilterChips.jsx';
import './ResultsToolbar.css';

export default function ResultsToolbar({
  totalPlacesCount,
  filterState,
  onRemoveFilter,
  onClearFilters,
  sortOption,
  onSortChange,
  pageSize,
  onPageSizeChange,
  viewMode = 'grid',
  onViewModeChange,
  locationLabel = 'County',
  locationLabelPlural = 'Locations',
}) {
  return (
    <div className="results-toolbar">
      {/* Top row: Displaying N Places and Sort/View buttons */}
      <div className="toolbar-top-row">
        <h2 className="display-count-title">
          Displaying {totalPlacesCount} Places
        </h2>

        <div className="toolbar-controls-right">
          {/* Per Page Selector (Multiples of 9: 9, 18, 27, 36) */}
          <div className="page-size-control-top">
            <span className="control-label">Show</span>
            <div className="select-box-wrap">
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="toolbar-select"
              >
                <option value={9}>9</option>
                <option value={18}>18</option>
                <option value={27}>27</option>
                <option value={36}>36</option>
              </select>
              <ChevronDown size={13} className="select-arrow-icon" />
            </div>
          </div>

          {/* Sort Selector with Bidirectional Options & Dynamic Location Label */}
          <div className="sort-control-wrapper">
            <span className="control-label">Sort by</span>
            <div className="select-box-wrap">
              <select
                value={sortOption}
                onChange={(e) => onSortChange(e.target.value)}
                className="toolbar-select sort-select-custom"
              >
                <option value="name_asc">Name (A → Z)</option>
                <option value="name_desc">Name (Z → A)</option>
                <option value="date_desc">Date (most recent)</option>
                <option value="date_asc">Date (earliest)</option>
                <option value="location_asc">{locationLabel} (A → Z)</option>
                <option value="location_desc">{locationLabel} (Z → A)</option>
                <option value="category_asc">Category (A → Z)</option>
                <option value="category_desc">Category (Z → A)</option>
                <option value="rating_desc">Rating (highest first)</option>
                <option value="rating_asc">Rating (lowest first)</option>
              </select>
              <ChevronDown size={13} className="select-arrow-icon" />
            </div>
          </div>

          {/* View Mode Toggle Buttons */}
          <div className="view-mode-group">
            <button
              type="button"
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => onViewModeChange('grid')}
              title="Grid view"
            >
              <LayoutGrid size={16} />
              <span>Grid</span>
            </button>

            <button
              type="button"
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => onViewModeChange('list')}
              title="List view (Milestone 2 desktop preview)"
            >
              <List size={16} />
              <span>List</span>
            </button>

            <button
              type="button"
              className={`view-btn ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => onViewModeChange('map')}
              title="Map view (Milestone 3 preview)"
            >
              <Map size={16} />
              <span>Map</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom row: Active Filter Chips */}
      <ActiveFilterChips
        filterState={filterState}
        onRemoveFilter={onRemoveFilter}
        onClearFilters={onClearFilters}
        locationLabelPlural={locationLabelPlural}
      />
    </div>
  );
}
