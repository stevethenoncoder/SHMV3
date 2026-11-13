import React, { useState } from 'react';
import { Search, ChevronDown, X, SlidersHorizontal, Share2, Check } from 'lucide-react';
import { buildChronicleShareUrl } from '../../utils/mealsFilter.js';
import './MealsResultsToolbar.css';

export default function MealsResultsToolbar({
  totalCount,
  filteredCount,
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  pageSize,
  onPageSizeChange,
  activeFilterCount = 0,
  filterState = {},
  onOpenMobileFilters,
}) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const shareUrl = buildChronicleShareUrl(filterState, origin);

      // Quietly update the browser address bar with the shareable path
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        const pathOnly = buildChronicleShareUrl(filterState, '');
        window.history.replaceState(null, '', pathOnly);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch (err) {
      console.warn('Share copy error:', err);
    }
  };
  return (
    <div className="meals-toolbar">
      {/* Top Row: Search and Controls */}
      <div className="toolbar-main-row">
        {/* Search Box */}
        <div className="meals-search-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="meals-search-input"
            placeholder="Search by restaurant, dish, city, country, or note..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Mobile Filter Button (visible on mobile / narrow viewports) */}
        {onOpenMobileFilters && (
          <button
            type="button"
            className="mobile-filter-trigger-btn"
            onClick={onOpenMobileFilters}
            aria-label="Open filter sidebar"
          >
            <SlidersHorizontal size={15} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="mobile-filter-count-badge">{activeFilterCount}</span>
            )}
          </button>
        )}

        {/* Right Controls: Sort & Page Size */}
        <div className="toolbar-controls-right">
          {/* Per Page Selector */}
          <div className="control-group">
            <span className="control-label">Show</span>
            <div className="select-wrap">
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
              <ChevronDown size={13} className="select-arrow" />
            </div>
          </div>

          {/* Sort Selector */}
          <div className="control-group">
            <span className="control-label">Sort</span>
            <div className="select-wrap">
              <select
                value={sortOption}
                onChange={(e) => onSortChange(e.target.value)}
                className="toolbar-select sort-select"
              >
                <option value="date_desc">Date (newest first)</option>
                <option value="date_asc">Date (earliest first)</option>
                <option value="rating_desc">Rating (highest first)</option>
                <option value="spend_desc">Spend (£ highest)</option>
                <option value="spend_asc">Spend (£ lowest)</option>
                <option value="name_asc">Restaurant (A → Z)</option>
              </select>
              <ChevronDown size={13} className="select-arrow" />
            </div>
          </div>
        </div>
      </div>

      {/* Counter Row with Count on Left, Share Button on Right */}
      <div className="toolbar-count-row">
        <h2 className="display-count">
          Displaying {filteredCount} of {totalCount} {totalCount === 1 ? 'Meal' : 'Meals'}
          {searchQuery && (
            <span className="search-filter-indicator">
              {' '}matching &ldquo;{searchQuery}&rdquo;
            </span>
          )}
        </h2>

        <button
          type="button"
          className={`chronicle-share-btn ${copied ? 'is-copied' : ''}`}
          onClick={handleShare}
          title="Share current search and filter URL"
          aria-label="Share current view"
        >
          {copied ? (
            <Check size={14} className="share-btn-icon" />
          ) : (
            <Share2 size={14} className="share-btn-icon" />
          )}
          <span>{copied ? 'Link Copied!' : 'Share'}</span>
        </button>
      </div>
    </div>
  );
}
