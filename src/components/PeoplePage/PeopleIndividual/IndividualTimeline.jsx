import React, { useState, useMemo, useRef } from 'react';
import { Clock, Camera, Calendar, MapPin, ChevronRight, X, AlertCircle } from 'lucide-react';

export const RATING_COLORS = {
  'the dogs': '#14532D',
  'exceptional': '#22C55E',
  'very good': '#84CC16',
  'fine': '#EAB308',
  "ok but wouldn't recommend": '#F59E0B',
  'ok but wouldnt recommend': '#F59E0B',
  'very bad': '#E85D3F',
  'never again': '#DC2626',
  'the worst in the world': '#7F1D1D',
};

export const CANONICAL_LEGEND = [
  { label: 'The Dogs', color: '#14532D' },
  { label: 'Exceptional', color: '#22C55E' },
  { label: 'Very Good', color: '#84CC16' },
  { label: 'Fine', color: '#EAB308' },
  { label: "OK but wouldn't recommend", color: '#F59E0B' },
  { label: 'Very Bad', color: '#E85D3F' },
  { label: 'Never Again', color: '#DC2626' },
  { label: 'The Worst in the World', color: '#7F1D1D' },
];

export function getRatingColor(rating) {
  if (!rating) return '#94a3b8';
  const key = String(rating).trim().toLowerCase();
  return RATING_COLORS[key] || '#94a3b8';
}

