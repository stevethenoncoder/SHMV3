import React, { useState, useRef } from 'react';
import { Users2, EyeOff, MessageSquareHeart } from 'lucide-react';

export default function IndividualCompanions({
  companions = [],
  privateMealsCount = 0,
  sentimentWordCloud,
  sentimentCounts = {},
  personName = '',
  onSelectPerson,
}) {
  const [hoveredWord, setHoveredWord] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, isBelow: false });
  const containerRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const isBelow = y < 70;
    const clampedX = Math.max(70, Math.min(rect.width - 70, x));
    const targetY = isBelow ? y + 20 : y - 10;
    setTooltipPos({ x: clampedX, y: targetY, isBelow });
  };

  const { words = [], totalSentiments = 0 } = sentimentWordCloud || {};

  // Compute sentiment category percentages
  const totalCategoryCount =
    (sentimentCounts.Positive || 0) +
    (sentimentCounts.Neutral || 0) +
    (sentimentCounts.Negative || 0);

  const posPct =
    totalCategoryCount > 0
      ? Math.round(((sentimentCounts.Positive || 0) / totalCategoryCount) * 100)
      : 0;
  const neuPct =
    totalCategoryCount > 0
      ? Math.round(((sentimentCounts.Neutral || 0) / totalCategoryCount) * 100)
      : 0;
  const negPct =
    totalCategoryCount > 0
      ? Math.round(((sentimentCounts.Negative || 0) / totalCategoryCount) * 100)
      : 0;

  return (
    <div className="table-sentiment-split-grid">
      {/* 1. Left Half: Who Else Was at the Table? */}
      <div className="people-card companions-split-card">
        <div className="people-card-header">
          <div className="people-card-title-group">
            <h3 className="people-card-title">
              <Users2 size={18} />
              Who Else Was at the Table?
            </h3>
            <p className="people-card-subtitle">
              Most frequent co-companions present when dining with {personName}
            </p>
          </div>
        </div>

        <div className="co-companions-list-wrap">
          {companions.length > 0 ? (
            <div className="co-companions-scroll-list">
              {companions.map((comp) => (
                <div
                  key={comp.id}
                  className="co-companion-row"
                  onClick={() => onSelectPerson && onSelectPerson(comp)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (onSelectPerson) onSelectPerson(comp);
                    }
                  }}
                >
                  <div className="co-companion-info">
                    <span className="co-companion-name">{comp.name}</span>
                    <span className="co-companion-pct">
                      Co-attended {comp.percentage}% of meals with {personName}
                    </span>
                  </div>
                  <span className="group-meals-badge">
                    {comp.count.toLocaleString()} {comp.count === 1 ? 'meal' : 'meals'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="stats-empty-block">
              No other dining companions recorded when dining with {personName}.
            </div>
          )}
        </div>

        {privateMealsCount > 0 && (
          <div className="private-companions-pill">
            <EyeOff size={13} />
            <span>+ {privateMealsCount} meals also attended by private dining companions</span>
          </div>
        )}
      </div>

      {/* 2. Right Half: What Stevi Thought About the Meal When Dining with You */}
      <div className="people-card sentiment-split-card">
        <div className="people-card-header">
          <div className="people-card-title-group">
            <h3 className="people-card-title">
              <MessageSquareHeart size={18} />
              What Stevi Thought About the Meal When Dining with {personName}
            </h3>
            <p className="people-card-subtitle">
              High-level sentiment reflections from shared dining ({words.length} sentiments, {totalSentiments.toLocaleString()} occurrences)
            </p>
          </div>
        </div>

        {/* Sentiment Category Summary Pills */}
        {totalCategoryCount > 0 && (
          <div className="sentiment-summary-bar">
            <span className="sentiment-summary-pill positive">
              Positive {posPct}% ({sentimentCounts.Positive || 0})
            </span>
            <span className="sentiment-summary-pill neutral">
              Neutral {neuPct}% ({sentimentCounts.Neutral || 0})
            </span>
            <span className="sentiment-summary-pill negative">
              Negative {negPct}% ({sentimentCounts.Negative || 0})
            </span>
          </div>
        )}

        {/* Sentiment Word Cloud Container */}
        <div
          className="individual-word-cloud-container"
          onMouseLeave={() => setHoveredWord(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          }}
        >
          {words.length > 0 ? (
            words.map((w) => (
              <span
                key={w.text}
                className={`word-cloud-tag ${w.dominantCategory.toLowerCase()}`}
                style={{
                  fontSize: `${w.fontSize}px`,
                  fontWeight: w.count >= 10 ? 800 : w.count >= 5 ? 700 : 500,
                }}
                onMouseEnter={() => setHoveredWord(w)}
              >
                {w.text}
                <span className="word-count-sup">{w.count}</span>
              </span>
            ))
          ) : (
            <div className="stats-empty-block">
              No sentiment reflections recorded for meals with {personName}.
            </div>
          )}

          {/* Floating Hover Tooltip */}
          {hoveredWord && (
            <div
              className="word-cloud-tooltip"
              style={{
                left: `${mousePos.x + 12}px`,
                top: `${mousePos.y - 35}px`,
              }}
            >
              <div className="word-tt-title">{hoveredWord.text}</div>
              <div>
                {hoveredWord.count} {hoveredWord.count === 1 ? 'meal' : 'meals'} ({hoveredWord.dominantCategory})
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
