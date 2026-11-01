import React, { useState } from 'react';
import { Compass, Sparkles, Repeat } from 'lucide-react';
import './NewRepeatChart.css';

export default function NewRepeatChart({
  series,
  onSelectPeriod,
}) {
  const [hoveredBar, setHoveredBar] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const { periods = [], maxTotal = 1, granularity = 'year' } = series || {};

  if (periods.length === 0) {
    return (
      <div className="stats-card">
        <h3 className="stats-card-title">New vs Repeat Restaurants</h3>
        <div className="stats-empty-block">No restaurant visit history for this selection.</div>
      </div>
    );
  }

  // Calculate overall exploration rate
  const totalNew = periods.reduce((sum, p) => sum + p.newCount, 0);
  const totalRepeat = periods.reduce((sum, p) => sum + p.repeatCount, 0);
  const overallRate = totalNew + totalRepeat > 0 ? Math.round((totalNew / (totalNew + totalRepeat)) * 100) : 0;

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <div>
          <h3 className="stats-card-title">New vs Repeat Exploration</h3>
          <p className="stats-card-subtitle">
            First-ever discoveries vs returning visits across time
          </p>
        </div>
        <div className="new-repeat-legend">
          <div className="legend-item">
            <span className="legend-dot new-dot" />
            <span>New ({overallRate}%)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot repeat-dot" />
            <span>Repeat ({100 - overallRate}%)</span>
          </div>
        </div>
      </div>

      <div
        className="stacked-bars-container"
        onMouseLeave={() => setHoveredBar(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
      >
        <div className="stacked-bars-track">
          {periods.map((p) => {
            const heightPct = Math.max((p.total / maxTotal) * 100, 2);
            const newPct = p.total > 0 ? (p.newCount / p.total) * 100 : 0;
            const repeatPct = p.total > 0 ? (p.repeatCount / p.total) * 100 : 0;
            const isHovered = hoveredBar?.key === p.key;

            return (
              <div
                key={p.key}
                className={`stacked-bar-col ${isHovered ? 'hovered' : ''}`}
                onMouseEnter={() => setHoveredBar(p)}
                onClick={() => {
                  if (onSelectPeriod && granularity === 'year') {
                    onSelectPeriod({ dateMode: 'year', year: p.key });
                  }
                }}
              >
                <div className="stacked-bar-outer" style={{ height: `${heightPct}%` }}>
                  {/* Repeat Visit Portion (top) */}
                  <div
                    className="bar-segment repeat-segment"
                    style={{ height: `${repeatPct}%` }}
                  />
                  {/* New Restaurant Portion (bottom) */}
                  <div
                    className="bar-segment new-segment"
                    style={{ height: `${newPct}%` }}
                  />
                </div>
                <span className="bar-x-label">{p.label}</span>
              </div>
            );
          })}
        </div>

        {/* Tooltip */}
        {hoveredBar && (
          <div
            className="stacked-tooltip"
            style={{
              left: `${Math.min(mousePos.x + 12, 380)}px`,
              top: `${Math.max(10, mousePos.y - 65)}px`,
            }}
          >
            <div className="tooltip-title">
              {granularity === 'month' ? `${hoveredBar.label} (Month)` : `Year ${hoveredBar.label}`}
            </div>
            <div className="tooltip-row green">
              <span>New Venues:</span>
              <strong>{hoveredBar.newCount} ({hoveredBar.explorationRate}%)</strong>
            </div>
            <div className="tooltip-row blue">
              <span>Repeat Visits:</span>
              <strong>{hoveredBar.repeatCount} ({100 - hoveredBar.explorationRate}%)</strong>
            </div>
            <div className="tooltip-row total">
              <span>Total Visits:</span>
              <strong>{hoveredBar.total}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
