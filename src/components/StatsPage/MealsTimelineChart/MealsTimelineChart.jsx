import React, { useState, useMemo } from 'react';
import { Calendar, Filter } from 'lucide-react';
import './MealsTimelineChart.css';

/**
 * Builds smooth cubic bezier curve for SVG area and line path.
 */
function buildSmoothPath(points) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x + (p3.x - p1.x) / 6;
    const cp2y = p2.y + (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}

export default function MealsTimelineChart({
  timeline,
  onSelectPeriod,
  filterState,
}) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const { periods, maxCount, granularity, total } = timeline || {
    periods: [],
    maxCount: 1,
    granularity: 'year',
    total: 0,
  };

  // Dimensions
  const width = 1000;
  const height = 260;
  const paddingLeft = 48;
  const paddingRight = 24;
  const paddingTop = 28;
  const paddingBottom = 40;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const points = useMemo(() => {
    if (!periods || periods.length === 0) return [];
    const step = periods.length > 1 ? plotWidth / (periods.length - 1) : plotWidth / 2;

    return periods.map((p, idx) => {
      const x = paddingLeft + (periods.length > 1 ? idx * step : plotWidth / 2);
      const y = paddingTop + plotHeight - (p.count / maxCount) * plotHeight;
      return { ...p, x, y, idx };
    });
  }, [periods, maxCount, plotWidth, plotHeight, paddingLeft, paddingTop]);

  const linePath = useMemo(() => buildSmoothPath(points), [points]);
  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const baseY = paddingTop + plotHeight;
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    return `${linePath} L ${lastX.toFixed(1)} ${baseY} L ${firstX.toFixed(1)} ${baseY} Z`;
  }, [linePath, points, paddingTop, plotHeight]);

  // Y-axis grid ticks (4 ticks)
  const yTicks = useMemo(() => {
    const ticks = [];
    const step = Math.ceil(maxCount / 4);
    for (let i = 0; i <= 4; i++) {
      const val = i * step;
      const y = paddingTop + plotHeight - (val / (step * 4 || 1)) * plotHeight;
      ticks.push({ val, y });
    }
    return ticks;
  }, [maxCount, paddingTop, plotHeight]);

  if (periods.length === 0) {
    return (
      <div className="stats-card">
        <h3 className="stats-card-title">Meals Over Time</h3>
        <div className="stats-empty-block">No meals match your current filter selections.</div>
      </div>
    );
  }

  return (
    <div className="stats-card timeline-card">
      <div className="stats-card-header">
        <div>
          <h3 className="stats-card-title">Meals Over Time</h3>
          <p className="stats-card-subtitle">
            {granularity === 'month'
              ? 'Monthly dining frequency for the selected year'
              : `Annual dining cadence spanning ${periods.length} years (${total.toLocaleString()} total meals)`}
          </p>
        </div>
        <div className="stats-card-badge">
          <Calendar size={13} />
          <span>{granularity === 'month' ? 'Monthly View' : 'Annual View'}</span>
        </div>
      </div>

      <div
        className="timeline-svg-wrap"
        onMouseLeave={() => setHoveredPoint(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="timeline-svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="timelineAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={tick.y}
                x2={width - paddingRight}
                y2={tick.y}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="axis-tick-text"
              >
                {tick.val}
              </text>
            </g>
          ))}

          {/* Area Fill */}
          <path d={areaPath} fill="url(#timelineAreaGrad)" />

          {/* Main Spline Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#0284c7"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* X Axis Labels & Points */}
          {points.map((pt, i) => {
            const isHovered = hoveredPoint?.key === pt.key;
            // Show every 2nd label if many periods
            const showLabel = periods.length <= 15 || i % 2 === 0 || i === periods.length - 1;

            return (
              <g
                key={pt.key}
                className="timeline-point-group"
                onClick={() => {
                  if (onSelectPeriod) {
                    if (granularity === 'year') {
                      onSelectPeriod({ dateMode: 'year', year: pt.key });
                    }
                  }
                }}
                onMouseEnter={() => setHoveredPoint(pt)}
              >
                {showLabel && (
                  <text
                    x={pt.x}
                    y={paddingTop + plotHeight + 20}
                    textAnchor="middle"
                    className={`axis-tick-text ${isHovered ? 'highlight' : ''}`}
                  >
                    {pt.label}
                  </text>
                )}

                {/* Point Hit Area & Marker */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 3.5}
                  fill={isHovered ? '#0284c7' : '#ffffff'}
                  stroke="#0284c7"
                  strokeWidth={isHovered ? 2.5 : 2}
                  className="point-circle"
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div
            className="timeline-tooltip"
            style={{
              left: `${mousePos.x + 12}px`,
              top: `${Math.max(10, mousePos.y - 48)}px`,
            }}
          >
            <div className="tooltip-period-title">
              {granularity === 'month' ? `${hoveredPoint.label} (Month)` : `Year ${hoveredPoint.label}`}
            </div>
            <div className="tooltip-stat-row">
              <span className="tooltip-stat-label">Meals:</span>
              <strong className="tooltip-stat-val">{hoveredPoint.count.toLocaleString()}</strong>
            </div>
            <div className="tooltip-stat-row">
              <span className="tooltip-stat-label">Unique Restaurants:</span>
              <span className="tooltip-stat-val">{hoveredPoint.uniqueCount.toLocaleString()}</span>
            </div>
            {granularity === 'year' && (
              <div className="tooltip-click-hint">Click point to filter by {hoveredPoint.label}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
