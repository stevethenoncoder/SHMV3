import React, { useState, useMemo } from 'react';
import { Calendar, Compass, Sparkles, Repeat } from 'lucide-react';
import './MealsOverTimeNewRepeatHero.css';

export default function MealsOverTimeNewRepeatHero({
  series,
  onSelectPeriod,
}) {
  const [hoveredBar, setHoveredBar] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const { periods = [], maxTotal = 1, granularity = 'year' } = series || {};

  const totalNew = useMemo(() => periods.reduce((sum, p) => sum + p.newCount, 0), [periods]);
  const totalRepeat = useMemo(() => periods.reduce((sum, p) => sum + p.repeatCount, 0), [periods]);
  const totalMeals = totalNew + totalRepeat;
  const overallExplorationRate = totalMeals > 0 ? Math.round((totalNew / totalMeals) * 100) : 0;

  if (periods.length === 0) {
    return (
      <div className="stats-card hero-card">
        <h3 className="stats-card-title">Meals Over Time (New vs Repeat)</h3>
        <div className="stats-empty-block">No dining history found for this selection.</div>
      </div>
    );
  }

  return (
    <div className="stats-card hero-card">
      <div className="stats-card-header">
        <div>
          <h3 className="stats-card-title">Meals Over Time (New vs Repeat)</h3>
          <p className="stats-card-subtitle">
            Historical dining volume decomposed into first-ever discoveries vs returning visits ({totalMeals.toLocaleString()} total meals)
          </p>
        </div>

        {/* Legend */}
        <div className="hero-legend-wrap">
          <div className="hero-legend-pill new">
            <span className="legend-dot green" />
            <span>New Venues ({totalNew.toLocaleString()} · {overallExplorationRate}%)</span>
          </div>
          <div className="hero-legend-pill repeat">
            <span className="legend-dot blue" />
            <span>Repeat Visits ({totalRepeat.toLocaleString()} · {100 - overallExplorationRate}%)</span>
          </div>
        </div>
      </div>

      <div
        className="hero-chart-container"
        onMouseLeave={() => setHoveredBar(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
      >
        <div className="hero-bars-track">
          {periods.map((p, idx) => {
            const heightPct = Math.max((p.total / maxTotal) * 100, 3);
            const newPct = p.total > 0 ? (p.newCount / p.total) * 100 : 0;
            const repeatPct = p.total > 0 ? (p.repeatCount / p.total) * 100 : 0;
            const isHovered = hoveredBar?.key === p.key;

            return (
              <div
                key={p.key}
                className={`hero-bar-column ${isHovered ? 'is-hovered' : ''}`}
                onMouseEnter={() => setHoveredBar(p)}
                onClick={() => {
                  if (onSelectPeriod && granularity === 'year') {
                    onSelectPeriod({ dateMode: 'year', year: p.key });
                  }
                }}
              >
                <div className="hero-stacked-bar" style={{ height: `${heightPct}%` }}>
                  {/* Repeat Visit (Blue, Top) */}
                  <div
                    className="hero-bar-slice slice-repeat"
                    style={{ height: `${repeatPct}%` }}
                  />
                  {/* New Restaurant (Green, Bottom) */}
                  <div
                    className="hero-bar-slice slice-new"
                    style={{ height: `${newPct}%` }}
                  />
                </div>
                <span className="hero-x-label">{p.label}</span>
              </div>
            );
          })}
        </div>

        {/* Floating Tooltip */}
        {hoveredBar && (
          <div
            className="hero-bar-tooltip"
            style={{
              left: `${Math.min(mousePos.x + 14, 800)}px`,
              top: `${Math.max(10, mousePos.y - 75)}px`,
            }}
          >
            <div className="hero-tt-header">
              {granularity === 'month' ? `${hoveredBar.label} (Month)` : `Year ${hoveredBar.label}`}
            </div>
            <div className="hero-tt-row green">
              <span>New Discoveries:</span>
              <strong>
                {hoveredBar.newCount.toLocaleString()} ({hoveredBar.explorationRate}%)
              </strong>
            </div>
            <div className="hero-tt-row blue">
              <span>Repeat Visits:</span>
              <strong>
                {hoveredBar.repeatCount.toLocaleString()} ({100 - hoveredBar.explorationRate}%)
              </strong>
            </div>
            <div className="hero-tt-row total">
              <span>Total Meals:</span>
              <strong>{hoveredBar.total.toLocaleString()}</strong>
            </div>
            {granularity === 'year' && (
              <div className="hero-tt-hint">Click bar to filter by {hoveredBar.label}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
