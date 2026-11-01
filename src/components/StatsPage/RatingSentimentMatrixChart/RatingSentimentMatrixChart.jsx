import React, { useState } from 'react';
import { Star, Smile } from 'lucide-react';
import './RatingSentimentMatrixChart.css';

export default function RatingSentimentMatrixChart({
  matrixData = [],
  activeRatings = [],
  onToggleRating,
}) {
  const [hoveredRow, setHoveredRow] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const maxRowTotal = Math.max(...matrixData.map((r) => r.total || 0), 1);

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <div>
          <h3 className="stats-card-title">Ratings by Sentiment Composition</h3>
          <p className="stats-card-subtitle">
            100% stacked emotional tone breakdown across the canonical meal ratings
          </p>
        </div>

        {/* Legend matching user reference image */}
        <div className="matrix-legend">
          <div className="matrix-legend-item">
            <span className="matrix-legend-swatch blue" />
            <span>Negative</span>
          </div>
          <div className="matrix-legend-item">
            <span className="matrix-legend-swatch orange" />
            <span>Neutral</span>
          </div>
          <div className="matrix-legend-item">
            <span className="matrix-legend-swatch yellow" />
            <span>No Comment</span>
          </div>
          <div className="matrix-legend-item">
            <span className="matrix-legend-swatch green" />
            <span>Positive</span>
          </div>
        </div>
      </div>

      <div
        className="matrix-chart-body"
        onMouseLeave={() => setHoveredRow(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
      >
        <div className="matrix-rows-list">
          {matrixData.map((row) => {
            const isSelected = activeRatings.includes(row.rating);
            const isHovered = hoveredRow?.id === row.id;
            const displayLabel =
              row.displayLabel ||
              (row.id === 5 || row.rating === "OK but wouldn't recommend"
                ? 'Okay'
                : row.id === 8 || row.rating === 'The Worst in the World'
                ? 'The worst'
                : row.rating);
            const pctOfMax = row.total > 0 ? Math.round((row.total / maxRowTotal) * 100) : 0;

            return (
              <div
                key={row.id}
                className={`matrix-row-item ${isSelected ? 'is-selected' : ''}`}
                onMouseEnter={() => setHoveredRow({ ...row, displayLabel })}
                onClick={() => onToggleRating && onToggleRating(row.rating)}
                role="button"
                tabIndex={0}
                title={`Click to filter by ${displayLabel}`}
              >
                {/* Y-axis Label */}
                <div className="matrix-row-y-label">
                  <span className="matrix-rating-name">{displayLabel}</span>
                </div>

                {/* 100% Stacked Bar */}
                <div className="matrix-bar-track">
                  {row.total > 0 ? (
                    <>
                      {/* 1. Negative (Blue) */}
                      {row.negativePct > 0 && (
                        <div
                          className="matrix-segment seg-negative"
                          style={{ width: `${row.negativePct}%` }}
                        />
                      )}
                      {/* 2. Neutral (Orange/Red) */}
                      {row.neutralPct > 0 && (
                        <div
                          className="matrix-segment seg-neutral"
                          style={{ width: `${row.neutralPct}%` }}
                        />
                      )}
                      {/* 3. No Comment (Yellow) */}
                      {row.noCommentPct > 0 && (
                        <div
                          className="matrix-segment seg-nocomment"
                          style={{ width: `${row.noCommentPct}%` }}
                        />
                      )}
                      {/* 4. Positive (Green) */}
                      {row.positivePct > 0 && (
                        <div
                          className="matrix-segment seg-positive"
                          style={{ width: `${row.positivePct}%` }}
                        />
                      )}
                    </>
                  ) : (
                    <div className="matrix-segment empty" style={{ width: '100%' }} />
                  )}
                </div>

                {/* Row Volume: Mini Line Graph & Count */}
                <div
                  className="matrix-row-volume"
                  title={`${displayLabel}: ${row.total.toLocaleString()} meals (${pctOfMax}% of peak)`}
                >
                  <div className="matrix-spark-track">
                    <div
                      className="matrix-spark-line"
                      style={{
                        width: `${row.total > 0 ? Math.max(pctOfMax, 3) : 0}%`,
                      }}
                    >
                      {row.total > 0 && <span className="matrix-spark-dot" />}
                    </div>
                  </div>
                  <span className="matrix-row-total-val">{row.total.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* X-axis Percent Marks (0%, 25%, 50%, 75%, 100%) */}
        <div className="matrix-x-axis-row">
          <div className="matrix-x-axis-spacer" />
          <div className="matrix-x-axis-ticks">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
          <div className="matrix-x-axis-right-spacer">
            <span>Volume</span>
          </div>
        </div>

        {/* Tooltip */}
        {hoveredRow && hoveredRow.total > 0 && (
          <div
            className="matrix-tooltip"
            style={{
              left: `${Math.min(mousePos.x + 14, 400)}px`,
              top: `${Math.max(10, mousePos.y - 75)}px`,
            }}
          >
            <div className="matrix-tt-title">
              {hoveredRow.displayLabel || hoveredRow.rating} ({hoveredRow.total.toLocaleString()} meals)
            </div>
            <div className="matrix-tt-row green">
              <span>Positive:</span>
              <strong>
                {hoveredRow.positive.toLocaleString()} ({hoveredRow.positivePct}%)
              </strong>
            </div>
            <div className="matrix-tt-row orange">
              <span>Neutral:</span>
              <strong>
                {hoveredRow.neutral.toLocaleString()} ({hoveredRow.neutralPct}%)
              </strong>
            </div>
            <div className="matrix-tt-row blue">
              <span>Negative:</span>
              <strong>
                {hoveredRow.negative.toLocaleString()} ({hoveredRow.negativePct}%)
              </strong>
            </div>
            {hoveredRow.noComment > 0 && (
              <div className="matrix-tt-row yellow">
                <span>No Comment:</span>
                <strong>
                  {hoveredRow.noComment.toLocaleString()} ({hoveredRow.noCommentPct}%)
                </strong>
              </div>
            )}
            <div className="matrix-tt-hint">Click row to filter by {hoveredRow.rating}</div>
          </div>
        )}
      </div>
    </div>
  );
}