export default function IndividualTimeline({ timeline = [], onSelectMeal }) {
  const [activeMeal, setActiveMeal] = useState(null);
  const containerRef = useRef(null);

  const layout = useMemo(() => {
    if (!timeline || timeline.length === 0) return null;

    const width = 1000;
    const margin = { left: 45, right: 45, top: 24, bottom: 42 };
    const plotW = width - margin.left - margin.right;

    // Parse timestamps
    const parsed = timeline
      .map((m) => {
        let t = 0;
        if (m.date) {
          const d = new Date(m.date);
          if (!isNaN(d.getTime())) t = d.getTime();
        }
        if (!t && m.year) {
          t = new Date(m.year, 5, 1).getTime();
        }
        return { ...m, timestamp: t };
      })
      .filter((m) => m.timestamp > 0);

    if (parsed.length === 0) return null;

    const timestamps = parsed.map((m) => m.timestamp);
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);

    const minYear = new Date(minTime).getFullYear();
    const maxYear = new Date(maxTime).getFullYear();

    let domainStart, domainEnd;
    if (minYear === maxYear) {
      domainStart = new Date(minYear, 0, 1).getTime();
      domainEnd = new Date(minYear, 11, 31, 23, 59, 59).getTime();
    } else {
      domainStart = new Date(minYear, 0, 1).getTime();
      domainEnd = new Date(maxYear + 1, 0, 1).getTime();
    }
    const timeSpan = Math.max(1, domainEnd - domainStart);

    // Map items to x position
    const items = parsed
      .map((m) => {
        const x = margin.left + ((m.timestamp - domainStart) / timeSpan) * plotW;
        return { ...m, x };
      })
      .sort((a, b) => a.x - b.x);

    // Deterministic beeswarm packing algorithm
    const radius = 3.8;
    const overlapFactor = 0.60;
    const minDist = 2 * radius * overlapFactor;
    const minDist2 = minDist * minDist;
    const placed = [];

    for (let i = 0; i < items.length; i++) {
      const x = items[i].x;
      const active = [];
      for (let j = placed.length - 1; j >= 0; j--) {
        if (x - placed[j].x >= minDist) break;
        active.push(placed[j]);
      }

      const candidates = [0];
      for (const p of active) {
        const dx = Math.abs(x - p.x);
        if (dx < minDist) {
          const dy = Math.sqrt(minDist2 - dx * dx);
          candidates.push(p.y + dy, p.y - dy);
        }
      }
      candidates.sort((a, b) => Math.abs(a) - Math.abs(b));

      let bestY = 0;
      for (const cy of candidates) {
        let collides = false;
        for (const p of active) {
          const dx = x - p.x;
          const dy = cy - p.y;
          if (dx * dx + dy * dy < minDist2 - 1e-4) {
            collides = true;
            break;
          }
        }
        if (!collides) {
          bestY = cy;
          break;
        }
      }
      placed.push({ ...items[i], y: bestY });
    }

    const ys = placed.map((p) => p.y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const clusterHeight = maxY - minY;
    const axisY = margin.top + clusterHeight + 16;
    const chartHeight = Math.max(125, Math.ceil(axisY + margin.bottom));

    const dots = placed.map((p) => ({
      ...p,
      cx: Number(p.x.toFixed(2)),
      cy: Number((margin.top + (p.y - minY)).toFixed(2)),
      color: getRatingColor(p.rating),
    }));

    // Dynamic year ticks: yearly (<=6 yrs), every 2 yrs (<=14 yrs), every 5 yrs (>14 yrs)
    const spanYears = maxYear - minYear;
    let step = 5;
    if (spanYears <= 6) step = 1;
    else if (spanYears <= 14) step = 2;

    const ticks = [];
    const firstTick = step === 1 ? minYear : Math.ceil(minYear / step) * step;
    for (let y = firstTick; y <= maxYear; y += step) {
      const t = new Date(y, 0, 1).getTime();
      const tx = margin.left + ((t - domainStart) / timeSpan) * plotW;
      ticks.push({ year: y, x: Number(tx.toFixed(2)) });
    }

    return {
      width,
      chartHeight,
      axisY,
      margin,
      dots,
      ticks,
      minYear,
      maxYear,
      spanYears,
      radius,
    };
  }, [timeline]);

  if (!timeline || timeline.length === 0 || !layout) return null;

  const handleDotClick = (meal) => {
    if (onSelectMeal) {
      onSelectMeal(meal.id);
    }
  };

  return (
    <div className="people-card individual-timeline-card">
      <div className="people-card-header">
        <div className="people-card-title-group">
          <h3 className="people-card-title">
            <Clock size={18} />
            Meal History Timeline ({timeline.length.toLocaleString()} {timeline.length === 1 ? 'meal' : 'meals'})
          </h3>
        </div>
      </div>

      {/* 8-Rating Canonical Legend */}
      <div className="timeline-legend" aria-label="Rating Color Legend">
        {CANONICAL_LEGEND.map((item) => (
          <div key={item.label} className="timeline-legend-item">
            <span
              className="timeline-legend-dot"
              style={{ backgroundColor: item.color }}
              aria-hidden="true"
            />
            <span className="timeline-legend-label">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Beeswarm Chart Container */}
      <div
        className="timeline-beeswarm-container"
        ref={containerRef}
        onMouseLeave={() => setActiveMeal(null)}
      >
        <svg
          className="timeline-beeswarm-svg"
          viewBox={`0 0 ${layout.width} ${layout.chartHeight}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Meal history timeline for ${timeline.length} meals spanning from ${layout.minYear} to ${layout.maxYear}`}
        >
          {/* Axis grid tick lines */}
          <g className="timeline-axis-grid">
            {layout.ticks.map((tick) => (
              <line
                key={`grid-${tick.year}`}
                x1={tick.x}
                y1={layout.margin.top - 6}
                x2={tick.x}
                y2={layout.axisY}
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="2 3"
              />
            ))}
          </g>

          {/* Baseline axis line */}
          <line
            x1={layout.margin.left - 10}
            y1={layout.axisY}
            x2={layout.width - layout.margin.right + 10}
            y2={layout.axisY}
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />

          {/* Axis ticks and year labels */}
          <g className="timeline-axis-labels">
            {layout.ticks.map((tick) => (
              <g key={`tick-${tick.year}`} className="timeline-tick-group">
                <line
                  x1={tick.x}
                  y1={layout.axisY}
                  x2={tick.x}
                  y2={layout.axisY + 5}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                />
                <text
                  x={tick.x}
                  y={layout.axisY + 18}
                  textAnchor="middle"
                  className="timeline-tick-text"
                >
                  {tick.year}
                </text>
              </g>
            ))}
          </g>

          {/* Beeswarm Meal Dots */}
          <g className="timeline-dots-layer">
            {layout.dots.map((dot) => {
              const isHovered = activeMeal && activeMeal.id === dot.id;
              return (
                <g
                  key={dot.id}
                  className={`beeswarm-dot-group ${isHovered ? 'is-active' : ''}`}
                  onMouseEnter={() => setActiveMeal(dot)}
                  onClick={() => handleDotClick(dot)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${dot.restaurantName}, ${dot.formattedDate}, Rated: ${dot.rating}${dot.formattedValue ? `, Cost: ${dot.formattedValue}` : ''}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleDotClick(dot);
                    }
                  }}
                >
                  {/* Invisible hit target for smooth touch/hover */}
                  <circle cx={dot.cx} cy={dot.cy} r={8.5} fill="transparent" />

                  {/* Active hover ring */}
                  {isHovered && (
                    <circle
                      cx={dot.cx}
                      cy={dot.cy}
                      r={layout.radius + 3.2}
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="1.6"
                      opacity="0.85"
                    />
                  )}

                  {/* Visual meal circle */}
                  <circle
                    className="beeswarm-mark"
                    cx={dot.cx}
                    cy={dot.cy}
                    r={isHovered ? layout.radius + 1.2 : layout.radius}
                    fill={dot.color}
                    stroke="#ffffff"
                    strokeWidth={isHovered ? 1.6 : 1.1}
                  />
                </g>
              );
            })}
          </g>
        </svg>

        {/* Floating Tooltip */}
        {activeMeal && (
          <div
            className="timeline-tooltip"
            style={{
              left: `${(activeMeal.cx / layout.width) * 100}%`,
              top: `${(activeMeal.cy / layout.chartHeight) * 100}%`,
              transform: `translate(${
                activeMeal.cx < 180 ? '-10%' : activeMeal.cx > 820 ? '-90%' : '-50%'
              }, ${activeMeal.cy < 110 ? '16px' : 'calc(-100% - 12px)'})`,
            }}
            onClick={() => handleDotClick(activeMeal)}
          >
            <div className="timeline-tooltip-header">
              <strong className="timeline-tooltip-restaurant">
                {activeMeal.restaurantName}
              </strong>
              <button
                type="button"
                className="timeline-tooltip-close"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMeal(null);
                }}
                aria-label="Close tooltip"
              >
                <X size={12} />
              </button>
            </div>

            <div className="timeline-tooltip-meta">
              <span className="timeline-tooltip-meta-item">
                <Calendar size={12} />
                {activeMeal.formattedDate}
              </span>
              {activeMeal.city && (
                <span className="timeline-tooltip-meta-item">
                  <MapPin size={12} />
                  {activeMeal.city}
                </span>
              )}
            </div>

            <div className="timeline-tooltip-badges">
              <span
                className="timeline-tooltip-rating-badge"
                style={{ backgroundColor: activeMeal.color }}
              >
                {activeMeal.rating}
              </span>

              {activeMeal.formattedValue && (
                <span className="timeline-tooltip-value-badge">
                  {activeMeal.formattedValue}
                </span>
              )}

              {activeMeal.hasPhoto && (
                <span className="timeline-tooltip-photo-badge">
                  <Camera size={11} /> Photo
                </span>
              )}
            </div>

            {activeMeal.comment && (
              <p className="timeline-tooltip-comment">
                “{activeMeal.comment.length > 130 ? activeMeal.comment.slice(0, 130) + '…' : activeMeal.comment}”
              </p>
            )}

            <div className="timeline-tooltip-action">
              <span>View meal details in Chronicle</span>
              <ChevronRight size={13} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
