import React, { useState, useRef, useEffect } from 'react';
import { ArrowUpDown, Heart, Tag, MapPin, CheckCircle2, Check, Map, List } from 'lucide-react';
import './MobileHeaderToolbar.css';

export default function MobileHeaderToolbar({
  projects = [],
  activeProject,
  onSelectProject,
  activeConfig,
  totalPlacesCount,
  onOpenSort,
  onOpenFilterType,
  filterState = {},
  locationLabel = 'County',
  activeNav = 'explorer',
  viewMode = 'grid',
  onToggleViewMode,
}) {
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const menuRef = useRef(null);
  const lastScrollY = useRef(0);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isProjectMenuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsProjectMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [isProjectMenuOpen]);

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

          // Always show when near top of page
          if (currentScrollY <= 20) {
            setIsVisible(true);
          } else if (currentScrollY > lastScrollY.current + 8) {
            // Scrolling down (finger moves up, list scrolls up) -> hide header
            if (!isProjectMenuOpen) {
              setIsVisible(false);
            }
          } else if (currentScrollY < lastScrollY.current - 8) {
            // Scrolling up (finger moves down, list scrolls down) -> show header
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
  }, [viewMode, isProjectMenuOpen]);

  const currentProject = activeConfig?.projectKey || activeProject || 'England';
  const projectLetter = currentProject.charAt(0).toUpperCase();

  const mobileTitle =
    activeConfig?.projectTitleMobile ||
    activeConfig?.projectTitle ||
    'A-Z Tour';

  const isFavActive = Boolean(filterState.favouritesOnly);
  const catCount = (filterState.categories || []).length;
  const isCatActive = catCount > 0;
  const locCount = (filterState.locations || []).length;
  const isLocActive = locCount > 0;
  const statusCount = (filterState.statuses || []).length;
  const isStatusActive = statusCount > 0;

  return (
    <div className={`mobile-header-toolbar ${!isVisible ? 'is-hidden' : ''}`}>
      {/* Top row: Brand & Project Title & Round Project Selector with Pop-up */}
      <div className="mobile-top-bar">
        <div className="mobile-brand">
          <div className="brand-logo-badge">
            <span className="logo-letter">A</span>
            <span className="logo-sup">Z</span>
          </div>
          <h1 className="mobile-app-title" title={mobileTitle}>
            {mobileTitle}
          </h1>
        </div>

        {/* Round selector wrapper with pop-up menu */}
        <div className="mobile-project-selector-wrapper" ref={menuRef}>
          <button
            type="button"
            className={`mobile-project-round-btn ${isProjectMenuOpen ? 'is-active' : ''}`}
            onClick={() => setIsProjectMenuOpen((prev) => !prev)}
            title={`Select project (current: ${currentProject})`}
            aria-label={`Select project (current: ${currentProject})`}
            aria-expanded={isProjectMenuOpen}
          >
            {projectLetter}
          </button>

          {isProjectMenuOpen && (
            <div className="mobile-project-dropdown" role="menu" aria-label="Projects">
              <div className="mobile-project-dropdown-header">Select Project</div>
              <div className="mobile-project-dropdown-list">
                {projects.map((proj) => {
                  const isCurrent = proj.projectKey === activeProject;
                  const letter = proj.projectKey.charAt(0).toUpperCase();
                  return (
                    <button
                      key={proj.projectKey}
                      type="button"
                      className={`mobile-project-dropdown-item ${isCurrent ? 'is-selected' : ''}`}
                      onClick={() => {
                        onSelectProject(proj.projectKey);
                        setIsProjectMenuOpen(false);
                      }}
                      role="menuitem"
                    >
                      <span className="dropdown-project-badge">{letter}</span>
                      <span className="dropdown-project-name">{proj.projectKey}</span>
                      {isCurrent && <Check size={16} className="dropdown-check-icon" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Control Buttons Row: Swipeable single line with Sort, Favorites, Category, County, Status */}
      {activeNav === 'explorer' && (
        <div className="mobile-controls-row">
          {/* 1. Sort */}
          <button
            type="button"
            className="mobile-action-btn"
            onClick={onOpenSort}
            title="Sort places"
          >
            <ArrowUpDown size={13} />
            <span>Sort</span>
          </button>

          {/* 2. Favorites */}
          <button
            type="button"
            className={`mobile-action-btn ${isFavActive ? 'is-fav-filtered' : ''}`}
            onClick={() => onOpenFilterType('favorites')}
            title="Filter by Favorites"
          >
            <Heart
              size={13}
              fill={isFavActive ? '#ef4444' : 'none'}
              color={isFavActive ? '#ef4444' : 'currentColor'}
            />
            <span>Favorites</span>
            {isFavActive && <span className="active-dot" />}
          </button>

          {/* 3. Category */}
          <button
            type="button"
            className={`mobile-action-btn ${isCatActive ? 'is-filtered' : ''}`}
            onClick={() => onOpenFilterType('category')}
            title="Filter by Category"
          >
            <Tag size={13} />
            <span>
              Category{isCatActive ? ` (${catCount})` : ''}
            </span>
            {isCatActive && <span className="active-dot" />}
          </button>

          {/* 4. County / Location */}
          <button
            type="button"
            className={`mobile-action-btn ${isLocActive ? 'is-filtered' : ''}`}
            onClick={() => onOpenFilterType('location')}
            title={`Filter by ${locationLabel}`}
          >
            <MapPin size={13} />
            <span>
              {locationLabel}{isLocActive ? ` (${locCount})` : ''}
            </span>
            {isLocActive && <span className="active-dot" />}
          </button>

          {/* 5. Status */}
          <button
            type="button"
            className={`mobile-action-btn ${isStatusActive ? 'is-filtered' : ''}`}
            onClick={() => onOpenFilterType('status')}
            title="Filter by Status"
          >
            <CheckCircle2 size={13} />
            <span>
              Status{isStatusActive ? ` (${statusCount})` : ''}
            </span>
            {isStatusActive && <span className="active-dot" />}
          </button>
        </div>
      )}

      {/* Places Count Label & Map/List Toggle (Only on Explorer view) */}
      {activeNav === 'explorer' && (
        <div className="mobile-count-bar">
          <span className="mobile-count-text">Displaying {totalPlacesCount} places</span>
          {onToggleViewMode && (
            <button
              type="button"
              className="mobile-view-toggle-btn"
              onClick={onToggleViewMode}
              title={viewMode === 'map' ? 'Switch to List view' : 'Switch to Map view'}
              aria-label={viewMode === 'map' ? 'Switch to List view' : 'Switch to Map view'}
            >
              {viewMode === 'map' ? (
                <>
                  <List size={13} />
                  <span>List</span>
                </>
              ) : (
                <>
                  <Map size={13} />
                  <span>Map</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
