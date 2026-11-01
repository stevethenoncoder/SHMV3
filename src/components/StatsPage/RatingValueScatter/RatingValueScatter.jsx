import React, { useState, useMemo } from 'react';
import { CircleDot } from 'lucide-react';
import { CANONICAL_MEAL_RATINGS } from '../../../utils/statsAnalytics.js';
import './RatingValueScatter.css';

export default function RatingValueScatter({ scatterData, onToggleRating }) {
  const [hoveredBubble, setHoveredBubble] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const {
    bubbles = [],
    buckets = [],
    count = 0,
    maxBubbleCount = 1,
  } = scatterData || {};

  // Chart Dimensions
  const width = 900;
  const height = 340;
  const paddingLeft = 96;
  const paddingRight = 35;
  const paddingTop = 25;
  const paddingBottom = 45;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  // X-axis coordinate mapping for the 11 buckets (0, 10, 20... 100)
  const bucketMap = useMemo(() => {
    const map = new Map();
    const totalBuckets = Math.max(buckets.length - 1, 1);
    buckets.forEach((b, idx) => {
      const cx = paddingLeft + (idx / totalBuckets) * plotWidth;
      map.set(b.bucket, { ...b, cx, idx });
    });
    return map;
  }, [buckets, paddingLeft, plotWidth]);

  // Y-axis 8 rating bands (rank 1 at top = The Dogs, rank 8 at bottom = The worst)
  const yBands = useMemo(() => {
    return CANONICAL_MEAL_RATINGS.map((r) => {
      const cy = paddingTop + ((r.id - 1) / 7) * plotHeight;
      const displayLabel =
        r.displayLabel ||
        (r.id === 5 ? 'Okay' : r.id === 8 ? 'The worst' : r.text);
      return { ...r, cy, displayLabel };
    });
  }, [plotHeight, paddingTop]);

  if (count === 0) {
    return (
      <div className="stats-card">
        <h3 className="stats-card-title">Rating vs Meal Spend</h3>
        <div className="stats-empty-block">No recorded meal values in this selection.</div>
      </div>
    );
  }

  // Calculate bubble radius using square-root scaling (proportional to area)
  const minRadius = 4;
  const maxRadius = 25;

  return (
    <div className="stats-card bubble-card">
      <div className="stats-card-header">
        <div>
          <h3 className="stats-card-title">Rating vs Meal Value</h3>
          <p className="stats-card-subtitle">
            Bubble size indicates meal count across ratings and spend tiers ({count.toLocaleString()} evaluated meals with prices)
          </p>
        </div>
        <div className="stats-card-badge">
          <CircleDot size={13} />
          <span>Bubble Chart</span>
        </div>
      </div>

      <div
        className="bubble-svg-wrap"
        onMouseLeave={() => setHoveredBubble(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="bubble-svg"
          preserveAspectRatio="none"
        >
          {/* Horizontal Grid lines & Y-axis Rating Labels */}
          {yBands.map((band) => (
            <g key={band.id}>
              <line
                x1={paddingLeft}
                y1={band.cy}
                x2={width - paddingRight}
                y2={band.cy}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 10}
                y={band.cy + 3.5}
                textAnchor="end"
                className="y-rating-label"
              >
                {band.displayLabel}
              </text>
            </g>
          ))}

          {/* Vertical Grid lines & X-axis Bucket Labels */}
          {Array.from(bucketMap.values()).map((b) => (
            <g key={b.bucket}>
              <line
                x1={b.cx}
                y1={paddingTop}
                x2={b.cx}
                y2={paddingTop + plotHeight}
                stroke="#f8fafc"
                strokeWidth="1"
              />
              <text
                x={b.cx}
                y={paddingTop + plotHeight + 18}
                textAnchor="middle"
                className="x-value-label"
              >
                {b.label}
              </text>
            </g>
          ))}

          {/* X Axis Unit Label */}
          <text
            x={paddingLeft + plotWidth / 2}
            y={height - 8}
            textAnchor="middle"
            className="x-axis-unit-label"
          >
            Meal Spend Bucket (£ per person)
          </text>

          {/* Bubbles */}
          {bubbles.map((b) => {
            const bucketInfo = bucketMap.get(b.bucket);
            const bandInfo = yBands.find((y) => y.id === b.ratingId);
            if (!bucketInfo || !bandInfo) return null;

            const cx = bucketInfo.cx;
            const cy = bandInfo.cy;
            const r =
              minRadius +
              Math.sqrt(b.count / maxBubbleCount) * (maxRadius - minRadius);
            const isHovered =
              hoveredBubble?.ratingId === b.ratingId &&
              hoveredBubble?.bucket === b.bucket;

            return (
              <g
                key={`${b.ratingId}_${b.bucket}`}
                className="bubble-group"
                onClick={() => onToggleRating && onToggleRating(b.ratingText)}
                onMouseEnter={() =>
                  setHoveredBubble({ ...b, cx, cy, r, totalDatasetPriced: count })
                }
              >
                {/* Outer Glow / Focus Ring when Hovered */}
                {isHovered && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r + 3.5}
                    fill="none"
                    stroke={b.ratingColor || '#0284c7'}
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    className="bubble-focus-ring"
                  />
                )}

                {/* Main Bubble */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={b.ratingColor || '#0284c7'}
                  fillOpacity={isHovered ? 0.92 : 0.65}
                  stroke={isHovered ? '#0f172a' : b.ratingColor || '#0284c7'}
                  strokeWidth={isHovered ? 2 : 1.2}
                  className="bubble-circle"
                />

                {/* Count text inside larger bubbles (r >= 12px) */}
                {r >= 12 && (
                  <text
                    x={cx}
                    y={cy + 0.5}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="bubble-count-text"
                  >
                    {b.count}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredBubble && (
          <div
            className="bubble-tooltip"
            style={{
              left: `${Math.min(Math.max(mousePos.x - 70, 10), width - 230)}px`,
              top: `${Math.max(10, mousePos.y - 120)}px`,
            }}
          >
            <div className="bubble-tooltip-title">
              <span
                className="bubble-tt-swatch"
                style={{ backgroundColor: hoveredBubble.ratingColor }}
              />
              <strong>{hoveredBubble.displayLabel || hoveredBubble.ratingText}</strong>
              <span className="bubble-tt-bucket">({hoveredBubble.rangeLabel})</span>
            </div>

            <div className="bubble-tooltip-row">
              <span>Meals Count:</span>
              <strong>
                {hoveredBubble.count.toLocaleString()} (
                {Math.round((hoveredBubble.count / count) * 1000) / 10}%)
              </strong>
            </div>

            <div className="bubble-tooltip-row">
              <span>Average Spend:</span>
              <strong>£{hoveredBubble.avgSpend.toFixed(2)}</strong>
            </div>

            <div className="bubble-tooltip-row">
              <span>Total Bucket Spend:</span>
              <strong>£{Math.round(hoveredBubble.totalSpend).toLocaleString()}</strong>
            </div>

            {hoveredBubble.topRestaurants && hoveredBubble.topRestaurants.length > 0 && (
              <div className="bubble-tooltip-venues">
                <span className="venues-heading">Top Destinations:</span>
                <span className="venues-list">
                  {hoveredBubble.topRestaurants.join(', ')}
                </span>
              </div>
            )}

            <div className="bubble-tooltip-hint">
              Click bubble to filter by {hoveredBubble.displayLabel || hoveredBubble.ratingText}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
