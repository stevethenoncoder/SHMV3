import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  ArrowUpDown,
  Calendar,
  Star,
  Globe,
  MapPin,
  Tag,
  Users,
  Map,
  List,
  X,
  UtensilsCrossed,
} from 'lucide-react';
import shmLogoIcon from '../../assets/shm-logo-icon.png';
import shmLogoText from '../../assets/shm-logo-text.png';
import './MealsMobileHeaderToolbar.css';

export default function MealsMobileHeaderToolbar({
  totalCount = 0,
  filteredCount = 0,
  searchQuery = '',
  onSearchChange,
  onOpenSort,
  onOpenFilter,
  filterState = {},
  viewMode = 'list',
  onToggleViewMode,
}) {
  const [isVisible, setIsVisible] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(searchQuery));
  const lastScrollY = useRef(0);

  // Synchronize search open state if searchQuery changed externally
  useEffect(() => {
    if (searchQuery) setIsSearchOpen(true);
  }, [searchQuery]);

  // Hide header on scroll down, show on scroll up
  useEffect(() => {
    if (viewMode === 'map') {
      setIsVisible(true);
      return;
    }

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;

          // Always show when near the top of the page
          if (currentScrollY <= 25) {
            setIsVisible(true);
          } else if (currentScrollY > lastScrollY.current + 8) {
            // Scrolling down -> hide header
            setIsVisible(false);
          } else if (currentScrollY < lastScrollY.current - 8) {
            // Scrolling up -> show header
            setIsVisible(true);
          }

          lastScrollY.current = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [viewMode]);

  // Active filter counts
  const decadeCount = (filterState.decades || []).length;
  const ratingCount = (filterState.ratings || []).length;
  const countryCount = (filterState.countries || []).length;
  const cityCount = (filterState.cities || []).length;
  const typeCount = (filterState.cuisines || []).length;
  const companionCount = (filterState.people || []).length;

  return (
    <header
      className={`meals-mobile-header-toolbar ${!isVisible ? 'is-hidden' : ''}`}
      aria-label="Mobile Navigation Toolbar"
    >
      {/* 1. Top Row: Brand & Count Pill */}
      <div className="mobile-top-bar">
        <div className="mobile-brand">
          <img
            src={shmLogoIcon}
            alt="SHM Logo"
            className="mobile-brand-logo-icon"
          />
          <img
            src={shmLogoText}
            alt="Stevie Holland Meals"
            className="mobile-brand-logo-text"
          />
        </div>

        <div className="mobile-top-right">
          <span className="mobile-count-pill">
            <span className="mobile-count-dot" />
            {totalCount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 2. Horizontally Scrollable Filter Chips Row */}
      <div className="mobile-filter-chips-scroll">
        {/* Search Toggle Button */}
        <button
          type="button"
          className={`mobile-filter-chip search-chip ${isSearchOpen || searchQuery ? 'active' : ''}`}
          onClick={() => setIsSearchOpen((prev) => !prev)}
          title="Search meals"
          aria-label="Search meals"
        >
          <Search size={14} />
          {searchQuery && <span className="chip-active-dot" />}
        </button>

        {/* Sort Button */}
        <button
          type="button"
          className="mobile-filter-chip sort-chip"
          onClick={onOpenSort}
          title="Sort meals"
        >
          <ArrowUpDown size={14} />
          <span>Sort</span>
        </button>

        {/* Decade Chip */}
        <button
          type="button"
          className={`mobile-filter-chip ${decadeCount > 0 ? 'active' : ''}`}
          onClick={() => onOpenFilter && onOpenFilter('decades')}
        >
          <Calendar size={13} />
          <span>Decade</span>
          {decadeCount > 0 && <span className="chip-badge">{decadeCount}</span>}
        </button>

        {/* Rating Chip */}
        <button
          type="button"
          className={`mobile-filter-chip ${ratingCount > 0 ? 'active' : ''}`}
          onClick={() => onOpenFilter && onOpenFilter('ratings')}
        >
          <Star size={13} />
          <span>Rating</span>
          {ratingCount > 0 && <span className="chip-badge">{ratingCount}</span>}
        </button>

        {/* Country Chip */}
        <button
          type="button"
          className={`mobile-filter-chip ${countryCount > 0 ? 'active' : ''}`}
          onClick={() => onOpenFilter && onOpenFilter('countries')}
        >
          <Globe size={13} />
          <span>Country</span>
          {countryCount > 0 && <span className="chip-badge">{countryCount}</span>}
        </button>

        {/* City Chip */}
        <button
          type="button"
          className={`mobile-filter-chip ${cityCount > 0 ? 'active' : ''}`}
          onClick={() => onOpenFilter && onOpenFilter('cities')}
        >
          <MapPin size={13} />
          <span>City</span>
          {cityCount > 0 && <span className="chip-badge">{cityCount}</span>}
        </button>

        {/* Type / Cuisine Chip */}
        <button
          type="button"
          className={`mobile-filter-chip ${typeCount > 0 ? 'active' : ''}`}
          onClick={() => onOpenFilter && onOpenFilter('cuisines')}
        >
          <Tag size={13} />
          <span>Type</span>
          {typeCount > 0 && <span className="chip-badge">{typeCount}</span>}
        </button>

        {/* Companion Chip */}
        <button
          type="button"
          className={`mobile-filter-chip ${companionCount > 0 ? 'active' : ''}`}
          onClick={() => onOpenFilter && onOpenFilter('people')}
        >
          <Users size={13} />
          <span>Companion</span>
          {companionCount > 0 && <span className="chip-badge">{companionCount}</span>}
        </button>
      </div>

      {/* 3. Inline Search Bar (when active) */}
      {isSearchOpen && (
        <div className="mobile-inline-search-row">
          <Search size={14} className="inline-search-icon" />
          <input
            type="text"
            className="mobile-inline-search-input"
            placeholder="Search meals, restaurants, dishes, cities..."
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            autoFocus={!searchQuery}
          />
          {searchQuery && (
            <button
              type="button"
              className="inline-search-clear"
              onClick={() => onSearchChange && onSearchChange('')}
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* 4. Subheader Row: Displaying Count on Left, Map/List Toggle on Right */}
      <div className="mobile-subheader-row">
        <span className="mobile-results-count">
          Displaying {filteredCount.toLocaleString()} {filteredCount === 1 ? 'meal' : 'meals'}
        </span>

        <button
          type="button"
          className="mobile-view-toggle-btn"
          onClick={() => onToggleViewMode && onToggleViewMode(viewMode === 'list' ? 'map' : 'list')}
          aria-label={viewMode === 'list' ? 'Switch to Map view' : 'Switch to List view'}
        >
          {viewMode === 'list' ? (
            <>
              <Map size={14} />
              <span>Map</span>
            </>
          ) : (
            <>
              <List size={14} />
              <span>List</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
