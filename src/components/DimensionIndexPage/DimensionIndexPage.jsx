import React, { useMemo, useState } from 'react';
import {
  Compass,
  CheckCircle,
  Clock,
  Star,
  MapPin,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { formatDate } from '../../utils/formatUtils.js';
import { findLatestVisit } from '../../utils/statsCalculations.js';
import './DimensionIndexPage.css';

export default function DimensionIndexPage({
  dimension, // 'location' | 'category'
  activeConfig,
  metadataMap = {}, // composite map: `${project}::${name.toLowerCase()}`
  projectData,
  onSelectEntity,
}) {
  const projectName = activeConfig ? activeConfig.projectKey : 'England';
  const locationLabelSingular = activeConfig ? activeConfig.locationLabelSingular : 'County';
  const locationLabelPlural = activeConfig ? activeConfig.locationLabelPlural : 'Counties';

  // 1. Determine entity list and target per entity
  const entityNames = useMemo(() => {
    if (!projectData) return [];
    if (dimension === 'location') {
      return projectData.allProjectLocations || [];
    }
    return projectData.allProjectCategories || [];
  }, [projectData, dimension]);

  const targetPerEntity = useMemo(() => {
    if (!projectData) return 0;
    if (dimension === 'location') {
      return projectData.allProjectCategories ? projectData.allProjectCategories.length : 0;
    }
    return projectData.allProjectLocations ? projectData.allProjectLocations.length : 0;
  }, [projectData, dimension]);

  // 2. Build rows from Target Matrix and populated explorer places
  const tableRows = useMemo(() => {
    if (!projectData || entityNames.length === 0) return [];

    const rawRows = projectData.rawProjectRows || [];
    const explorerItems = projectData.explorerItems || [];

    // Group matrix counts by entity
    const matrixCountsMap = new Map();
    for (const name of entityNames) {
      matrixCountsMap.set(name, { Blogged: 0, Visited: 0, Planned: 0, 'Not planned': 0 });
    }

    for (const row of rawRows) {
      const key = dimension === 'location' ? row.location : row.category;
      if (matrixCountsMap.has(key)) {
        const counts = matrixCountsMap.get(key);
        const st = (row.status || '').trim().toLowerCase();
        if (st === 'blogged' || st === 'complete' || st.includes('blogged & logged')) {
          counts.Blogged++;
        } else if (st === 'visited' || st.includes('visited only')) {
          counts.Visited++;
        } else if (st === 'planned' || st.includes('planned trip')) {
          counts.Planned++;
        } else {
          counts['Not planned']++;
        }
      }
    }

    // Group populated places, ratings, and latest visits by entity
    const placesByEntity = new Map();
    for (const name of entityNames) {
      placesByEntity.set(name, []);
    }

    for (const place of explorerItems) {
      const key = dimension === 'location' ? place.location : place.category;
      if (placesByEntity.has(key)) {
        placesByEntity.get(key).push(place);
      }
    }

    // Combine into final rows
    return entityNames.map((name) => {
      const matrix = matrixCountsMap.get(name) || { Blogged: 0, Visited: 0, Planned: 0, 'Not planned': 0 };
      const places = placesByEntity.get(name) || [];

      // Metadata lookup: composite key `project::name.toLowerCase()`
      const metaKey = `${projectName.toLowerCase()}::${name.toLowerCase()}`;
      const meta = metadataMap[metaKey] || null;

      const nonNotPlanned = matrix.Blogged + matrix.Visited + matrix.Planned;
      const progressPct = targetPerEntity > 0 ? (nonNotPlanned / targetPerEntity) * 100 : 0;
      const completionPct = targetPerEntity > 0 ? (matrix.Blogged / targetPerEntity) * 100 : 0;

      // Rating score from actual populated places
      let ratingPoints = 0;
      let validRatingsCount = 0;
      for (const p of places) {
        if (
          p.rating !== null &&
          p.rating !== undefined &&
          typeof p.rating === 'number' &&
          !isNaN(p.rating) &&
          p.rating >= 1 &&
          p.rating <= 5
        ) {
          validRatingsCount++;
          ratingPoints += p.rating;
        }
      }
      const maxPts = validRatingsCount * 5;
      const ratingScore = maxPts > 0 ? (ratingPoints / maxPts) * 100 : null;

      const latestVisit = findLatestVisit(places);

      return {
        key: name,
        name,
        target: targetPerEntity,
        blogged: matrix.Blogged,
        nonNotPlanned,
        progressPct: Math.round(progressPct * 10) / 10,
        completionPct: Math.round(completionPct * 10) / 10,
        ratingScore: ratingScore !== null ? Math.round(ratingScore * 10) / 10 : null,
        ratingsCount: validRatingsCount,
        latestVisit,
        placesCount: places.length,
        icon: meta ? meta.icon : null,
      };
    });
  }, [projectData, entityNames, targetPerEntity, dimension, projectName, metadataMap]);

  // 3. Overall Index KPI calculations
  const overallKPIs = useMemo(() => {
    if (!projectData) return null;
    const totalMatrixSize =
      (projectData.allProjectLocations ? projectData.allProjectLocations.length : 0) *
      (projectData.allProjectCategories ? projectData.allProjectCategories.length : 0);

    const rawRows = projectData.rawProjectRows || [];
    let totalBlogged = 0;
    let totalNonNotPlanned = 0;

    for (const row of rawRows) {
      const st = (row.status || '').trim().toLowerCase();
      if (st === 'blogged' || st === 'complete' || st.includes('blogged & logged')) {
        totalBlogged++;
        totalNonNotPlanned++;
      } else if (st === 'visited' || st.includes('visited only')) {
        totalNonNotPlanned++;
      } else if (st === 'planned' || st.includes('planned trip')) {
        totalNonNotPlanned++;
      }
    }

    const overallProgress = totalMatrixSize > 0 ? (totalNonNotPlanned / totalMatrixSize) * 100 : 0;

    // Overall rating
    let totalPts = 0;
    let totalRated = 0;
    for (const p of projectData.explorerItems || []) {
      if (
        p.rating !== null &&
        p.rating !== undefined &&
        typeof p.rating === 'number' &&
        !isNaN(p.rating) &&
        p.rating >= 1 &&
        p.rating <= 5
      ) {
        totalRated++;
        totalPts += p.rating;
      }
    }
    const maxPts = totalRated * 5;
    const overallRatingScore = maxPts > 0 ? (totalPts / maxPts) * 100 : null;
    const overallAvgRating = totalRated > 0 ? totalPts / totalRated : null;

    return {
      entityCount: entityNames.length,
      totalMatrixSize,
      totalBlogged,
      overallProgress: Math.round(overallProgress * 10) / 10,
      overallRatingScore: overallRatingScore !== null ? Math.round(overallRatingScore * 10) / 10 : null,
      overallAvgRating: overallAvgRating !== null ? Math.round(overallAvgRating * 10) / 10 : null,
      totalRated,
    };
  }, [projectData, entityNames]);

  // 4. Sorting State: Default is alphabetical A-Z
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // For numeric and date columns, default to descending on first click; for name default to asc
      if (field === 'name') {
        setSortDirection('asc');
      } else {
        setSortDirection('desc');
      }
    }
  };

  const sortedRows = useMemo(() => {
    const list = [...tableRows];
    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'name') {
        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      if (sortField === 'latestVisit') {
        // Parse date DD/MM/YYYY
        const parseD = (str) => {
          if (!str) return 0;
          const parts = str.split('/');
          if (parts.length !== 3) return 0;
          return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)).getTime();
        };
        const tsA = parseD(valA);
        const tsB = parseD(valB);
        return sortDirection === 'asc' ? tsA - tsB : tsB - tsA;
      }

      // Numeric sort (handle nulls cleanly at bottom)
      if (valA === null || valA === undefined) valA = -1;
      if (valB === null || valB === undefined) valB = -1;

      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });

    return list;
  }, [tableRows, sortField, sortDirection]);

  // Dynamic header titles
  const pageTitle =
    dimension === 'location'
      ? `Exploring ${projectName}'s ${locationLabelPlural} — A to Z`
      : `Exploring ${projectName}'s Categories — A to Z`;

  const matrixContextSubtitle =
    projectData && projectData.allProjectLocations && projectData.allProjectCategories
      ? `${projectData.allProjectLocations.length} ${locationLabelPlural.toLowerCase()} × ${projectData.allProjectCategories.length} categories`
      : '';

  return (
    <div className="dimension-index-page">
      {/* Header */}
      <header className="dimension-index-header">
        <div className="index-header-titles">
          <h1 className="index-title">{pageTitle}</h1>
          <p className="index-subtitle">
            {entityNames.length}{' '}
            {dimension === 'location'
              ? locationLabelPlural.toLowerCase()
              : 'categories'}{' '}
            · reusable overview page
          </p>
        </div>

        <div className="index-header-context">
          <span className="context-proj">Project: {projectName}</span>
          <span className="context-matrix">{matrixContextSubtitle}</span>
        </div>
      </header>

      {/* Index Summary Strip */}
      {overallKPIs && (
        <section className="dimension-index-summary-strip">
          {/* Card 1: Entities count */}
          <div className="index-summary-card">
            <div className="summary-icon-wrap entities-icon">
              <Compass size={18} />
            </div>
            <div className="summary-body">
              <span className="summary-label">
                {dimension === 'location' ? locationLabelPlural : 'Categories'}
              </span>
              <div className="summary-val-group">
                <span className="summary-val">{overallKPIs.entityCount}</span>
                <span className="summary-sub">Across {projectName}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Total Matrix Target */}
          <div className="index-summary-card">
            <div className="summary-icon-wrap target-icon">
              <MapPin size={18} />
            </div>
            <div className="summary-body">
              <span className="summary-label">Target Matrix</span>
              <div className="summary-val-group">
                <span className="summary-val">{overallKPIs.totalMatrixSize.toLocaleString()}</span>
                <span className="summary-sub">Theoretical combinations</span>
              </div>
            </div>
          </div>

          {/* Card 3: Blogged */}
          <div className="index-summary-card">
            <div className="summary-icon-wrap blogged-icon">
              <CheckCircle size={18} />
            </div>
            <div className="summary-body">
              <span className="summary-label">Blogged</span>
              <div className="summary-val-group">
                <span className="summary-val">{overallKPIs.totalBlogged}</span>
                <span className="summary-sub">
                  {overallKPIs.totalMatrixSize > 0
                    ? `${((overallKPIs.totalBlogged / overallKPIs.totalMatrixSize) * 100).toFixed(1)}% of target`
                    : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Journey Progress */}
          <div className="index-summary-card">
            <div className="summary-icon-wrap progress-icon">
              <Clock size={18} />
            </div>
            <div className="summary-body">
              <span className="summary-label">Journey Progress</span>
              <div className="summary-val-group">
                <span className="summary-val">{overallKPIs.overallProgress}%</span>
                <span className="summary-sub">Beyond Not planned</span>
              </div>
            </div>
          </div>

          {/* Card 5: Rating Score */}
          <div className="index-summary-card">
            <div className="summary-icon-wrap rating-icon">
              <Star size={18} />
            </div>
            <div className="summary-body">
              <span className="summary-label">Rating Score</span>
              <div className="summary-val-group">
                <span className="summary-val">
                  {overallKPIs.overallRatingScore !== null
                    ? `${overallKPIs.overallRatingScore}%`
                    : 'Unrated'}
                </span>
                <span className="summary-sub">
                  {overallKPIs.overallAvgRating
                    ? `${overallKPIs.overallAvgRating.toFixed(1)} ★ (${overallKPIs.totalRated})`
                    : 'No ratings'}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Sortable Table */}
      <section className="dimension-index-table-section">
        <div className="table-heading-bar">
          <h2 className="table-heading">
            All {dimension === 'location' ? locationLabelPlural : 'Categories'} ({sortedRows.length})
          </h2>
        </div>

        {/* Desktop Table View (>= 768px) */}
        <div className="index-table-wrapper index-table-desktop-wrapper">
          <table className="dimension-index-table">
            <thead>
              <tr>
                <th className="th-num">#</th>
                <th
                  className="th-sortable th-name"
                  onClick={() => handleSort('name')}
                >
                  <div className="th-content">
                    <span>{dimension === 'location' ? locationLabelSingular : 'Category'}</span>
                    {sortField === 'name' ? (
                      sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    ) : (
                      <ArrowUpDown size={14} className="th-sort-muted" />
                    )}
                  </div>
                </th>
                <th
                  className="th-sortable th-target"
                  onClick={() => handleSort('target')}
                >
                  <div className="th-content">
                    <span>Target</span>
                    {sortField === 'target' ? (
                      sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    ) : (
                      <ArrowUpDown size={14} className="th-sort-muted" />
                    )}
                  </div>
                </th>
                <th
                  className="th-sortable th-blogged"
                  onClick={() => handleSort('blogged')}
                >
                  <div className="th-content">
                    <span>Blogged</span>
                    {sortField === 'blogged' ? (
                      sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    ) : (
                      <ArrowUpDown size={14} className="th-sort-muted" />
                    )}
                  </div>
                </th>
                <th
                  className="th-sortable th-progress"
                  onClick={() => handleSort('progressPct')}
                >
                  <div className="th-content">
                    <span>Journey Progress</span>
                    {sortField === 'progressPct' ? (
                      sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    ) : (
                      <ArrowUpDown size={14} className="th-sort-muted" />
                    )}
                  </div>
                </th>
                <th
                  className="th-sortable th-rating"
                  onClick={() => handleSort('ratingScore')}
                >
                  <div className="th-content">
                    <span>Rating Score</span>
                    {sortField === 'ratingScore' ? (
                      sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    ) : (
                      <ArrowUpDown size={14} className="th-sort-muted" />
                    )}
                  </div>
                </th>
                <th
                  className="th-sortable th-date"
                  onClick={() => handleSort('latestVisit')}
                >
                  <div className="th-content">
                    <span>Latest Visit</span>
                    {sortField === 'latestVisit' ? (
                      sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    ) : (
                      <ArrowUpDown size={14} className="th-sort-muted" />
                    )}
                  </div>
                </th>
                <th className="th-view">View</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, idx) => (
                <tr
                  key={row.key}
                  className="index-row-clickable"
                  onClick={() => onSelectEntity(row.name)}
                >
                  <td className="td-num">{idx + 1}</td>
                  <td className="td-name">
                    <div className="entity-name-cell">
                      {row.icon ? (
                        <img
                          src={row.icon}
                          alt={`${row.name} icon`}
                          className="entity-table-icon"
                          loading="lazy"
                        />
                      ) : (
                        <div className="entity-table-icon-fallback">
                          <MapPin size={14} />
                        </div>
                      )}
                      <span className="entity-table-name">{row.name}</span>
                    </div>
                  </td>
                  <td className="td-target">{row.target}</td>
                  <td className="td-blogged">
                    <span className="blogged-val">
                      {row.blogged}
                      <span className="cell-pct">
                        ({targetPerEntity > 0 ? Math.round((row.blogged / targetPerEntity) * 100) : 0}%)
                      </span>
                    </span>
                  </td>
                  <td className="td-progress">
                    <div className="progress-cell-wrap">
                      <div className="progress-cell-bar">
                        <div
                          className="progress-cell-fill"
                          style={{ width: `${Math.min(100, row.progressPct)}%` }}
                        />
                      </div>
                      <span className="progress-cell-pct">{row.progressPct}%</span>
                    </div>
                  </td>
                  <td className="td-rating">
                    {row.ratingScore !== null ? (
                      <div className="rating-score-cell">
                        <Star size={13} fill="#f59e0b" color="#f59e0b" />
                        <span className="rating-score-num">{row.ratingScore}%</span>
                        <span className="rating-count-pill">({row.ratingsCount})</span>
                      </div>
                    ) : (
                      <span className="unrated-dash">—</span>
                    )}
                  </td>
                  <td className="td-date">
                    {row.latestVisit ? formatDate(row.latestVisit) : '—'}
                  </td>
                  <td className="td-view">
                    <button
                      type="button"
                      className="view-entity-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEntity(row.name);
                      }}
                      aria-label={`View ${row.name} details`}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile List View (< 768px) */}
        <div className="index-list-mobile-wrapper">
          <div className="mobile-index-header-row">
            <button
              type="button"
              className="mobile-th-btn mobile-th-name"
              onClick={() => handleSort('name')}
            >
              <span>{dimension === 'location' ? locationLabelSingular : 'Category'}</span>
              {sortField === 'name' ? (
                sortDirection === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
              ) : (
                <ArrowUpDown size={13} className="th-sort-muted" />
              )}
            </button>

            <button
              type="button"
              className="mobile-th-btn mobile-th-progress"
              onClick={() => handleSort('progressPct')}
            >
              <span>Journey Progress</span>
              {sortField === 'progressPct' ? (
                sortDirection === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
              ) : (
                <ArrowUpDown size={13} className="th-sort-muted" />
              )}
            </button>
          </div>

          <div className="mobile-index-rows">
            {sortedRows.map((row) => (
              <div
                key={row.key}
                className="mobile-index-row"
                onClick={() => onSelectEntity(row.name)}
                role="button"
                tabIndex={0}
              >
                {/* Line 1: Icon + Name on left, Progress % on right */}
                <div className="mobile-index-row-top">
                  <div className="mobile-index-entity-info">
                    {row.icon ? (
                      <img
                        src={row.icon}
                        alt={`${row.name} icon`}
                        className="entity-table-icon"
                        loading="lazy"
                      />
                    ) : (
                      <div className="entity-table-icon-fallback">
                        <MapPin size={14} />
                      </div>
                    )}
                    <span className="entity-table-name">{row.name}</span>
                  </div>

                  <span className="mobile-index-pct">{row.progressPct}%</span>
                </div>

                {/* Line 2: Progress Bar Graph below text and number */}
                <div className="mobile-index-bar-track">
                  <div
                    className="mobile-index-bar-fill"
                    style={{ width: `${Math.min(100, row.progressPct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
