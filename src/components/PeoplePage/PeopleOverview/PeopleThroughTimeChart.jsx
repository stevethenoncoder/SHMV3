import React, { useState } from 'react';
import { Calendar } from 'lucide-react';

export default function PeopleThroughTimeChart({ series }) {
  const [hoveredPeriod, setHoveredPeriod] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const { periods = [], maxTotal = 1 } = series || {};

  const totalNewSum = periods.reduce((acc, p) => acc + p.newCount, 0);
  const totalRepeatSum = periods.reduce((acc, p) => acc + p.repeatCount, 0);

  return (
    <div className="people-card">
      <div className="people-card-header">
        <div className="people-card-title-group">
          <h3 className="people-card-title">
            <Calendar size={18} />
            People Through Time
          </h3>
          <p className="people-card-subtitle">
            Annual dining social volume: newly met dining companions vs returning companions
          </p>
        </div>

        {/* Legend */}
        <div className="people-chart-legend">
          <div className="legend-item">
            <span className="legend-swatch green" />
            <span>New Companions ({totalNewSum.toLocaleString()})</span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch blue" />
            <span>Returning Companions ({totalRepeatSum.toLocaleString()})</span>
          </div>
        </div>
      </div>

      <div
        className="people-time-chart-container"
        onMouseLeave={() => setHoveredPeriod(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
      >
        <div className="people-time-bars">
          {periods.map((p) => {
            const totalHeightPercent = Math.max(4, Math.round((p.totalUnique / maxTotal) * 100));
            const newRatio = p.totalUnique > 0 ? (p.newCount / p.totalUnique) * 100 : 0;
            const repeatRatio = 100 - newRatio;

            return (
              <div
                key={p.year}
                className="people-time-bar-col"
                onMouseEnter={() => setHoveredPeriod(p)}
              >
                <div
                  className="people-time-bar-stack"
                  style={{ height: `${totalHeightPercent}%` }}
                >
                  {p.newCount > 0 && (
                    <div
                      className="people-bar-segment new"
                      style={{ height: `${newRatio}%` }}
                    />
                  )}
                  {p.repeatCount > 0 && (
                    <div
                      className="people-bar-segment repeat"
                      style={{ height: `${repeatRatio}%` }}
                    />
                  )}
                </div>
                <span className="people-time-label">
                  {String(p.year).slice(2)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Floating Tooltip */}
        {hoveredPeriod && (
          <div
            className="network-tooltip"
            style={{
              left: `${Math.min(Math.max(mousePos.x - 70, 10), 450)}px`,
              top: `${Math.max(mousePos.y - 70, 10)}px`,
              bottom: 'auto',
            }}
          >
            <strong>{hoveredPeriod.year}</strong>
            <div>Total Companions: {hoveredPeriod.totalUnique.toLocaleString()}</div>
            <div style={{ color: '#34d399' }}>New: {hoveredPeriod.newCount.toLocaleString()}</div>
            <div style={{ color: '#60a5fa' }}>Returning: {hoveredPeriod.repeatCount.toLocaleString()}</div>
          </div>
        )}
      </div>
    </div>
  );
}
