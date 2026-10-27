import React from 'react';
import { Star, CheckCircle } from 'lucide-react';
import { formatOrdinal } from '../../utils/statsCalculations.js';
import './DimensionContextPanel.css';

export default function DimensionContextPanel({
  dimension, // 'location' | 'category'
  entityName,
  locationLabelSingular = 'County',
  locationLabelPlural = 'Counties',
  projectName = 'England',
  manualRating = null, // from metadata feed if available (null if not in feed)
  manualRatingRank = null, // { rank, totalPeers, percentileTop }
  completedEntries = 0, // Blogged count for this entity
  totalTarget = 0, // target for this entity
  completedRank = null, // { rank, totalPeers, percentileTop }
  minCompletedAmongPeers = 0,
  maxCompletedAmongPeers = 0,
}) {
  const entityLabel = dimension === 'location' ? locationLabelSingular.toLowerCase() : 'category';
  const entityPlural = dimension === 'location' ? locationLabelPlural.toLowerCase() : 'categories';

  // Calculate completed progress bar percentage between min and max peer completed entries
  const rangeSpan = Math.max(1, maxCompletedAmongPeers - minCompletedAmongPeers);
  const rangePct = Math.min(
    100,
    Math.max(0, ((completedEntries - minCompletedAmongPeers) / rangeSpan) * 100)
  );

  return (
    <div className="dimension-context-panel">
      <div className="dimension-context-header">
        <h3 className="context-panel-title">{entityName} in Context</h3>
        <p className="context-panel-subtitle">
          How {entityName} compares to other {entityPlural} in {projectName}.
        </p>
      </div>

      <div className="context-cards-grid">
        {/* Card A: Manual Overall Rating (if provided in metadata feed) */}
        {manualRating !== null && manualRating !== undefined ? (
          <div className="context-card">
            <div className="context-card-top">
              <div className="context-card-label-wrap">
                <Star size={16} className="context-icon rating-star" />
                <span className="context-card-label">
                  Current {entityLabel} rating
                </span>
              </div>
              {manualRatingRank && manualRatingRank.percentileTop && (
                <span className="context-badge">
                  Top {manualRatingRank.percentileTop}%
                </span>
              )}
            </div>

            <div className="context-card-main-val">
              <span className="main-num">{manualRating}</span>
              <span className="main-denom">/ 10</span>
            </div>

            {manualRatingRank && manualRatingRank.rank && (
              <p className="context-rank-text">
                <strong>{formatOrdinal(manualRatingRank.rank)}</strong> of{' '}
                {manualRatingRank.totalPeers} {entityPlural}
              </p>
            )}
          </div>
        ) : null}

        {/* Card B: Completed Entries (Blogged) */}
        <div className="context-card">
          <div className="context-card-top">
            <div className="context-card-label-wrap">
              <CheckCircle size={16} className="context-icon check-icon" />
              <span className="context-card-label">Completed entries</span>
            </div>
            {completedRank && completedRank.percentileTop && (
              <span className="context-badge">
                Top {completedRank.percentileTop}%
              </span>
            )}
          </div>

          <div className="context-card-main-val">
            <span className="main-num">{completedEntries}</span>
            <span className="main-denom">/ {totalTarget}</span>
          </div>

          {completedRank && completedRank.rank && (
            <p className="context-rank-text">
              <strong>{formatOrdinal(completedRank.rank)}</strong> of{' '}
              {completedRank.totalPeers} {entityPlural}
            </p>
          )}

          {/* Peer distribution range slider indicator */}
          <div className="context-range-wrap">
            <div className="context-range-bar">
              <div
                className="context-range-fill"
                style={{ width: `${rangePct}%` }}
              />
              <div
                className="context-range-marker"
                style={{ left: `${rangePct}%` }}
              />
            </div>
            <div className="context-range-labels">
              <span>Lowest: {minCompletedAmongPeers}</span>
              <span>Highest: {maxCompletedAmongPeers}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
