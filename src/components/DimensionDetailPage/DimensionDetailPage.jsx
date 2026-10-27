import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  Star,
  CheckCircle,
  Clock,
  Compass,
  MapPin,
  ExternalLink,
  Heart,
  FlaskConical,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import DimensionMap from './DimensionMap.jsx';
import DimensionPhotoCarousel from './DimensionPhotoCarousel.jsx';
import DimensionEntriesPanel from './DimensionEntriesPanel.jsx';
import DimensionContextPanel from './DimensionContextPanel.jsx';
import { formatDate } from '../../utils/formatUtils.js';
import { calculatePeerRank, formatOrdinal } from '../../utils/statsCalculations.js';
import { getStatusStyle } from '../../utils/statusColors.js';
import './DimensionDetailPage.css';

export default function DimensionDetailPage({
  dimension, // 'location' | 'category'
  entityName, // e.g. 'Bristol' or 'Architecture'
  activeConfig,
  metadata = null, // from metadata feed
  projectData,
  onBack,
  onOpenPlace,
  onViewAllFiltered,
}) {
  const projectName = activeConfig ? activeConfig.projectKey : 'England';
  const locationLabelSingular = activeConfig ? activeConfig.locationLabelSingular : 'County';
  const locationLabelPlural = activeConfig ? activeConfig.locationLabelPlural : 'Counties';

  const notPlannedStyle = getStatusStyle('Not planned');
  const plannedStyle = getStatusStyle('Planned');
  const visitedStyle = getStatusStyle('Visited');
  const bloggedStyle = getStatusStyle('Blogged');

  // 1. Target Matrix & Status Counts for this specific entity
  const {
    target,
    counts,
    percentages,
    bloggedCount,
    nonNotPlannedCount,
    progressPct,
    completionPct,
  } = useMemo(() => {
    if (!projectData) {
      return {
        target: 0,
        counts: { 'Not planned': 0, Planned: 0, Visited: 0, Blogged: 0 },
        percentages: { 'Not planned': 0, Planned: 0, Visited: 0, Blogged: 0 },
        bloggedCount: 0,
        nonNotPlannedCount: 0,
        progressPct: 0,
        completionPct: 0,
      };
    }

    const rawRows = projectData.rawProjectRows || [];
    let entityTarget = 0;
    const stCounts = {
      'Not planned': 0,
      Planned: 0,
      Visited: 0,
      Blogged: 0,
    };

    if (dimension === 'location') {
      entityTarget = projectData.allProjectCategories ? projectData.allProjectCategories.length : 0;
      for (const row of rawRows) {
        if (row.location === entityName) {
          const st = (row.status || '').trim().toLowerCase();
          if (st === 'blogged' || st === 'complete' || st.includes('blogged & logged')) {
            stCounts.Blogged++;
          } else if (st === 'visited' || st.includes('visited only')) {
            stCounts.Visited++;
          } else if (st === 'planned' || st.includes('planned trip')) {
            stCounts.Planned++;
          } else {
            stCounts['Not planned']++;
          }
        }
      }
    } else {
      entityTarget = projectData.allProjectLocations ? projectData.allProjectLocations.length : 0;
      for (const row of rawRows) {
        if (row.category === entityName) {
          const st = (row.status || '').trim().toLowerCase();
          if (st === 'blogged' || st === 'complete' || st.includes('blogged & logged')) {
            stCounts.Blogged++;
          } else if (st === 'visited' || st.includes('visited only')) {
            stCounts.Visited++;
          } else if (st === 'planned' || st.includes('planned trip')) {
            stCounts.Planned++;
          } else {
            stCounts['Not planned']++;
          }
        }
      }
    }

    // Reconcile missing rows to Not planned
    const totalAccounted = stCounts.Blogged + stCounts.Visited + stCounts.Planned + stCounts['Not planned'];
    if (totalAccounted < entityTarget) {
      stCounts['Not planned'] += (entityTarget - totalAccounted);
    }

    const nonNotPlanned = stCounts.Blogged + stCounts.Visited + stCounts.Planned;
    const pPct = entityTarget > 0 ? (nonNotPlanned / entityTarget) * 100 : 0;
    const cPct = entityTarget > 0 ? (stCounts.Blogged / entityTarget) * 100 : 0;

    const stPercentages = {
      'Not planned': entityTarget > 0 ? (stCounts['Not planned'] / entityTarget) * 100 : 0,
      Planned: entityTarget > 0 ? (stCounts.Planned / entityTarget) * 100 : 0,
      Visited: entityTarget > 0 ? (stCounts.Visited / entityTarget) * 100 : 0,
      Blogged: entityTarget > 0 ? (stCounts.Blogged / entityTarget) * 100 : 0,
    };

    return {
      target: entityTarget,
      counts: stCounts,
      percentages: stPercentages,
      bloggedCount: stCounts.Blogged,
      nonNotPlannedCount: nonNotPlanned,
      progressPct: Math.round(pPct * 10) / 10,
      completionPct: Math.round(cPct * 10) / 10,
    };
  }, [projectData, dimension, entityName]);

  // 2. Populated Places belonging to this entity
  const entityPlaces = useMemo(() => {
    if (!projectData || !projectData.explorerItems) return [];
    return projectData.explorerItems.filter((p) => {
      if (dimension === 'location') {
        return p.location === entityName;
      }
      return p.category === entityName;
    });
  }, [projectData, dimension, entityName]);

  // 3. Derived Rating Score from actual populated places
  const { ratingScore, ratedCount, averageRating } = useMemo(() => {
    let validCount = 0;
    let totalPoints = 0;

    for (const p of entityPlaces) {
      if (
        p.rating !== null &&
        p.rating !== undefined &&
        typeof p.rating === 'number' &&
        !isNaN(p.rating) &&
        p.rating >= 1 &&
        p.rating <= 5
      ) {
        validCount++;
        totalPoints += p.rating;
      }
    }

    const avg = validCount > 0 ? totalPoints / validCount : null;
    const maxPts = validCount * 5;
    const score = maxPts > 0 ? (totalPoints / maxPts) * 100 : null;

    return {
      ratingScore: score !== null ? Math.round(score * 10) / 10 : null,
      ratedCount: validCount,
      averageRating: avg !== null ? Math.round(avg * 10) / 10 : null,
    };
  }, [entityPlaces]);

  // 4. Peer context calculation across all peers in project (Blogged completion and Rating Score)
  const {
    completedRank,
    minCompleted,
    maxCompleted,
    minPeerNames = [],
    maxPeerNames = [],
    ratingRank,
    minRating = 0,
    maxRating = 0,
    minRatingPeerNames = [],
    maxRatingPeerNames = [],
  } = useMemo(() => {
    if (!projectData) {
      return {
        completedRank: null,
        minCompleted: 0,
        maxCompleted: 0,
        minPeerNames: [],
        maxPeerNames: [],
        ratingRank: null,
        minRating: 0,
        maxRating: 0,
        minRatingPeerNames: [],
        maxRatingPeerNames: [],
      };
    }

    const rawRows = projectData.rawProjectRows || [];
    const explorerItems = projectData.explorerItems || [];
    const peerCounts = new Map();
    const peerRatings = new Map();

    const peers =
      dimension === 'location'
        ? projectData.allProjectLocations || []
        : projectData.allProjectCategories || [];

    for (const peer of peers) {
      peerCounts.set(peer, 0);
      peerRatings.set(peer, { points: 0, count: 0 });
    }

    for (const row of rawRows) {
      const peerKey = dimension === 'location' ? row.location : row.category;
      if (peerCounts.has(peerKey)) {
        const st = (row.status || '').trim().toLowerCase();
        if (st === 'blogged' || st === 'complete' || st.includes('blogged & logged')) {
          peerCounts.set(peerKey, peerCounts.get(peerKey) + 1);
        }
      }
    }

    for (const place of explorerItems) {
      const peerKey = dimension === 'location' ? place.location : place.category;
      if (peerRatings.has(peerKey)) {
        if (
          place.rating !== null &&
          place.rating !== undefined &&
          typeof place.rating === 'number' &&
          !isNaN(place.rating) &&
          place.rating >= 1 &&
          place.rating <= 5
        ) {
          const entry = peerRatings.get(peerKey);
          entry.points += place.rating;
          entry.count += 1;
        }
      }
    }

    const bloggedValues = Array.from(peerCounts.values());
    const minVal = bloggedValues.length ? Math.min(...bloggedValues) : 0;
    const maxVal = bloggedValues.length ? Math.max(...bloggedValues) : 0;
    const cRankInfo = calculatePeerRank(bloggedCount, bloggedValues);

    // Collect peer names that hold the minimum and maximum values
    const minPeers = [];
    const maxPeers = [];
    for (const [pName, pCnt] of peerCounts.entries()) {
      if (pCnt === minVal) minPeers.push(pName);
      if (pCnt === maxVal) maxPeers.push(pName);
    }

    // Rating score values for peers with valid ratings
    const peerScoreValues = [];
    const peerScoreMap = new Map();
    for (const [pName, rData] of peerRatings.entries()) {
      if (rData.count > 0) {
        const score = Math.round(((rData.points / (rData.count * 5)) * 100) * 10) / 10;
        peerScoreValues.push(score);
        peerScoreMap.set(pName, score);
      }
    }
    const rRankInfo = calculatePeerRank(ratingScore, peerScoreValues);

    const minRVal = peerScoreValues.length ? Math.min(...peerScoreValues) : 0;
    const maxRVal = peerScoreValues.length ? Math.max(...peerScoreValues) : 0;

    const minRPeers = [];
    const maxRPeers = [];
    for (const [pName, score] of peerScoreMap.entries()) {
      if (score === minRVal) minRPeers.push(pName);
      if (score === maxRVal) maxRPeers.push(pName);
    }

    return {
      completedRank: cRankInfo,
      minCompleted: minVal,
      maxCompleted: maxVal,
      minPeerNames: minPeers,
      maxPeerNames: maxPeers,
      ratingRank: rRankInfo,
      minRating: minRVal,
      maxRating: maxRVal,
      minRatingPeerNames: minRPeers,
      maxRatingPeerNames: maxRPeers,
    };
  }, [projectData, dimension, bloggedCount, ratingScore]);

  // 5. Gather carousel photos from actual posts (structured feature photos)
  const carouselImages = useMemo(() => {
    const list = [];
    const seen = new Set();

    for (const p of entityPlaces) {
      if (p.featurePhoto && !seen.has(p.featurePhoto)) {
        seen.add(p.featurePhoto);
        list.push({
          url: p.featurePhoto,
          title: p.place,
          placeName: p.place,
          place: p,
        });
      }
    }
    return list;
  }, [entityPlaces]);

  // 6. Gather favourite entries for this dimension entity
  const favouritePlaces = useMemo(() => {
    return entityPlaces.filter((p) => p.favourite);
  }, [entityPlaces]);

  // Subtitle logic: comes from the Tag / Tagline field if available, otherwise friendly fallback
  const subtitle =
    metadata && metadata.tagline
      ? metadata.tagline
      : dimension === 'location'
      ? `My journey through ${entityName}`
      : `My ${entityName} journey around ${projectName}`;

  const iconUrl = metadata ? metadata.icon : null;
  const myViewText = metadata ? metadata.intro : '';
  const aiBlogSummaryText = metadata ? metadata.aiBlogSummary : '';
  const lastUpdated = metadata ? metadata.lastUpdate : '';

  const [isEntriesExpanded, setIsEntriesExpanded] = useState(false);

  return (
    <div className="dimension-detail-page">
      {/* Back button */}
      <div className="dimension-detail-back-bar">
        <button type="button" className="dimension-back-btn" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>
            Back to {dimension === 'location' ? locationLabelPlural : 'Category'} Index
          </span>
        </button>
      </div>

      {/* Detail Header */}
      <header className="dimension-detail-header">
        <div className="header-identity">
          {iconUrl && (
            <div className="dimension-header-icon-wrap">
              <img
                src={iconUrl}
                alt={`${entityName} icon`}
                className="dimension-header-icon"
                loading="eager"
              />
            </div>
          )}
          <div className="header-titles">
            <h1 className="dimension-title">{entityName}</h1>
            <p className="dimension-subtitle">{subtitle}</p>
          </div>
        </div>

        {/* Blog Entry Favorites Box */}
        {favouritePlaces.length > 0 ? (
          <div className="header-favorites-box">
            <div className="favorites-box-header">
              <Heart size={14} className="favorites-heart-icon" fill="#ef4444" color="#ef4444" />
              <span className="favorites-box-title">Blog entry favorites so far</span>
            </div>
            <div className="favorites-chips-list">
              {favouritePlaces.map((favPlace) => (
                <button
                  key={favPlace.id || favPlace.place}
                  type="button"
                  className="favorite-chip-btn"
                  onClick={() => onOpenPlace && onOpenPlace(favPlace)}
                  title={`View ${favPlace.place}`}
                >
                  <span className="fav-chip-name">{favPlace.place}</span>
                  {dimension === 'category' && favPlace.location && (
                    <span className="fav-chip-sub">({favPlace.location})</span>
                  )}
                  {dimension === 'location' && favPlace.category && (
                    <span className="fav-chip-sub">({favPlace.category})</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </header>

      {/* Top 3 Thin KPI Blocks */}
      <section className="dimension-top-kpi-three-blocks">
        {/* Block 1: Journey Status / Progress Bar (matching Stats page) */}
        <div className="dimension-thin-kpi-block journey-progress-block">
          <div className="thin-block-header">
            <span className="thin-block-title">Journey Status</span>
            <span className="thin-block-subtitle">
              ({counts.Blogged + counts.Visited + counts.Planned} of {target} target {dimension === 'location' ? 'categories' : locationLabelPlural.toLowerCase()})
            </span>
          </div>

          <div className="thin-block-content">
            <div className="thin-journey-bar-row">
              <div className="thin-journey-bar" role="progressbar" aria-label="Journey status distribution">
                {percentages['Not planned'] > 0 && (
                  <div
                    className="thin-journey-segment"
                    style={{
                      width: `${percentages['Not planned']}%`,
                      backgroundColor: notPlannedStyle.dotBg,
                    }}
                    title={`Not planned: ${counts['Not planned']} (${percentages['Not planned'].toFixed(1)}%)`}
                  >
                    {percentages['Not planned'] >= 10 && (
                      <span className="thin-segment-label">{percentages['Not planned'].toFixed(1)}%</span>
                    )}
                  </div>
                )}
                {percentages['Planned'] > 0 && (
                  <div
                    className="thin-journey-segment"
                    style={{
                      width: `${percentages['Planned']}%`,
                      backgroundColor: plannedStyle.dotBg,
                    }}
                    title={`Planned: ${counts['Planned']} (${percentages['Planned'].toFixed(1)}%)`}
                  >
                    {percentages['Planned'] >= 10 && (
                      <span className="thin-segment-label">{percentages['Planned'].toFixed(1)}%</span>
                    )}
                  </div>
                )}
                {percentages['Visited'] > 0 && (
                  <div
                    className="thin-journey-segment"
                    style={{
                      width: `${percentages['Visited']}%`,
                      backgroundColor: visitedStyle.dotBg,
                    }}
                    title={`Visited: ${counts['Visited']} (${percentages['Visited'].toFixed(1)}%)`}
                  >
                    {percentages['Visited'] >= 10 && (
                      <span className="thin-segment-label">{percentages['Visited'].toFixed(1)}%</span>
                    )}
                  </div>
                )}
                {percentages['Blogged'] > 0 && (
                  <div
                    className="thin-journey-segment"
                    style={{
                      width: `${percentages['Blogged']}%`,
                      backgroundColor: bloggedStyle.dotBg,
                    }}
                    title={`Blogged: ${counts['Blogged']} (${percentages['Blogged'].toFixed(1)}%)`}
                  >
                    {percentages['Blogged'] >= 10 && (
                      <span className="thin-segment-label">{percentages['Blogged'].toFixed(1)}%</span>
                    )}
                  </div>
                )}
              </div>

              {/* Side Key */}
              <div className="thin-journey-side-key">
                <div className="thin-key-item">
                  <span className="thin-legend-dot" style={{ backgroundColor: bloggedStyle.dotBg }} />
                  <span>Blogged</span>
                </div>
                <div className="thin-key-item">
                  <span className="thin-legend-dot" style={{ backgroundColor: visitedStyle.dotBg }} />
                  <span>Visited</span>
                </div>
                <div className="thin-key-item">
                  <span className="thin-legend-dot" style={{ backgroundColor: plannedStyle.dotBg }} />
                  <span>Planned</span>
                </div>
                <div className="thin-key-item">
                  <span className="thin-legend-dot" style={{ backgroundColor: notPlannedStyle.dotBg }} />
                  <span>Not planned</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Block 2: In Context Progress (e.g. 5 blogged out of 26, 15th out of 48 counties) */}
        <div className="dimension-thin-kpi-block context-progress-block">
          <div className="thin-block-header">
            <span className="thin-block-title">{entityName} in Context</span>
            <span className="thin-block-subtitle">Completed entries</span>
          </div>

          <div className="thin-block-content">
            <div className="context-kpi-main-row">
              <div className="context-kpi-metric">
                <span className="context-big-num">{bloggedCount}</span>
                <span className="context-denom">/ {target}</span>
                <span className="context-unit">blogged</span>
              </div>
              {completedRank && completedRank.rank && (
                <div className="context-rank-badge">
                  <span className="context-rank-highlight">
                    {formatOrdinal(completedRank.rank)}
                  </span>
                  <span className="context-rank-total">
                    of {completedRank.totalPeers} {dimension === 'location' ? locationLabelPlural.toLowerCase() : 'categories'}
                  </span>
                </div>
              )}
            </div>

            {/* Small distribution range indicator */}
            <div className="context-mini-range">
              <div className="context-mini-bar">
                <div
                  className="context-mini-fill"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        maxCompleted > minCompleted
                          ? ((bloggedCount - minCompleted) / (maxCompleted - minCompleted)) * 100
                          : 0
                      )
                    )}%`,
                  }}
                />
              </div>
              <div className="context-mini-range-labels">
                <span>
                  Min: {minCompleted}
                  {minPeerNames.length > 0 && (
                    <span className="context-peer-name" title={minPeerNames.join(', ')}>
                      {' '}[{minPeerNames.length === 1 ? minPeerNames[0] : `${minPeerNames[0]} +${minPeerNames.length - 1}`}]
                    </span>
                  )}
                </span>
                <span>
                  Max: {maxCompleted}
                  {maxPeerNames.length > 0 && (
                    <span className="context-peer-name" title={maxPeerNames.join(', ')}>
                      {' '}[{maxPeerNames.length === 1 ? maxPeerNames[0] : `${maxPeerNames[0]} +${maxPeerNames.length - 1}`}]
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Block 3: Rating Score & Rank in Context (matching look of Block 2) */}
        <div className="dimension-thin-kpi-block rating-progress-block">
          <div className="thin-block-header">
            <span className="thin-block-title">Rating Score</span>
            <span className="thin-block-subtitle">Peer comparison</span>
          </div>

          <div className="thin-block-content">
            <div className="context-kpi-main-row">
              <div className="context-kpi-metric">
                {ratingScore !== null ? (
                  <>
                    <span className="context-big-num">{ratingScore}%</span>
                    <span className="context-sub-info">
                      {averageRating ? `${averageRating.toFixed(1)} / 5 ★` : ''} · {ratedCount} {ratedCount === 1 ? 'rating' : 'ratings'}
                    </span>
                  </>
                ) : (
                  <span className="context-unrated">Unrated</span>
                )}
              </div>
              {ratingRank && ratingRank.rank && ratingScore !== null && (
                <div className="context-rank-badge">
                  <span className="context-rank-highlight">
                    {formatOrdinal(ratingRank.rank)}
                  </span>
                  <span className="context-rank-total">
                    of {ratingRank.totalPeers} rated
                  </span>
                </div>
              )}
            </div>

            {/* Rating range indicator matching context box */}
            <div className="context-mini-range">
              <div className="context-mini-bar">
                <div
                  className="context-mini-fill rating-fill"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        maxRating > minRating && ratingScore !== null
                          ? ((ratingScore - minRating) / (maxRating - minRating)) * 100
                          : (ratingScore || 0)
                      )
                    )}%`,
                  }}
                />
              </div>
              <div className="context-mini-range-labels">
                <span>
                  Min: {minRating}%
                  {minRatingPeerNames.length > 0 && (
                    <span className="context-peer-name" title={minRatingPeerNames.join(', ')}>
                      {' '}[{minRatingPeerNames.length === 1 ? minRatingPeerNames[0] : `${minRatingPeerNames[0]} +${minRatingPeerNames.length - 1}`}]
                    </span>
                  )}
                </span>
                <span>
                  Max: {maxRating}%
                  {maxRatingPeerNames.length > 0 && (
                    <span className="context-peer-name" title={maxRatingPeerNames.join(', ')}>
                      {' '}[{maxRatingPeerNames.length === 1 ? maxRatingPeerNames[0] : `${maxRatingPeerNames[0]} +${maxRatingPeerNames.length - 1}`}]
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. My Entries Panel — Stretched full width, collapsible (starts collapsed with 3 entries) */}
      <section className="dimension-section-stretched dimension-entries-section">
        <DimensionEntriesPanel
          dimension={dimension}
          entityName={entityName}
          places={entityPlaces}
          allTargetPeers={
            dimension === 'location'
              ? projectData?.allProjectCategories || []
              : projectData?.allProjectLocations || []
          }
          rawProjectRows={projectData?.rawProjectRows || []}
          totalEntriesCount={entityPlaces.length}
          onOpenPlace={onOpenPlace}
          isExpanded={isEntriesExpanded}
          onToggleExpand={() => setIsEntriesExpanded((prev) => !prev)}
        />
      </section>

      {/* 3. My View — Stretched horizontally */}
      <section className="dimension-section-stretched">
        <div className="editorial-card my-view-card stretched-card">
          <div className="editorial-card-header">
            <h3 className="editorial-heading">My View</h3>
            {lastUpdated && (
              <span className="editorial-date">Last updated: {lastUpdated}</span>
            )}
          </div>
          <div className="editorial-body">
            {myViewText ? (
              <p className="editorial-text">{myViewText}</p>
            ) : (
              <p className="editorial-empty">No personal overview added yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* 4. Images from the Journey — Moved up */}
      {carouselImages.length > 0 && (
        <section className="dimension-photos-section">
          <DimensionPhotoCarousel images={carouselImages} onOpenPlace={onOpenPlace} />
        </section>
      )}

      {/* 5. From the Blogs — Third down */}
      <section className="dimension-section-stretched">
        <div className="editorial-card blogs-summary-card stretched-card">
          <div className="editorial-card-header">
            <h3 className="editorial-heading">From the Blogs</h3>
          </div>
          <div className="editorial-body">
            {aiBlogSummaryText ? (
              <p className="editorial-text">{aiBlogSummaryText}</p>
            ) : (
              <p className="editorial-empty">No editorial blog summary available yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* 6. Map of Posts & My Research Panel — Two panels side by side below */}
      <section className="dimension-bottom-grid">
        {/* Map of Posts */}
        <div className="editorial-card map-card">
          <div className="editorial-card-header">
            <h3 className="editorial-heading">Map of Posts</h3>
            {entityPlaces.length > 0 && (
              <button
                type="button"
                className="view-map-link-btn"
                onClick={onViewAllFiltered}
              >
                View all {entityPlaces.length} places &rarr;
              </button>
            )}
          </div>
          <div className="editorial-map-body">
            <DimensionMap places={entityPlaces} onOpenPlace={onOpenPlace} />
          </div>
        </div>

        {/* My Research (Placeholder / Coming soon) */}
        <div className="editorial-card my-research-card">
          <div className="editorial-card-header">
            <div className="research-header-title-wrap">
              <FlaskConical size={18} className="research-header-icon" />
              <h3 className="editorial-heading">My Research</h3>
            </div>
            <span className="coming-soon-badge">
              <Sparkles size={12} />
              <span>Coming soon</span>
            </span>
          </div>
          <div className="editorial-body my-research-body">
            <div className="research-placeholder-graphic">
              <BookOpen size={32} className="research-graphic-icon" />
            </div>
            <h4 className="research-placeholder-subtitle">
              {entityName} Research &amp; Field Notes
            </h4>
            <p className="editorial-empty">
              Curated background research, route planning notes, and historical context for {entityName} are coming soon.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
