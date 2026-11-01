import React, { useState, useMemo } from 'react';
import { PoundSterling, Briefcase, User } from 'lucide-react';
import './SpendByDayChart.css';

export default function SpendByDayChart({ spendData }) {
  const [hoveredRow, setHoveredRow] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const { rows = [], maxTotal = 1, overallSpend = 0 } = spendData || {};

  // Formatted ticks (e.g. 0, 5k, 10k, 15k, 20k)
  const ticks = useMemo(() => {
    // Upper bound rounded up to nearest 5k
    const upper = Math.ceil(maxTotal / 5000) * 5000;
    const step = upper / 4;
    return [0, step, step * 2, step * 3, upper].map((val) => ({
      val,
      label: val === 0 ? '0' : `${Math.round(val / 1000)}k`,
      pct: (val / upper) * 100,
    }));
  }, [maxTotal]);

  const domainUpper = ticks[ticks.length - 1].val || maxTotal;

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <div>
          <h3 className="stats-card-title">Spend by Day of Week</h3>
          <p className="stats-card-subtitle">
            Cumulative dining spend: Personal vs Business (Total £{overallSpend.toLocaleString()})
          </p>
        </div>

        {/* Legend matching user reference image */}
        <div className="spend-legend">
          <div className="spend-legend-item">
            <span className="spend-legend-swatch blue" />
            <span>Personal</span>
          </div>
          <div className="spend-legend-item">
            <span className="spend-legend-swatch rust" />
            <span>Business</span>
          </div>
        </div>
      </div>

      <div
        className="spend-chart-body"
        onMouseLeave={() => setHoveredRow(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
      >
        <div className="spend-rows-list">
          {rows.map((row) => {
            const isHovered = hoveredRow?.day === row.day;
            const barWidthPct = Math.min((row.total / domainUpper) * 100, 100);
            const personalSegmentPct = row.total > 0 ? (row.personal / row.total) * 100 : 0;
            const businessSegmentPct = row.total > 0 ? (row.business / row.total) * 100 : 0;

            return (
              <div
                key={row.day}
                className={`spend-row-item ${isHovered ? 'hovered' : ''}`}
                onMouseEnter={() => setHoveredRow(row)}
              >
                {/* Y-axis Day Label */}
                <div className="spend-day-label">
                  <span>{row.day}</span>
                </div>

                {/* Horizontal Stacked Bar Track */}
                <div className="spend-bar-outer-track">
                  {row.total > 0 && (
                    <div
                      className="spend-stacked-bar-fill"
                      style={{ width: `${barWidthPct}%` }}
                    >
                      {/* Personal (Blue) */}
                      <div
                        className="spend-slice personal"
                        style={{ width: `${personalSegmentPct}%` }}
                      />
                      {/* Business (Rust/Red) */}
                      <div
                        className="spend-slice business"
                        style={{ width: `${businessSegmentPct}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Total Spend text */}
                <div className="spend-row-total-val">
                  <span>£{Math.round(row.total).toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* X-axis Ticks (0, 5k, 10k, 15k, 20k) with grid vertical lines */}
        <div className="spend-x-axis-row">
          <div className="spend-x-axis-spacer" />
          <div className="spend-x-axis-ticks">
            {ticks.map((t) => (
              <span key={t.val} style={{ left: `${t.pct}%` }} className="tick-label">
                {t.label}
              </span>
            ))}
          </div>
          <div className="spend-x-axis-right-spacer" />
        </div>

        {/* Tooltip */}
        {hoveredRow && hoveredRow.total > 0 && (
          <div
            className="spend-tooltip"
            style={{
              left: `${Math.min(mousePos.x + 14, 400)}px`,
              top: `${Math.max(10, mousePos.y - 75)}px`,
            }}
          >
            <div className="spend-tt-header">{hoveredRow.day}</div>
            <div className="spend-tt-row blue">
              <span>Personal Spend:</span>
              <strong>
                £{Math.round(hoveredRow.personal).toLocaleString()} ({hoveredRow.personalPct}%)
              </strong>
            </div>
            <div className="spend-tt-row rust">
              <span>Business Spend:</span>
              <strong>
                £{Math.round(hoveredRow.business).toLocaleString()} ({hoveredRow.businessPct}%)
              </strong>
            </div>
            <div className="spend-tt-row total">
              <span>Total Spend:</span>
              <strong>£{Math.round(hoveredRow.total).toLocaleString()}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
