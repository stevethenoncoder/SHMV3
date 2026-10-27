import React, { useEffect, useState, useMemo } from 'react';
import { fetchAllFeeds } from './data/fetchFeeds.js';
import { normaliseConfigs } from './data/normaliseConfig.js';
import { normaliseItems } from './data/normaliseItems.js';
import { getProjectData } from './data/projectDataService.js';
import { filterItems, sortItems } from './utils/filterAndSort.js';

// Desktop Components
import DesktopHeader from './components/DesktopHeader/DesktopHeader.jsx';
import FilterSidebar from './components/FilterSidebar/FilterSidebar.jsx';
import ResultsToolbar from './components/ResultsToolbar/ResultsToolbar.jsx';
import GridCard from './components/GridCard/GridCard.jsx';
import DesktopListCard from './components/DesktopListCard/DesktopListCard.jsx';
import MapExplorer from './components/MapExplorer/MapExplorer.jsx';
import Pagination from './components/Pagination/Pagination.jsx';

// Mobile Components
import MobileHeaderToolbar from './components/MobileHeaderToolbar/MobileHeaderToolbar.jsx';
import MobileListCard from './components/MobileListCard/MobileListCard.jsx';
import MobileBottomNav from './components/MobileBottomNav/MobileBottomNav.jsx';
import MobileFilterSheet from './components/MobileFilterSheet/MobileFilterSheet.jsx';
import MobileSortSheet from './components/MobileSortSheet/MobileSortSheet.jsx';

// Detail Page & Route Pages
import PlaceDetailPage from './components/PlaceDetailPage/PlaceDetailPage.jsx';
import StatsPage from './components/StatsPage/StatsPage.jsx';
import PlaceholderPage from './components/PlaceholderPage/PlaceholderPage.jsx';
import DimensionIndexPage from './components/DimensionIndexPage/DimensionIndexPage.jsx';
import DimensionDetailPage from './components/DimensionDetailPage/DimensionDetailPage.jsx';
import { normaliseLocationMetadata, normaliseCategoryMetadata, buildMetadataKey } from './data/normaliseMetadata.js';
import { generatePlaceSlug } from './utils/formatUtils.js';
import { calculateTargetMatrixStats } from './utils/statsCalculations.js';
import { getStatusStyle } from './utils/statusColors.js';

import { RefreshCw, AlertCircle, MapPin, Map, List } from 'lucide-react';
import './App.css';

// Default filter and sort constants: Blogged (Complete) is active by default, sorted by Date desc
const DEFAULT_FILTER_STATE = {
  search: '',
  favouritesOnly: false,
  statuses: ['Blogged'],
  locations: [],
  categories: [],
  minRating: null,
  startDate: null,
  endDate: null,
};

