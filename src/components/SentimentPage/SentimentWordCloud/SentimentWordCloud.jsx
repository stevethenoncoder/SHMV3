import React, { useState } from 'react';
import { Cloud, X } from 'lucide-react';
import './SentimentWordCloud.css';

export default function SentimentWordCloud({
  wordCloudData,
  selectedWord = null,
  onSelectWord,
}) {
  const [hoveredWord, setHoveredWord] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const { words = [], totalSentiments = 0 } = wordCloudData || {};

  return (
    <div className="stats-card word-cloud-card">
      <div className="stats-card-header">
        <div>
          <h3 className="stats-card-title">Sentiment Word Cloud</h3>
          <p className="stats-card-subtitle">
            Word frequencies from actual meal sentiments ({words.length} sentiments, {totalSentiments.toLocaleString()} occurrences)
          </p>
        </div>
        <div className="stats-card-badge">
          <Cloud size={13} />
          <span>Word Cloud</span>
        </div>
      </div>

      {/* Active word filter chip */}
      {selectedWord && (
        <div className="active-word-filter-banner">
          <span className="active-word-text">
            Filtering comments by: <strong>"{selectedWord}"</strong>
          </span>
          <button
            type="button"
            className="clear-word-btn"
            onClick={() => onSelectWord && onSelectWord(null)}
            title="Clear sentiment word filter"
          >
            <X size={13} />
            <span>Clear filter</span>
          </button>
        </div>
      )}

      {/* Word Cloud Flow Area */}
      <div
        className="word-cloud-container"
        onMouseLeave={() => setHoveredWord(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
      >
        {words.length > 0 ? (
          words.map((w) => {
            const isSelected = selectedWord?.toLowerCase() === w.text.toLowerCase();
            const isHovered = hoveredWord?.text === w.text;

            return (
              <button
                key={w.text}
                type="button"
                className={`word-cloud-tag ${w.dominantCategory.toLowerCase()} ${
                  isSelected ? 'is-selected' : ''
                } ${isHovered ? 'is-hovered' : ''}`}
                style={{
                  fontSize: `${w.fontSize}px`,
                  fontWeight: w.count > 100 ? 800 : w.count > 50 ? 700 : w.count > 20 ? 600 : 500,
                }}
                onClick={() =>
                  onSelectWord && onSelectWord(isSelected ? null : w.text)
                }
                onMouseEnter={() => setHoveredWord(w)}
                title={`Click to filter comments by "${w.text}" (${w.count} meals)`}
              >
                {w.text}
                <span className="word-count-sup">{w.count}</span>
              </button>
            );
          })
        ) : (
          <div className="stats-empty-block">
            No sentiment words match the current sentiment filters.
          </div>
        )}

        {/* Floating Tooltip */}
        {hoveredWord && (
          <div
            className="word-cloud-tooltip"
            style={{
              left: `${Math.min(Math.max(mousePos.x - 60, 10), 320)}px`,
              top: `${Math.max(10, mousePos.y - 65)}px`,
            }}
          >
            <div className="word-tt-title">{hoveredWord.text}</div>
            <div className="word-tt-row">
              <span>Occurrences:</span>
              <strong>{hoveredWord.count.toLocaleString()} meals</strong>
            </div>
            <div className="word-tt-row">
              <span>Category:</span>
              <strong className={`tt-cat ${hoveredWord.dominantCategory.toLowerCase()}`}>
                {hoveredWord.dominantCategory}
              </strong>
            </div>
            <div className="word-tt-hint">
              {selectedWord === hoveredWord.text
                ? 'Click to remove filter'
                : 'Click to filter comments'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
