import React, { useState, useEffect, useMemo } from 'react';
import {
  calculateTargetMatrixStats,
  calculateActualPlaceStats,
  calculateProgressByLocation,
  calculateProgressByCategory,
  calculateActivityTimeline,
} from '../../utils/statsCalculations.js';
import { getStatusStyle } from '../../utils/statusColors.js';
import {
  Target,
  MapPin,
  Tag,
  Clock,
  Compass,
  CheckCircle,
  Calendar,
  Star,
  Heart,
  Sparkles,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  BarChart2,
  TrendingUp,
  Award,
} from 'lucide-react';
import './StatsPage.css';

export default function StatsPage({
  projectData,
  activeConfig,
  filterState,
  applicableActualPlaces = [],
}) {
  const [timelineMode, setTimelineMode] = useState('monthly'); // 'monthly' | 'cumulative'
  const [locationSort, setLocationSort] = useState({ column: 'ratingScore', direction: 'desc' });
  const [categorySort, setCategorySort] = useState({ column: 'ratingScore', direction: 'desc' });

  // Detect mobile viewport (< 768px)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Location naming (Counties, Boroughs, etc.)
  const locLabelSingular = activeConfig?.locationLabel || 'Location';
  const locLabelPlural = activeConfig?.locationLabelPlural || 'Locations';

  // Effective matrix filters & places: on mobile, KPI does NOT respect filters (based on all project data)
  const effectiveScopeFilters = useMemo(() => {
    if (isMobile) return { locations: [], categories: [] };
    return {
      locations: filterState?.locations || [],
      categories: filterState?.categories || [],
    };
  }, [isMobile, filterState?.locations, filterState?.categories]);

  const effectivePlaces = useMemo(() => {
    if (isMobile) return projectData?.explorerItems || [];
    return applicableActualPlaces;
  }, [isMobile, projectData?.explorerItems, applicableActualPlaces]);

  // 1. Target Matrix Stats (unfiltered on mobile; scoped on desktop by selected locations/categories)
  const targetMatrixStats = useMemo(() => {
    if (!projectData) return null;
    const { rawProjectRows, allProjectLocations, allProjectCategories } = projectData;
    return calculateTargetMatrixStats(
      rawProjectRows,
      allProjectLocations || [],
      allProjectCategories || [],
      effectiveScopeFilters
    );
  }, [projectData, effectiveScopeFilters]);

  // 2. Actual Places & Rating Summary
  const actualStats = useMemo(() => {
    return calculateActualPlaceStats(effectivePlaces);
  }, [effectivePlaces]);

  // 3. Activity Timeline
  const timelineData = useMemo(() => {
    return calculateActivityTimeline(effectivePlaces);
  }, [effectivePlaces]);

  // 4. Progress by Location
  const locationRows = useMemo(() => {
    if (!projectData || !targetMatrixStats) return [];
    return calculateProgressByLocation(
      projectData.rawProjectRows,
      targetMatrixStats.scopedLocations,
      targetMatrixStats.scopedCategories,
      effectivePlaces
    );
  }, [projectData, targetMatrixStats, effectivePlaces]);

  // 5. Progress by Category
  const categoryRows = useMemo(() => {
    if (!projectData || !targetMatrixStats) return [];
    return calculateProgressByCategory(
      projectData.rawProjectRows,
      targetMatrixStats.scopedLocations,
      targetMatrixStats.scopedCategories,
      effectivePlaces
    );
  }, [projectData, targetMatrixStats, effectivePlaces]);

  // Sorting handlers
  const handleSortLocation = (column) => {
    setLocationSort((prev) => {
      if (prev.column === column) {
        return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { column, direction: column === 'name' ? 'asc' : 'desc' };
    });
  };

  const handleSortCategory = (column) => {
    setCategorySort((prev) => {
      if (prev.column === column) {
        return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { column, direction: column === 'name' ? 'asc' : 'desc' };
    });
  };

  const sortTableRows = (rows, sortConfig) => {
    const { column, direction } = sortConfig;
    const multiplier = direction === 'asc' ? 1 : -1;

    return [...rows].sort((a, b) => {
      let valA = a[column];
      let valB = b[column];

      // Special handling for null ratings/scores in descending sort
      if (column === 'ratingScore') {
        if (valA === null && valB === null) return 0;
        if (valA === null) return 1;
        if (valB === null) return -1;
      }

      if (typeof valA === 'string') {
        return multiplier * valA.localeCompare(valB);
      }
      return multiplier * ((valA || 0) - (valB || 0));
    });
  };

  const sortedLocationRows = useMemo(
    () => sortTableRows(locationRows, locationSort),
    [locationRows, locationSort]
  );

  const sortedCategoryRows = useMemo(
    () => sortTableRows(categoryRows, categorySort),
    [categoryRows, categorySort]
  );

  if (!projectData || !targetMatrixStats) {
    return (
      <div className="stats-page-loading">
        <p>Loading project statistics...</p>
      </div>
    );
  }

  // Journey status styling tokens
  const notPlannedStyle = getStatusStyle('Not planned');
  const plannedStyle = getStatusStyle('Planned');
  const visitedStyle = getStatusStyle('Visited');
  const bloggedStyle = getStatusStyle('Blogged');

  const { target, locationsCount, categoriesCount, counts, percentages } = targetMatrixStats;

  // Max value for timeline chart bars
  const maxTimelineVal = timelineData.reduce((max, d) => {
    const val = timelineMode === 'monthly' ? d.total : d.cumulativeTotal;
    return val > max ? val : max;
  }, 0) || 1;

  const renderSortIndicator = (currentCol, targetCol, direction) => {
    if (currentCol !== targetCol) {
      return <ArrowUpDown size={12} className="sort-icon-idle" />;
    }
    return direction === 'asc' ? (
      <ArrowUp size={12} className="sort-icon-active" />
    ) : (
      <ArrowDown size={12} className="sort-icon-active" />
    );
  };

  const isMatrixFiltered = isMobile
    ? false
    : Boolean(
        (filterState?.locations && filterState.locations.length > 0) ||
        (filterState?.categories && filterState.categories.length > 0)
      );

  return (
    <div className="stats-page-container">
      {/* 1. Header Banner */}
      <header className="stats-header-banner">
        <div className="stats-header-text">
          <h1 className="stats-main-title">ABC Statistics</h1>
        </div>
        <div className="stats-project-badge">
          <span className="stats-badge-project">Project: {projectData.projectKey}</span>
          <span className="stats-badge-dim">
            {locationsCount} {locLabelPlural.toLowerCase()} × {categoriesCount} categories
          </span>
        </div>
      </header>

      {/* 2. Project Overview (Target Matrix) */}
      <section className="stats-section-overview">
        <div className="stats-section-title-row">
          <div className="stats-title-with-icon">
            <Target size={18} className="title-icon-primary" />
            <h2 className="stats-section-title">
              {isMatrixFiltered ? 'Target Matrix [Filtered]' : 'Project Overview (Target Matrix)'}
            </h2>
          </div>
        </div>

        {/* Overview Metric Cards (Compact 2-line cards, all 9 on one line) */}
        <div className="stats-cards-grid">
          {/* Target */}
          <div className="stats-metric-card highlight-target">
            <span className="metric-card-label">Target</span>
            <div className="metric-card-value">{target.toLocaleString()}</div>
          </div>

          {/* Locations */}
          <div className="stats-metric-card">
            <span className="metric-card-label">{locLabelPlural}</span>
            <div className="metric-card-value">{locationsCount}</div>
          </div>

          {/* Categories */}
          <div className="stats-metric-card">
            <span className="metric-card-label">Categories</span>
            <div className="metric-card-value">{categoriesCount}</div>
          </div>

          {/* Not planned */}
          <div className="stats-metric-card">
            <div className="metric-card-label-with-dot">
              <span className="status-dot-indicator" style={{ backgroundColor: notPlannedStyle.dotBg }} />
              <span className="metric-card-label">Not planned</span>
            </div>
            <div className="metric-card-value">{(counts['Not planned'] || 0).toLocaleString()}</div>
          </div>

          {/* Planned */}
          <div className="stats-metric-card">
            <div className="metric-card-label-with-dot">
              <span className="status-dot-indicator" style={{ backgroundColor: plannedStyle.dotBg }} />
              <span className="metric-card-label">Planned</span>
            </div>
            <div className="metric-card-value">{(counts['Planned'] || 0).toLocaleString()}</div>
          </div>

          {/* Visited */}
          <div className="stats-metric-card">
            <div className="metric-card-label-with-dot">
              <span className="status-dot-indicator" style={{ backgroundColor: visitedStyle.dotBg }} />
              <span className="metric-card-label">Visited</span>
            </div>
            <div className="metric-card-value">{(counts['Visited'] || 0).toLocaleString()}</div>
          </div>

          {/* Blogged */}
          <div className="stats-metric-card">
            <div className="metric-card-label-with-dot">
              <span className="status-dot-indicator" style={{ backgroundColor: bloggedStyle.dotBg }} />
              <span className="metric-card-label">Blogged</span>
            </div>
            <div className="metric-card-value">{(counts['Blogged'] || 0).toLocaleString()}</div>
          </div>

          {/* Rating */}
          <div className="stats-metric-card">
            <div className="metric-card-label-with-dot">
              <Star size={12} className="title-icon-amber" />
              <span className="metric-card-label">Rating</span>
            </div>
            <div className="metric-card-value">
              {actualStats.averageRating !== null ? `${actualStats.averageRating.toFixed(1)}★` : '—'}
            </div>
          </div>

          {/* Favourites */}
          <div className="stats-metric-card">
            <div className="metric-card-label-with-dot">
              <Heart size={12} className="heart-icon-metric" fill="#ef4444" color="#ef4444" />
              <span className="metric-card-label">Favourites</span>
            </div>
            <div className="metric-card-value">{actualStats.favouritesCount || 0}</div>
          </div>
        </div>

        {/* 3. Horizontal Stacked Journey Status Bar with Right Key */}
        <div className="journey-status-bar-container">
          <div className="journey-status-label-row">
            <span className="journey-bar-title">Journey Status</span>
            <span className="journey-bar-subtitle">(of {target.toLocaleString()} target combinations)</span>
          </div>

          <div className="journey-bar-and-key-row">
            <div className="journey-stacked-bar" role="progressbar" aria-label="Journey status distribution">
              {percentages['Not planned'] > 0 && (
                <div
                  className="journey-bar-segment"
                  style={{
                    width: `${percentages['Not planned']}%`,
                    backgroundColor: notPlannedStyle.dotBg,
                  }}
                  title={`Not planned: ${counts['Not planned']} (${percentages['Not planned'].toFixed(1)}%)`}
                >
                  {percentages['Not planned'] >= 6 && (
                    <span className="segment-label">{percentages['Not planned'].toFixed(1)}%</span>
                  )}
                </div>
              )}
              {percentages['Planned'] > 0 && (
                <div
                  className="journey-bar-segment"
                  style={{
                    width: `${percentages['Planned']}%`,
                    backgroundColor: plannedStyle.dotBg,
                  }}
                  title={`Planned: ${counts['Planned']} (${percentages['Planned'].toFixed(1)}%)`}
                >
                  {percentages['Planned'] >= 6 && (
                    <span className="segment-label">{percentages['Planned'].toFixed(1)}%</span>
                  )}
                </div>
              )}
              {percentages['Visited'] > 0 && (
                <div
                  className="journey-bar-segment"
                  style={{
                    width: `${percentages['Visited']}%`,
                    backgroundColor: visitedStyle.dotBg,
                  }}
                  title={`Visited: ${counts['Visited']} (${percentages['Visited'].toFixed(1)}%)`}
                >
                  {percentages['Visited'] >= 6 && (
                    <span className="segment-label">{percentages['Visited'].toFixed(1)}%</span>
                  )}
                </div>
              )}
              {percentages['Blogged'] > 0 && (
                <div
                  className="journey-bar-segment"
                  style={{
                    width: `${percentages['Blogged']}%`,
                    backgroundColor: bloggedStyle.dotBg,
                  }}
                  title={`Blogged: ${counts['Blogged']} (${percentages['Blogged'].toFixed(1)}%)`}
                >
                  {percentages['Blogged'] >= 6 && (
                    <span className="segment-label">{percentages['Blogged'].toFixed(1)}%</span>
                  )}
                </div>
              )}
            </div>

            {/* Compact Key on the right */}
            <div className="journey-side-key">
              <div className="journey-key-item">
                <span className="legend-dot" style={{ backgroundColor: bloggedStyle.dotBg }} />
                <span className="legend-name">Blogged</span>
              </div>
              <div className="journey-key-item">
                <span className="legend-dot" style={{ backgroundColor: visitedStyle.dotBg }} />
                <span className="legend-name">Visited</span>
              </div>
              <div className="journey-key-item">
                <span className="legend-dot" style={{ backgroundColor: plannedStyle.dotBg }} />
                <span className="legend-name">Planned</span>
              </div>
              <div className="journey-key-item">
                <span className="legend-dot" style={{ backgroundColor: notPlannedStyle.dotBg }} />
                <span className="legend-name">Not planned</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Activity Timeline (Full width, streamlined) */}
      <section className="stats-section-timeline">
        <div className="stats-card stats-timeline-card">
          <div className="timeline-card-header">
            <div className="timeline-header-titles">
              <div className="stats-title-with-icon">
                <TrendingUp size={18} className="title-icon-primary" />
                <h3 className="stats-card-title">Activity Timeline</h3>
              </div>
            </div>

            {/* Desktop Segmented Toggle */}
            <div className="timeline-toggle-group desktop-only-toggle">
              <button
                type="button"
                className={`timeline-toggle-btn ${timelineMode === 'monthly' ? 'active' : ''}`}
                onClick={() => setTimelineMode('monthly')}
              >
                Monthly Activity
              </button>
              <button
                type="button"
                className={`timeline-toggle-btn ${timelineMode === 'cumulative' ? 'active' : ''}`}
                onClick={() => setTimelineMode('cumulative')}
              >
                Cumulative Journey
              </button>
            </div>

            {/* Mobile Single Swap Button */}
            <button
              type="button"
              className="mobile-timeline-swap-btn"
              onClick={() => setTimelineMode((prev) => (prev === 'monthly' ? 'cumulative' : 'monthly'))}
              title={`Switch to ${timelineMode === 'monthly' ? 'Cumulative' : 'Monthly'} view`}
              aria-label={`Current view: ${timelineMode === 'monthly' ? 'Monthly' : 'Cumulative'}. Tap to swap.`}
            >
              <span>{timelineMode === 'monthly' ? 'Monthly' : 'Cumulative'}</span>
              <ArrowUpDown size={12} />
            </button>
          </div>

          {/* Timeline Visual Chart */}
          <div className="timeline-chart-wrapper">
            {timelineData.length === 0 ? (
              <div className="timeline-empty-state">
                <Calendar size={24} className="empty-icon" />
                <p>No activity records available for this filter selection.</p>
              </div>
            ) : timelineMode === 'cumulative' ? (
              /* Cumulative Journey: Blogged-only line chart squeezing to available width with values */
              <div className="timeline-cumulative-container">
                {(() => {
                  const maxCumVal = Math.max(...timelineData.map((d) => d.cumulativeBlogged), 1);
                  const count = timelineData.length;
                  const svgWidth = 800;
                  const svgHeight = 170;
                  const paddingX = 36;
                  const paddingTop = 26;
                  const paddingBottom = 28;
                  const chartW = svgWidth - paddingX * 2;
                  const chartH = svgHeight - paddingTop - paddingBottom;

                  const points = timelineData.map((d, i) => {
                    const x = paddingX + (count > 1 ? (i / (count - 1)) * chartW : chartW / 2);
                    const y = paddingTop + chartH - (d.cumulativeBlogged / maxCumVal) * chartH;
                    return { x, y, data: d, index: i };
                  });

                  // Build smooth/polyline path
                  const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
                  // Build area path down to baseline
                  const baselineY = paddingTop + chartH;
                  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${baselineY} L ${points[0].x.toFixed(1)} ${baselineY} Z`;

                  // Determine label skip interval for dense timelines so text never overlaps
                  const skipLabels = count > 14 ? Math.ceil(count / 10) : 1;

                  return (
                    <div className="cumulative-fit-wrapper">
                      <svg
                        className="cumulative-line-svg"
                        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                        preserveAspectRatio="none"
                      >
                        <defs>
                          <linearGradient id="bloggedGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                            <stop offset="70%" stopColor="#10b981" stopOpacity="0.12" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {/* Area fill with graduated shadow */}
                        <path d={areaPath} fill="url(#bloggedGrad)" />
                        {/* Baseline line */}
                        <line
                          x1={paddingX}
                          y1={baselineY}
                          x2={svgWidth - paddingX}
                          y2={baselineY}
                          stroke="var(--border, #e2e8f0)"
                          strokeWidth="1"
                        />
                        {/* Line path */}
                        <path
                          d={linePath}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {/* Data points & value callouts */}
                        {points.map((p, idx) => {
                          const prevVal = idx > 0 ? points[idx - 1].data.cumulativeBlogged : null;
                          const isChangeOrEnd = idx === 0 || idx === count - 1 || p.data.cumulativeBlogged !== prevVal;
                          const showValText = count <= 12 || isChangeOrEnd;

                          return (
                            <g key={p.data.yearMonth}>
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r={count > 20 ? '3' : '4'}
                                fill="#10b981"
                                stroke="#ffffff"
                                strokeWidth="1.5"
                                className="cumulative-point-circle"
                              >
                                <title>{`${p.data.label}: ${p.data.cumulativeBlogged} Blogged cumulative`}</title>
                              </circle>
                              {showValText && (
                                <text
                                  x={p.x}
                                  y={p.y - 8}
                                  textAnchor="middle"
                                  className="cumulative-val-text"
                                >
                                  {p.data.cumulativeBlogged}
                                </text>
                              )}
                              {/* Bottom date text directly in SVG */}
                              {(idx % skipLabels === 0 || idx === count - 1) && (
                                <text
                                  x={p.x}
                                  y={baselineY + 18}
                                  textAnchor="middle"
                                  className="cumulative-date-text"
                                >
                                  {p.data.label.split(' ')[0]} '{p.data.label.split(' ')[1].slice(-2)}
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* Monthly Activity: Stacked bars squeezed into available space with values */
              <div className="timeline-bars-track">
                {timelineData.map((d, idx) => {
                  const bCount = d.blogged;
                  const vCount = d.visited;
                  const pCount = d.planned;
                  const tCount = d.total;

                  const heightPct = tCount > 0
                    ? Math.min(100, Math.max(10, (tCount / maxTimelineVal) * 100))
                    : 0;

                  // Label skipping for crowded months
                  const count = timelineData.length;
                  const skipLabels = count > 14 ? Math.ceil(count / 10) : 1;
                  const showLabel = idx % skipLabels === 0 || idx === count - 1;

                  return (
                    <div
                      className="timeline-bar-column"
                      key={d.yearMonth}
                      title={`${d.label}: ${tCount} places (Blogged: ${bCount}, Visited: ${vCount}, Planned: ${pCount})`}
                    >
                      {/* Value indicator above the bar */}
                      <span className={`timeline-bar-val-indicator ${tCount === 0 ? 'zero-val' : ''}`}>
                        {tCount > 0 ? tCount : '0'}
                      </span>

                      <div className="timeline-column-bar-box" style={{ height: `${heightPct}%` }}>
                        {pCount > 0 && (
                          <div
                            className="bar-sub-segment"
                            style={{
                              flex: pCount,
                              backgroundColor: plannedStyle.dotBg,
                            }}
                          />
                        )}
                        {vCount > 0 && (
                          <div
                            className="bar-sub-segment"
                            style={{
                              flex: vCount,
                              backgroundColor: visitedStyle.dotBg,
                            }}
                          />
                        )}
                        {bCount > 0 && (
                          <div
                            className="bar-sub-segment"
                            style={{
                              flex: bCount,
                              backgroundColor: bloggedStyle.dotBg,
                            }}
                          />
                        )}
                      </div>
                      <div className="timeline-col-labels">
                        {showLabel ? (
                          <>
                            <span className="timeline-bar-month-label">{d.label.split(' ')[0]}</span>
                            <span className="timeline-bar-year-label">'{d.label.split(' ')[1].slice(-2)}</span>
                          </>
                        ) : (
                          <span className="timeline-bar-tick">·</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Timeline Legend (Shown in Monthly mode only) */}
          {timelineMode === 'monthly' && (
            <div className="timeline-legend">
              <div className="t-legend-item">
                <span className="t-legend-dot" style={{ backgroundColor: bloggedStyle.dotBg }} />
                <span>Blogged</span>
              </div>
              <div className="t-legend-item">
                <span className="t-legend-dot" style={{ backgroundColor: visitedStyle.dotBg }} />
                <span>Visited</span>
              </div>
              <div className="t-legend-item">
                <span className="t-legend-dot" style={{ backgroundColor: plannedStyle.dotBg }} />
                <span>Planned</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 5. Progress Panels: Progress by Location & Progress by Category */}
      <section className="stats-progress-tables-grid">
        {/* Progress by Location */}
        <div className="stats-card progress-table-card">
          <div className="table-card-head">
            <div className="stats-title-with-icon">
              <BarChart2 size={18} className="title-icon-primary" />
              <h3 className="stats-card-title">Progress by {locLabelSingular}</h3>
            </div>
            <p className="stats-card-subtitle">Target progress and rating score by {locLabelSingular.toLowerCase()}.</p>
          </div>

          <div className="table-responsive-wrapper">
            <table className="stats-data-table">
              <thead>
                <tr>
                  <th
                    className="th-sortable th-name"
                    onClick={() => handleSortLocation('name')}
                    title={`Sort by ${locLabelSingular}`}
                  >
                    <span>{locLabelSingular}</span>
                    {renderSortIndicator(locationSort.column, 'name', locationSort.direction)}
                  </th>
                  <th
                    className="th-sortable th-progress"
                    onClick={() => handleSortLocation('progressPct')}
                    title="Sort by Journey Progress"
                  >
                    <span>Journey Progress</span>
                    {renderSortIndicator(locationSort.column, 'progressPct', locationSort.direction)}
                  </th>
                  <th
                    className="th-sortable th-score"
                    onClick={() => handleSortLocation('ratingScore')}
                    title="Sort by Rating Score"
                  >
                    <span>Rating Score</span>
                    {renderSortIndicator(locationSort.column, 'ratingScore', locationSort.direction)}
                  </th>
                  <th
                    className="th-sortable th-ratings"
                    onClick={() => handleSortLocation('ratingsCount')}
                    title="Sort by Number of Ratings"
                  >
                    <span>Ratings</span>
                    {renderSortIndicator(locationSort.column, 'ratingsCount', locationSort.direction)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedLocationRows.map((row) => (
                  <tr key={row.key}>
                    <td className="td-name">
                      <strong>{row.name}</strong>
                    </td>
                    <td className="td-progress">
                      <div className="row-progress-wrapper">
                        {/* Compact stacked bar */}
                        <div className="row-mini-stacked-bar">
                          {row.matrixCounts['Not planned'] > 0 && (
                            <div
                              style={{
                                flex: row.matrixCounts['Not planned'],
                                backgroundColor: notPlannedStyle.dotBg,
                              }}
                            />
                          )}
                          {row.matrixCounts['Planned'] > 0 && (
                            <div
                              style={{
                                flex: row.matrixCounts['Planned'],
                                backgroundColor: plannedStyle.dotBg,
                              }}
                            />
                          )}
                          {row.matrixCounts['Visited'] > 0 && (
                            <div
                              style={{
                                flex: row.matrixCounts['Visited'],
                                backgroundColor: visitedStyle.dotBg,
                              }}
                            />
                          )}
                          {row.matrixCounts['Blogged'] > 0 && (
                            <div
                              style={{
                                flex: row.matrixCounts['Blogged'],
                                backgroundColor: bloggedStyle.dotBg,
                              }}
                            />
                          )}
                        </div>
                        <span className="row-pct-label">{row.progressPct}%</span>
                      </div>
                    </td>
                    <td className="td-score">
                      <div className="row-score-wrapper">
                        <div className="row-score-track">
                          <div
                            className="row-score-fill"
                            style={{
                              width: `${row.ratingScore !== null ? row.ratingScore : 0}%`,
                              backgroundColor: row.ratingScore !== null ? '#10b981' : '#e2e8f0',
                            }}
                          />
                        </div>
                        <span className="row-score-label">
                          {row.ratingScore !== null ? `${row.ratingScore}%` : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="td-ratings">
                      <span className="ratings-pill">{row.ratingsCount}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Progress by Category */}
        <div className="stats-card progress-table-card">
          <div className="table-card-head">
            <div className="stats-title-with-icon">
              <Award size={18} className="title-icon-primary" />
              <h3 className="stats-card-title">Progress by Category</h3>
            </div>
            <p className="stats-card-subtitle">Target progress and rating score by category.</p>
          </div>

          <div className="table-responsive-wrapper">
            <table className="stats-data-table">
              <thead>
                <tr>
                  <th
                    className="th-sortable th-name"
                    onClick={() => handleSortCategory('name')}
                    title="Sort by Category"
                  >
                    <span>Category</span>
                    {renderSortIndicator(categorySort.column, 'name', categorySort.direction)}
                  </th>
                  <th
                    className="th-sortable th-progress"
                    onClick={() => handleSortCategory('progressPct')}
                    title="Sort by Journey Progress"
                  >
                    <span>Journey Progress</span>
                    {renderSortIndicator(categorySort.column, 'progressPct', categorySort.direction)}
                  </th>
                  <th
                    className="th-sortable th-score"
                    onClick={() => handleSortCategory('ratingScore')}
                    title="Sort by Rating Score"
                  >
                    <span>Rating Score</span>
                    {renderSortIndicator(categorySort.column, 'ratingScore', categorySort.direction)}
                  </th>
                  <th
                    className="th-sortable th-ratings"
                    onClick={() => handleSortCategory('ratingsCount')}
                    title="Sort by Number of Ratings"
                  >
                    <span>Ratings</span>
                    {renderSortIndicator(categorySort.column, 'ratingsCount', categorySort.direction)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedCategoryRows.map((row) => (
                  <tr key={row.key}>
                    <td className="td-name">
                      <strong>{row.name}</strong>
                    </td>
                    <td className="td-progress">
                      <div className="row-progress-wrapper">
                        {/* Compact stacked bar */}
                        <div className="row-mini-stacked-bar">
                          {row.matrixCounts['Not planned'] > 0 && (
                            <div
                              style={{
                                flex: row.matrixCounts['Not planned'],
                                backgroundColor: notPlannedStyle.dotBg,
                              }}
                            />
                          )}
                          {row.matrixCounts['Planned'] > 0 && (
                            <div
                              style={{
                                flex: row.matrixCounts['Planned'],
                                backgroundColor: plannedStyle.dotBg,
                              }}
                            />
                          )}
                          {row.matrixCounts['Visited'] > 0 && (
                            <div
                              style={{
                                flex: row.matrixCounts['Visited'],
                                backgroundColor: visitedStyle.dotBg,
                              }}
                            />
                          )}
                          {row.matrixCounts['Blogged'] > 0 && (
                            <div
                              style={{
                                flex: row.matrixCounts['Blogged'],
                                backgroundColor: bloggedStyle.dotBg,
                              }}
                            />
                          )}
                        </div>
                        <span className="row-pct-label">{row.progressPct}%</span>
                      </div>
                    </td>
                    <td className="td-score">
                      <div className="row-score-wrapper">
                        <div className="row-score-track">
                          <div
                            className="row-score-fill"
                            style={{
                              width: `${row.ratingScore !== null ? row.ratingScore : 0}%`,
                              backgroundColor: row.ratingScore !== null ? '#10b981' : '#e2e8f0',
                            }}
                          />
                        </div>
                        <span className="row-score-label">
                          {row.ratingScore !== null ? `${row.ratingScore}%` : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="td-ratings">
                      <span className="ratings-pill">{row.ratingsCount}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