const DEFAULT_SORT_OPTION = 'date_desc';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Raw data from feeds
  const [configs, setConfigs] = useState([]);
  const [configMap, setConfigMap] = useState({});
  const [allItems, setAllItems] = useState([]);
  const [locationMetadataMap, setLocationMetadataMap] = useState({});
  const [categoryMetadataMap, setCategoryMetadataMap] = useState({});

  // Project & Route State
  const [activeProject, setActiveProject] = useState('England');
  const [activeNav, setActiveNav] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/location') || path.startsWith('/county') || path.startsWith('/borough')) return 'locations';
    if (path.startsWith('/category')) return 'categories';
    if (path.startsWith('/stats')) return 'stats';
    return 'explorer';
  });

  // Dimension Detail State: tracks selected entity when on Location or Category detail
  // e.g. /location/Bristol or /category/Architecture
  const [selectedLocation, setSelectedLocation] = useState(() => {
    const path = window.location.pathname;
    const match = path.match(/\/(?:location|county|borough)\/([^/]+)/);
    if (match && match[1]) return decodeURIComponent(match[1]);
    const params = new URLSearchParams(window.location.search);
    return params.get('location') || null;
  });

  const [selectedCategory, setSelectedCategory] = useState(() => {
    const path = window.location.pathname;
    const match = path.match(/\/category\/([^/]+)/);
    if (match && match[1]) return decodeURIComponent(match[1]);
    const params = new URLSearchParams(window.location.search);
    return params.get('category') || null;
  });

  // View Mode: 'grid' (Milestone 1), 'list', 'map'
  const [viewMode, setViewMode] = useState('grid');
  const [showMapLabels, setShowMapLabels] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768));

  // Shared Filter State: default filter has 'Blogged' (Complete) selected
  const [filterState, setFilterState] = useState(DEFAULT_FILTER_STATE);

  // Sort & Pagination: default sort is Date (most recent)
  const [sortOption, setSortOption] = useState(DEFAULT_SORT_OPTION);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(18);

  // Map Selection State
  const [selectedMapPlace, setSelectedMapPlace] = useState(null);

  // Detail Page State: tracked by deterministic slug in URL path /place/:slug or query param
  const [currentSlug, setCurrentSlug] = useState(() => {
    // Read from pathname /place/:slug or ?place=:slug
    const path = window.location.pathname;
    const match = path.match(/\/place\/([^/]+)/);
    if (match && match[1]) return decodeURIComponent(match[1]);
    const params = new URLSearchParams(window.location.search);
    return params.get('place') || null;
  });

  // Return context for PlaceDetailPage back navigation
  const [detailReturnContext, setDetailReturnContext] = useState(null);

  // Ensure document body and html touch scrolling are completely unrestricted
  useEffect(() => {
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    document.documentElement.style.overflow = '';
    document.documentElement.style.touchAction = '';
  }, []);

  // Mobile Overlays
  const [activeMobileFilter, setActiveMobileFilter] = useState(null); // 'favorites' | 'category' | 'location' | 'status' | null
  const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);

  // Ingest feeds
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const {
        rawConfigRows,
        rawMainRows,
        rawLocationMetadataRows,
        rawCategoryMetadataRows,
      } = await fetchAllFeeds();

      const { configs: parsedConfigs, configMap: parsedMap } = normaliseConfigs(rawConfigRows);
      const parsedItems = normaliseItems(rawMainRows);
      const parsedLocMeta = normaliseLocationMetadata(rawLocationMetadataRows || []);
      const parsedCatMeta = normaliseCategoryMetadata(rawCategoryMetadataRows || []);

      setConfigs(parsedConfigs);
      setConfigMap(parsedMap);
      setAllItems(parsedItems);
      setLocationMetadataMap(parsedLocMeta);
      setCategoryMetadataMap(parsedCatMeta);

      // If a place slug is already in the URL, match it to find its project
      let matchedProject = null;
      if (currentSlug) {
        const matchedItem = parsedItems.find((it) => generatePlaceSlug(it) === currentSlug);
        if (matchedItem && matchedItem.projectKey && parsedMap[matchedItem.projectKey]) {
          matchedProject = matchedItem.projectKey;
        }
      }

      if (matchedProject) {
        setActiveProject(matchedProject);
      } else if (parsedMap['England']) {
        setActiveProject('England');
      } else if (parsedConfigs.length > 0) {
        setActiveProject(parsedConfigs[0].projectKey);
      }
    } catch (err) {
      console.error('Failed to load feeds:', err);
      setError(err.message || 'Error loading live data feeds');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for browser back / forward navigation
    const handlePopState = () => {
      const path = window.location.pathname;

      const placeMatch = path.match(/\/place\/([^/]+)/);
      const slugFromPath = placeMatch && placeMatch[1] ? decodeURIComponent(placeMatch[1]) : null;
      const params = new URLSearchParams(window.location.search);
      const slugFromQuery = params.get('place') || null;
      setCurrentSlug(slugFromPath || slugFromQuery);

      const locMatch = path.match(/\/(?:location|county|borough)\/([^/]+)/);
      const locFromPath = locMatch && locMatch[1] ? decodeURIComponent(locMatch[1]) : null;
      setSelectedLocation(locFromPath || params.get('location') || null);

      const catMatch = path.match(/\/category\/([^/]+)/);
      const catFromPath = catMatch && catMatch[1] ? decodeURIComponent(catMatch[1]) : null;
      setSelectedCategory(catFromPath || params.get('category') || null);

      if (path.startsWith('/location') || path.startsWith('/county') || path.startsWith('/borough')) {
        setActiveNav('locations');
      } else if (path.startsWith('/category')) {
        setActiveNav('categories');
      } else if (path.startsWith('/stats')) {
        setActiveNav('stats');
      } else if (!slugFromPath && !slugFromQuery) {
        setActiveNav('explorer');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // When active project changes, reset page to 1, clear place detail, and reset to default project filter & sort
  const handleSelectProject = (projectKey) => {
    setActiveProject(projectKey);
    setCurrentPage(1);
    setSelectedMapPlace(null);
    setSelectedLocation(null);
    setSelectedCategory(null);
    if (currentSlug) {
      setCurrentSlug(null);
    }
    window.history.pushState(null, '', '/');
    setFilterState(DEFAULT_FILTER_STATE);
    setSortOption(DEFAULT_SORT_OPTION);
  };

  // Navigate to Place Detail
  const handleOpenDetail = (item) => {
    if (!item) return;
    const slug = generatePlaceSlug(item);

    // Save where the user was before opening the detail page
    if (activeNav === 'locations' && selectedLocation) {
      setDetailReturnContext({
        nav: 'locations',
        location: selectedLocation,
        category: null,
        url: `/location/${encodeURIComponent(selectedLocation)}`,
        label: `Back to ${selectedLocation}`,
      });
    } else if (activeNav === 'categories' && selectedCategory) {
      setDetailReturnContext({
        nav: 'categories',
        location: null,
        category: selectedCategory,
        url: `/category/${encodeURIComponent(selectedCategory)}`,
        label: `Back to ${selectedCategory}`,
      });
    } else if (activeNav === 'stats') {
      setDetailReturnContext({
        nav: 'stats',
        location: null,
        category: null,
        url: '/stats',
        label: 'Back to Stats',
      });
    } else {
      setDetailReturnContext({
        nav: 'explorer',
        location: null,
        category: null,
        url: '/',
        label: 'Back to Explorer',
      });
    }

    setCurrentSlug(slug);
    // Push state cleanly to URL
    window.history.pushState({ slug }, '', `/place/${slug}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Back from Place Detail: returns to wherever the user started from
  const handleBackFromDetail = () => {
    setCurrentSlug(null);

    if (detailReturnContext) {
      const { nav, location, category, url } = detailReturnContext;
      setActiveNav(nav);
      setSelectedLocation(location || null);
      setSelectedCategory(category || null);
      window.history.pushState(null, '', url);
      setDetailReturnContext(null);
    } else {
      // Default to Explorer if no return context was saved
      setActiveNav('explorer');
      setSelectedLocation(null);
      setSelectedCategory(null);
      window.history.pushState(null, '', '/');
    }
  };

  // Switch top-level navigation tabs (Blogs, Stats, Locations, Categories, About)
  const handleSelectNav = (navKey) => {
    setActiveNav(navKey);
    setSelectedLocation(null);
    setSelectedCategory(null);
    if (currentSlug) {
      setCurrentSlug(null);
    }
    if (navKey === 'explorer') {
      window.history.pushState(null, '', '/');
    } else if (navKey === 'stats') {
      window.history.pushState(null, '', '/stats');
    } else if (navKey === 'locations') {
      window.history.pushState(null, '', '/locations');
    } else if (navKey === 'categories') {
      window.history.pushState(null, '', '/categories');
    }
  };

  // Navigate to Location Detail
  const handleSelectLocation = (locName) => {
    setSelectedLocation(locName);
    setSelectedCategory(null);
    setCurrentSlug(null);
    window.history.pushState({ location: locName }, '', `/location/${encodeURIComponent(locName)}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Navigate to Category Detail
  const handleSelectCategory = (catName) => {
    setSelectedCategory(catName);
    setSelectedLocation(null);
    setCurrentSlug(null);
    window.history.pushState({ category: catName }, '', `/category/${encodeURIComponent(catName)}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // "View all entries" in explorer scoped to that location or category
  const handleViewAllFilteredByDimension = (dimType, name) => {
    setActiveNav('explorer');
    setViewMode('map');
    setShowMapLabels(true);
    setSelectedMapPlace(null);
    setSelectedLocation(null);
    setSelectedCategory(null);
    setCurrentSlug(null);
    window.history.pushState(null, '', '/');

    if (dimType === 'location') {
      setFilterState({
        ...DEFAULT_FILTER_STATE,
        statuses: [], // show all statuses so user sees all entries
        locations: [name],
      });
    } else {
      setFilterState({
        ...DEFAULT_FILTER_STATE,
        statuses: [],
        categories: [name],
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeConfig = configMap[activeProject] || null;

  // Derive project-scoped dataset
  const projectData = useMemo(() => {
    if (!activeConfig) return null;
    return getProjectData(allItems, activeProject, activeConfig);
  }, [allItems, activeProject, activeConfig]);

  // Overall Target Matrix statistics for Journey Status indicator on Explorer
  const projectTargetStats = useMemo(() => {
    if (!projectData) return null;
    return calculateTargetMatrixStats(
      projectData.rawProjectRows,
      projectData.allProjectLocations || [],
      projectData.allProjectCategories || [],
      {} // Full project baseline
    );
  }, [projectData]);

  // Resolve detail place item if currentSlug is present
  const selectedDetailItem = useMemo(() => {
    if (!currentSlug || !allItems.length) return null;
    return allItems.find(
      (it) => it.projectKey === activeProject && generatePlaceSlug(it) === currentSlug
    ) || allItems.find((it) => generatePlaceSlug(it) === currentSlug) || null;
  }, [currentSlug, allItems, activeProject]);

  // Faceted dynamic filter option counts:
  // For each filter group (status, location, category, rating), calculate counts
  // by filtering items against ALL active filters EXCEPT the current group itself.
  // This allows the user to see how many matching places remain in other categories/locations
  // without extinguishing their current selection.
  const { statusCounts, locationCounts, categoryCounts, ratingCounts } = useMemo(() => {
    const sCounts = {};
    const lCounts = {};
    const cCounts = {};
    const rCounts = { 5: 0, 4: 0, 3: 0 };

    if (!projectData || !projectData.explorerItems) {
      return { statusCounts: sCounts, locationCounts: lCounts, categoryCounts: cCounts, ratingCounts: rCounts };
    }

    const allItems = projectData.explorerItems;

    // 1. Status counts: filter by all criteria except statuses
    const itemsExcludingStatus = filterItems(allItems, { ...filterState, statuses: [] });
    for (const item of itemsExcludingStatus) {
      if (item.status) {
        sCounts[item.status] = (sCounts[item.status] || 0) + 1;
      }
    }

    // 2. Location counts: filter by all criteria except locations
    const itemsExcludingLocation = filterItems(allItems, { ...filterState, locations: [] });
    for (const item of itemsExcludingLocation) {
      if (item.location) {
        lCounts[item.location] = (lCounts[item.location] || 0) + 1;
      }
    }

    // 3. Category counts: filter by all criteria except categories
    const itemsExcludingCategory = filterItems(allItems, { ...filterState, categories: [] });
    for (const item of itemsExcludingCategory) {
      if (item.category) {
        cCounts[item.category] = (cCounts[item.category] || 0) + 1;
      }
    }

    // 4. Rating counts: filter by all criteria except minRating
    const itemsExcludingRating = filterItems(allItems, { ...filterState, minRating: null });
    for (const item of itemsExcludingRating) {
      if (item.rating !== null) {
        if (item.rating >= 5) rCounts[5]++;
        if (item.rating >= 4) rCounts[4]++;
        if (item.rating >= 3) rCounts[3]++;
      }
    }

    return { statusCounts: sCounts, locationCounts: lCounts, categoryCounts: cCounts, ratingCounts: rCounts };
  }, [projectData, filterState]);

  // Filter and sort eligible items
  const filteredItems = useMemo(() => {
    if (!projectData) return [];
    const filtered = filterItems(projectData.explorerItems, filterState);
    return sortItems(filtered, sortOption);
  }, [projectData, filterState, sortOption]);

  // Pagination slice
  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Filter updates
  const handleUpdateFilter = (key, val) => {
    setFilterState((prev) => ({ ...prev, [key]: val }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilterState({
      search: '',
      favouritesOnly: false,
      statuses: [],
      locations: [],
      categories: [],
      minRating: null,
      startDate: null,
      endDate: null,
    });
    setCurrentPage(1);
  };

  // Toggle single item from card click
  const handleToggleCardChip = (type, val) => {
    if (!val) return;
    const currentList = filterState[type] || [];
    const updated = currentList.includes(val)
      ? currentList.filter((x) => x !== val)
      : [...currentList, val];
    handleUpdateFilter(type, updated);
  };

  const activeFilterCount =
    (filterState.search ? 1 : 0) +
    (filterState.favouritesOnly ? 1 : 0) +
    filterState.statuses.length +
    filterState.locations.length +
    filterState.categories.length +
    (filterState.minRating !== null ? 1 : 0) +
    (filterState.startDate || filterState.endDate ? 1 : 0);

  if (loading) {
    return (
      <div className="app-loading-screen">
        <RefreshCw size={28} className="spin-icon" />
        <p>Loading ABC Public v2 explorer...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-error-screen">
        <div className="error-dialog">
          <AlertCircle size={32} color="#ef4444" />
          <h2>Failed to load live data</h2>
          <p>{error}</p>
          <button type="button" className="retry-btn" onClick={loadData}>
            Retry Feeds
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* 1. Desktop Header */}
      <DesktopHeader
        projects={configs}
        activeProject={activeProject}
        onSelectProject={handleSelectProject}
        activeNav={currentSlug ? null : activeNav}
        onSelectNav={handleSelectNav}
        locationLabelPlural={activeConfig ? activeConfig.locationLabelPlural : 'Locations'}
      />

      {/* 2. Mobile Header & Controls Toolbar */}
      {!currentSlug && (
        <MobileHeaderToolbar
          projects={configs}
          activeProject={activeProject}
          onSelectProject={handleSelectProject}
          activeConfig={activeConfig}
          totalPlacesCount={filteredItems.length}
          onOpenSort={() => setIsMobileSortOpen(true)}
          onOpenFilterType={(type) => setActiveMobileFilter(type)}
          filterState={filterState}
          locationLabel={activeConfig ? activeConfig.locationLabel : 'County'}
          activeNav={activeNav}
          viewMode={viewMode}
          onToggleViewMode={() => {
            setViewMode((prev) => {
              if (prev === 'map') {
                return 'grid';
              } else {
                setSelectedMapPlace(null);
                setShowMapLabels(true);
                return 'map';
              }
            });
          }}
        />
      )}

      {/* 3. Main Content Area */}
      <main className="main-content">
        {currentSlug ? (
          <PlaceDetailPage
            item={selectedDetailItem}
            onBack={handleBackFromDetail}
            backLabel={detailReturnContext ? detailReturnContext.label : 'Back to Explorer'}
            activeConfig={activeConfig}
          />
        ) : activeNav === 'locations' && selectedLocation ? (
          <DimensionDetailPage
            dimension="location"
            entityName={selectedLocation}
            activeConfig={activeConfig}
            metadata={locationMetadataMap[buildMetadataKey(activeProject, selectedLocation)] || null}
            projectData={projectData}
            onBack={() => {
              setSelectedLocation(null);
              window.history.pushState(null, '', '/locations');
            }}
            onOpenPlace={handleOpenDetail}
            onViewAllFiltered={() => handleViewAllFilteredByDimension('location', selectedLocation)}
          />
        ) : activeNav === 'locations' ? (
          <DimensionIndexPage
            dimension="location"
            activeConfig={activeConfig}
            metadataMap={locationMetadataMap}
            projectData={projectData}
            onSelectEntity={handleSelectLocation}
          />
        ) : activeNav === 'categories' && selectedCategory ? (
          <DimensionDetailPage
            dimension="category"
            entityName={selectedCategory}
            activeConfig={activeConfig}
            metadata={categoryMetadataMap[buildMetadataKey(activeProject, selectedCategory)] || null}
            projectData={projectData}
            onBack={() => {
              setSelectedCategory(null);
              window.history.pushState(null, '', '/categories');
            }}
            onOpenPlace={handleOpenDetail}
            onViewAllFiltered={() => handleViewAllFilteredByDimension('category', selectedCategory)}
          />
        ) : activeNav === 'categories' ? (
          <DimensionIndexPage
            dimension="category"
            activeConfig={activeConfig}
            metadataMap={categoryMetadataMap}
            projectData={projectData}
            onSelectEntity={handleSelectCategory}
          />
        ) : activeNav === 'about' ? (
          <PlaceholderPage
            title="About ABC Public v2"
            description="About page information."
            onBackToExplorer={() => setActiveNav('explorer')}
          />
        ) : (
          <div className="explorer-page-container">
            {/* Desktop Hero Title & Subheading + Journey Status Lozenge (Explorer view only) */}
            {activeNav === 'explorer' && (
              <section className="desktop-project-hero">
                <div className="hero-titles-block">
                  <h1 className="hero-title">{activeConfig ? activeConfig.projectTitle : ''}</h1>
                  <p className="hero-subheading">{activeConfig ? activeConfig.projectSubHeading : ''}</p>
                </div>

                {/* Journey Status Visual Indicator Lozenge */}
                {projectTargetStats && (
                  <div
                    className="hero-journey-lozenge"
                    title={`Journey Status: ${projectTargetStats.counts['Blogged']} Blogged, ${projectTargetStats.counts['Visited']} Visited, ${projectTargetStats.counts['Planned']} Planned, ${projectTargetStats.counts['Not planned']} Not planned of ${projectTargetStats.target} target`}
                  >
                    <span className="hero-journey-label">Journey Status</span>
                    <div className="hero-journey-bar" role="progressbar" aria-label="Journey status distribution">
                      {projectTargetStats.percentages['Not planned'] > 0 && (
                        <div
                          className="hero-journey-segment"
                          style={{
                            width: `${projectTargetStats.percentages['Not planned']}%`,
                            backgroundColor: getStatusStyle('Not planned').dotBg,
                          }}
                        />
                      )}
                      {projectTargetStats.percentages['Planned'] > 0 && (
                        <div
                          className="hero-journey-segment"
                          style={{
                            width: `${projectTargetStats.percentages['Planned']}%`,
                            backgroundColor: getStatusStyle('Planned').dotBg,
                          }}
                        />
                      )}
                      {projectTargetStats.percentages['Visited'] > 0 && (
                        <div
                          className="hero-journey-segment"
                          style={{
                            width: `${projectTargetStats.percentages['Visited']}%`,
                            backgroundColor: getStatusStyle('Visited').dotBg,
                          }}
                        />
                      )}
                      {projectTargetStats.percentages['Blogged'] > 0 && (
                        <div
                          className="hero-journey-segment"
                          style={{
                            width: `${projectTargetStats.percentages['Blogged']}%`,
                            backgroundColor: getStatusStyle('Blogged').dotBg,
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Desktop 2-Column Layout */}
            <div className="explorer-body-layout">
              {/* Left Column: Filter Sidebar */}
              <FilterSidebar
                filterState={filterState}
                onUpdateFilter={handleUpdateFilter}
                onClearFilters={handleClearFilters}
                availableStatuses={projectData ? projectData.statuses : []}
                availableLocations={projectData ? projectData.locations : []}
                availableCategories={projectData ? projectData.categories : []}
                locationLabelPlural={activeConfig ? activeConfig.locationLabelPlural : 'Locations'}
                statusCounts={statusCounts}
                locationCounts={locationCounts}
                categoryCounts={categoryCounts}
                ratingCounts={ratingCounts}
              />

              {/* Right Column: Results Area / Stats Content */}
              <div className="results-column">
                {activeNav === 'stats' ? (
                  <StatsPage
                    projectData={projectData}
                    activeConfig={activeConfig}
                    filterState={filterState}
                    applicableActualPlaces={filteredItems}
                  />
                ) : (
                  <>
                    <ResultsToolbar
                      totalPlacesCount={filteredItems.length}
                      filterState={filterState}
                      onRemoveFilter={handleUpdateFilter}
                      onClearFilters={handleClearFilters}
                      sortOption={sortOption}
                      onSortChange={setSortOption}
                      pageSize={pageSize}
                      onPageSizeChange={(newSize) => {
                        setPageSize(newSize);
                        setCurrentPage(1);
                      }}
                      viewMode={viewMode}
                      onViewModeChange={(m) => {
                        if (m === 'map') setSelectedMapPlace(null);
                        setViewMode(m);
                      }}
                      locationLabel={activeConfig ? activeConfig.locationLabel : 'County'}
                      locationLabelPlural={activeConfig ? activeConfig.locationLabelPlural : 'Locations'}
                    />

                {/* Empty State */}
                {filteredItems.length === 0 ? (
                  <div className="empty-results-box">
                    <MapPin size={36} className="empty-pin-icon" />
                    <h3>No places match these filters</h3>
                    <p>Try clearing some filters or searching for a different keyword.</p>
                    <button type="button" className="btn-clear" onClick={handleClearFilters}>
                      Clear all filters
                    </button>
                  </div>
                ) : viewMode === 'map' ? (
                  <div className="map-view-container">
                    <MapExplorer
                      items={filteredItems}
                      selectedItem={selectedMapPlace}
                      onSelectItem={setSelectedMapPlace}
                      onToggleStatusFilter={(st) => handleToggleCardChip('statuses', st)}
                      onToggleLocationFilter={(loc) => handleToggleCardChip('locations', loc)}
                      onToggleCategoryFilter={(cat) => handleToggleCardChip('categories', cat)}
                      onSelectDetail={handleOpenDetail}
                      activeConfig={activeConfig}
                      showLabels={showMapLabels}
                      onToggleShowLabels={setShowMapLabels}
                      isMobile={typeof window !== 'undefined' && window.innerWidth < 768}
                    />
                  </div>
                ) : (
                  <>
                    {/* Desktop Results (Grid or List based on viewMode) */}
                    <div className="desktop-results-wrapper">
                      {viewMode === 'grid' ? (
                        <div className="places-grid">
                          {paginatedItems.map((item) => (
                            <GridCard
                              key={item.id}
                              item={item}
                              config={activeConfig}
                              onToggleStatusFilter={(st) => handleToggleCardChip('statuses', st)}
                              onToggleLocationFilter={(loc) => handleToggleCardChip('locations', loc)}
                              onToggleCategoryFilter={(cat) => handleToggleCardChip('categories', cat)}
                              onSelectDetail={handleOpenDetail}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="places-desktop-list">
                          {paginatedItems.map((item) => (
                            <DesktopListCard
                              key={item.id}
                              item={item}
                              config={activeConfig}
                              onToggleStatusFilter={(st) => handleToggleCardChip('statuses', st)}
                              onToggleLocationFilter={(loc) => handleToggleCardChip('locations', loc)}
                              onToggleCategoryFilter={(cat) => handleToggleCardChip('categories', cat)}
                              onSelectDetail={handleOpenDetail}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Mobile Results List (hidden on desktop) */}
                    <div className="mobile-list-wrapper">
                      <div className="places-list">
                        {paginatedItems.map((item) => (
                          <MobileListCard
                            key={item.id}
                            item={item}
                            onToggleStatusFilter={(st) => handleToggleCardChip('statuses', st)}
                            onToggleLocationFilter={(loc) => handleToggleCardChip('locations', loc)}
                            onToggleCategoryFilter={(cat) => handleToggleCardChip('categories', cat)}
                            onSelectDetail={handleOpenDetail}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Pagination */}
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      pageSize={pageSize}
                      totalItems={filteredItems.length}
                      onPageChange={setCurrentPage}
                      onPageSizeChange={(newSize) => {
                        setPageSize(newSize);
                        setCurrentPage(1);
                      }}
                    />
                  </>
                )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 4. Mobile Bottom Sheet Overlays */}
      <MobileFilterSheet
        isOpen={Boolean(activeMobileFilter)}
        filterType={activeMobileFilter}
        onClose={() => setActiveMobileFilter(null)}
        filterState={filterState}
        onApplyFilters={(draft) => {
          setFilterState(draft);
          setCurrentPage(1);
        }}
        explorerItems={projectData ? projectData.explorerItems : []}
        availableStatuses={projectData ? projectData.statuses : []}
        availableLocations={projectData ? projectData.locations : []}
        availableCategories={projectData ? projectData.categories : []}
        locationLabel={activeConfig ? activeConfig.locationLabel : 'County'}
        locationLabelPlural={activeConfig ? activeConfig.locationLabelPlural : 'Locations'}
        statusCounts={statusCounts}
        locationCounts={locationCounts}
        categoryCounts={categoryCounts}
      />

      <MobileSortSheet
        isOpen={isMobileSortOpen}
        onClose={() => setIsMobileSortOpen(false)}
        sortOption={sortOption}
        onSelectSort={(opt) => {
          setSortOption(opt);
          setCurrentPage(1);
        }}
        locationLabel={activeConfig ? activeConfig.locationLabel : 'Location'}
      />

      {/* 5. Mobile Fixed Bottom Navigation */}
      <MobileBottomNav
        activeNav={currentSlug ? null : activeNav}
        onSelectNav={handleSelectNav}
        locationLabel={activeConfig ? activeConfig.locationLabel : 'Location'}
        locationLabelPlural={activeConfig ? activeConfig.locationLabelPlural : 'Counties'}
      />
    </div>
  );
}
