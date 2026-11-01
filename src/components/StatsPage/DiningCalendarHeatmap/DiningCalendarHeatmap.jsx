import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import './DiningCalendarHeatmap.css';

export default function DiningCalendarHeatmap({ heatmap }) {
  const [hoveredCell, setHoveredCell] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const {
    grid = [],
    maxCount = 1,
    totalInHeatmap = 0,
    dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  } = heatmap || {};

  const fullDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const fullMonthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  /**
   * Computes emerald/teal background color intensity.
   */
  const getCellColor = (count) => {
    if (count === 0) return '#f8fafc';
    const ratio = count / maxCount;
    if (ratio < 0.15) return '#d1fae5';
    if (ratio < 0.35) return '#a7f3d0';
    if (ratio < 0.6) return '#34d399';
    if (ratio < 0.85) return '#10b981';
    return '#047857';
  };

  const getTextColor = (count) => {
    if (count === 0) return '#cbd5e1';
    const ratio = count / maxCount;
    return ratio >= 0.6 ? '#ffffff' : '#065f46';
  };

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <div>
          <h3 className="stats-card-title">Dining Calendar Heatmap</h3>
          <p className="stats-card-subtitle">
            Historical distribution across Month × Day of Week ({totalInHeatmap.toLocaleString()} meals)
          </p>
        </div>
        <div className="heatmap-legend">
          <span className="legend-txt">Less</span>
          <span className="legend-cell c0" />
          <span className="legend-cell c1" />
          <span className="legend-cell c2" />
          <span className="legend-cell c3" />
          <span className="legend-cell c4" />
          <span className="legend-txt">More</span>
        </div>
      </div>

      <div
        className="heatmap-container"
        onMouseLeave={() => setHoveredCell(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
      >
        {/* Day of Week Column Headers */}
        <div className="heatmap-header-row">
          <div className="heatmap-corner-cell" />
          {dayNames.map((day, i) => (
            <div key={day} className="heatmap-col-header">
              {day}
            </div>
          ))}
        </div>

        {/* 12 Month Rows */}
        {grid.map((row, mIdx) => (
          <div key={monthNames[mIdx]} className="heatmap-row">
            <div className="heatmap-row-header">{monthNames[mIdx]}</div>
            {row.map((count, dIdx) => {
              const isHovered =
                hoveredCell && hoveredCell.mIdx === mIdx && hoveredCell.dIdx === dIdx;

              return (
                <div
                  key={`${mIdx}-${dIdx}`}
                  className={`heatmap-cell ${isHovered ? 'hovered' : ''}`}
                  style={{
                    backgroundColor: getCellColor(count),
                    color: getTextColor(count),
                  }}
                  onMouseEnter={() =>
                    setHoveredCell({
                      mIdx,
                      dIdx,
                      count,
                      dayName: fullDayNames[dIdx],
                      monthName: fullMonthNames[mIdx],
                    })
                  }
                >
                  <span className="cell-num">{count > 0 ? count : ''}</span>
                </div>
              );
            })}
          </div>
        ))}

        {/* Tooltip */}
        {hoveredCell && (
          <div
            className="heatmap-tooltip"
            style={{
              left: `${Math.min(mousePos.x + 14, 380)}px`,
              top: `${Math.max(10, mousePos.y - 48)}px`,
            }}
          >
            <div className="tooltip-title">
              {hoveredCell.dayName} in {hoveredCell.monthName}
            </div>
            <div className="tooltip-count">
              <strong>{hoveredCell.count.toLocaleString()}</strong>{' '}
              {hoveredCell.count === 1 ? 'meal' : 'meals'} recorded
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
