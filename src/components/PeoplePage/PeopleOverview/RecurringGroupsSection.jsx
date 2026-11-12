import React from 'react';
import { UtensilsCrossed, Calendar } from 'lucide-react';

const BADGE_COLORS = ['#1b4332', '#708d57', '#52796f', '#3f5d54', '#2d6a4f'];

/**
 * Circular avatar badges with overlapping stack
 */
function GroupAvatarBadges({ names = [], ids = [], initials = [], size = 'large', onSelectPerson }) {
  return (
    <div className={`group-avatar-stack size-${size}`}>
      {names.map((name, i) => {
        const init = initials[i] || name.slice(0, 2).toUpperCase();
        const bg = BADGE_COLORS[i % BADGE_COLORS.length];
        const id = ids[i];
        return (
          <button
            key={i}
            type="button"
            className="group-avatar-badge"
            style={{ backgroundColor: bg, zIndex: 10 - i }}
            onClick={(e) => {
              e.stopPropagation();
              if (onSelectPerson && id) onSelectPerson({ id, name });
            }}
            title={`View ${name}'s dining profile`}
          >
            {init}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Small SVG laurel wreath rank badge for top 3 regular tables
 */
function LaurelRankBadge({ rank }) {
  const isGold = rank === 1;
  const color = isGold ? '#d97706' : '#94a3b8';
  return (
    <div className={`table-laurel-badge rank-${rank}`} title={`Rank #${rank} regular table`}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" className="laurel-svg">
        <path d="M7 6c-2.2 3.2-2.2 8.5 0 11.5M5 9c-1.2 2-1.2 4.5 0 6.5M17 6c2.2 3.2 2.2 8.5 0 11.5M19 9c1.2 2 1.2 4.5 0 6.5" strokeLinecap="round" />
      </svg>
      <span className="table-rank-number" style={{ color: isGold ? '#b45309' : '#64748b' }}>
        {rank}
      </span>
    </div>
  );
}

/**
 * Subtle date-span timeline visual with start/end years and end dots
 */
function TimelineVisual({ firstYear, latestYear }) {
  if (!firstYear && !latestYear) return null;
  const isSame = firstYear === latestYear || !latestYear;
  return (
    <div className="table-timeline-container">
      <span className="table-timeline-year">{firstYear}</span>
      <div className="table-timeline-track">
        <span className="table-timeline-dot" />
        <span className="table-timeline-line" />
        {!isSame && <span className="table-timeline-dot" />}
      </div>
      {!isSame && <span className="table-timeline-year">{latestYear}</span>}
    </div>
  );
}

/**
 * Supporting detail footer for regular table card
 */
function CardSupportingDetail({ detail, topVenue, formattedLatest, isFeatureFirst }) {
  if (isFeatureFirst && topVenue && formattedLatest) {
    return (
      <div className="table-card-footer dual">
        <span className="footer-fact">
          <UtensilsCrossed size={12} className="footer-fact-icon" />
          <span>Most often: {topVenue}</span>
        </span>
        <span className="footer-divider">|</span>
        <span className="footer-fact">
          <Calendar size={12} className="footer-fact-icon" />
          <span>Latest meal: {formattedLatest}</span>
        </span>
      </div>
    );
  }

  if (!detail && !topVenue && !formattedLatest) return null;

  const text = detail?.label || (topVenue ? `Most often: ${topVenue}` : `Latest meal: ${formattedLatest}`);
  const isVenue = detail?.type === 'venue' || (topVenue && text.includes('Most often'));

  return (
    <div className="table-card-footer single">
      <span className="footer-fact">
        {isVenue ? (
          <UtensilsCrossed size={12} className="footer-fact-icon" />
        ) : (
          <Calendar size={12} className="footer-fact-icon" />
        )}
        <span>{text}</span>
      </span>
    </div>
  );
}

export default function RecurringGroupsSection({ groups = [], onSelectPerson }) {
  if (groups.length === 0) {
    return (
      <div className="people-card regular-tables-container-card">
        <div className="people-card-header">
          <div className="people-card-title-group">
            <h3 className="people-card-title">
              <UtensilsCrossed size={18} />
              Regular Tables
            </h3>
            <p className="people-card-subtitle">
              The people who most often share a table together.
            </p>
          </div>
        </div>
        <p className="regular-tables-empty-note">
          No recurring dining combinations match your current filters.
        </p>
      </div>
    );
  }

  // Strictly 8 cards maximum in total: 3 Feature Cards (Ranks 1–3) + up to 5 Supporting Cards (Ranks 4–8)
  const featureGroups = groups.slice(0, 3);
  const supportingGroups = groups.slice(3, 8);

  return (
    <div className="people-card regular-tables-container-card">
      <div className="people-card-header">
        <div className="people-card-title-group">
          <h3 className="people-card-title">
            <UtensilsCrossed size={18} />
            Regular Tables
          </h3>
          <p className="people-card-subtitle">
            The people who most often share a table together.
          </p>
        </div>
      </div>

      {/* TOP 3 FEATURE CARDS */}
      <div className="regular-tables-feature-grid">
        {featureGroups.map((group, idx) => {
          const rank = idx + 1;
          const isGold = rank === 1;

          return (
            <div
              key={idx}
              className={`regular-table-card feature-card rank-${rank} ${isGold ? 'highlight-gold' : ''}`}
            >
              {/* Header: Laurel Rank Badge */}
              <div className="table-card-top-row">
                <LaurelRankBadge rank={rank} />
              </div>

              {/* Main Body: Circular Badges + Names & Big Meal Count */}
              <div className="table-card-body">
                <div className="table-card-avatar-wrap">
                  <GroupAvatarBadges
                    names={group.names}
                    ids={group.ids}
                    initials={group.initials}
                    size="large"
                    onSelectPerson={onSelectPerson}
                  />
                </div>

                <div className="table-card-info">
                  <div className="table-card-names">
                    {group.names.map((name, i) => (
                      <React.Fragment key={i}>
                        <button
                          type="button"
                          className="table-person-name-btn"
                          onClick={() => onSelectPerson && onSelectPerson({ id: group.ids[i], name })}
                          title={`View ${name}'s dining profile`}
                        >
                          {name}
                        </button>
                        {i < group.names.length - 1 && <span className="table-names-plus"> + </span>}
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="table-card-count">
                    <span className="table-count-number">{group.count.toLocaleString()}</span>
                    <span className="table-count-label">meals</span>
                  </div>
                </div>
              </div>

              {/* Subtle Date-Span Timeline */}
              <TimelineVisual firstYear={group.firstYear} latestYear={group.latestYear} />

              {/* Footer Detail */}
              <CardSupportingDetail
                detail={group.supportingDetail}
                topVenue={group.topVenue}
                formattedLatest={group.formattedLatest}
                isFeatureFirst={isGold}
              />
            </div>
          );
        })}
      </div>

      {/* SUPPORTING CARDS: UP TO 5 CARDS MAXIMUM (RANKS 4 TO 8) */}
      {supportingGroups.length > 0 && (
        <div className="regular-tables-supporting-grid">
          {supportingGroups.map((group, idx) => {
            const rank = idx + 4;
            const isMultiPerson = group.names.length >= 3;

            return (
              <div key={idx} className="regular-table-card supporting-card">
                {/* Header row: Overlapping Avatar Initials */}
                <div className="supporting-card-header">
                  <GroupAvatarBadges
                    names={group.names}
                    ids={group.ids}
                    initials={group.initials}
                    size={isMultiPerson ? 'small' : 'medium'}
                    onSelectPerson={onSelectPerson}
                  />
                </div>

                {/* Group Names */}
                <div className="table-card-names supporting">
                  {group.names.map((name, i) => (
                    <React.Fragment key={i}>
                      <button
                        type="button"
                        className="table-person-name-btn"
                        onClick={() => onSelectPerson && onSelectPerson({ id: group.ids[i], name })}
                        title={`View ${name}'s dining profile`}
                      >
                        {name}
                      </button>
                      {i < group.names.length - 1 && <span className="table-names-plus"> + </span>}
                    </React.Fragment>
                  ))}
                </div>

                {/* Big Meal Count */}
                <div className="table-card-count supporting">
                  <span className="table-count-number">{group.count.toLocaleString()}</span>
                  <span className="table-count-label">meals</span>
                </div>

                {/* Subtle Date-Span Timeline */}
                <TimelineVisual firstYear={group.firstYear} latestYear={group.latestYear} />

                {/* Footer Detail */}
                <CardSupportingDetail
                  detail={group.supportingDetail}
                  topVenue={group.topVenue}
                  formattedLatest={group.formattedLatest}
                  isFeatureFirst={false}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
