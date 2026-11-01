import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { getRatingVisualInfo } from '../../../utils/sentimentAnalytics.js';
import './CommentsTable.css';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export default function CommentsTable({
  comments = [],
  searchQuery = '',
  onSearchChange,
  sortField = 'year',
  sortDirection = 'desc',
  onSortChange,
  selectedWord = null,
  onClearWord,
  onSelectWord,
  onSelectMeal,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Reset page when comments count, search, or sort changes
  useMemo(() => {
    setCurrentPage(1);
  }, [comments.length, searchQuery, sortField, sortDirection]);

  const totalComments = comments.length;
  const totalPages = Math.max(1, Math.ceil(totalComments / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedComments = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return comments.slice(startIndex, startIndex + pageSize);
  }, [comments, validCurrentPage, pageSize]);

  const handleHeaderClick = (field) => {
    if (!onSortChange) return;
    if (sortField === field) {
      onSortChange(field, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, field === 'year' || field === 'rating' ? 'desc' : 'asc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} className="sort-icon-inactive" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={12} className="sort-icon-active" />
    ) : (
      <ArrowDown size={12} className="sort-icon-active" />
    );
  };

  return (
    <div className="stats-card comments-table-card">
      {/* Table Header and Toolbar */}
      <div className="comments-table-top-bar">
        <div className="comments-table-title-area">
          <div className="comments-title-row">
            <h3 className="comments-title">Meal Comments</h3>
            <span className="comments-count-pill">
              {totalComments.toLocaleString()} {totalComments === 1 ? 'comment' : 'comments'}
            </span>
          </div>
          <p className="comments-subtitle">
            Compact review history with restaurant, city and year context
          </p>
        </div>

        {/* Search Input */}
        <div className="comments-search-box">
          <Search size={14} className="comments-search-icon" />
          <input
            type="text"
            className="comments-search-input"
            placeholder="Search comments, restaurants, cities..."
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="comments-search-clear"
              onClick={() => onSearchChange && onSearchChange('')}
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Filter indicator banner if active */}
      {selectedWord && (
        <div className="comments-filter-indicator">
          <span>
            Filtered by sentiment: <strong>"{selectedWord}"</strong>
          </span>
          <button
            type="button"
            className="indicator-clear-btn"
            onClick={() => onClearWord && onClearWord()}
          >
            <X size={12} />
            Show all sentiments
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="comments-table-wrapper">
        <table className="comments-compact-table">
          <thead>
            <tr>
              <th
                className={`th-comment ${sortField === 'comment' ? 'sorted' : ''}`}
                onClick={() => handleHeaderClick('comment')}
              >
                <div className="th-content">
                  <span>Comment</span>
                  {renderSortIcon('comment')}
                </div>
              </th>
              <th
                className={`th-rating ${sortField === 'rating' ? 'sorted' : ''}`}
                onClick={() => handleHeaderClick('rating')}
              >
                <div className="th-content">
                  <span>Rating</span>
                  {renderSortIcon('rating')}
                </div>
              </th>
              <th
                className={`th-sentiment ${sortField === 'sentiment' ? 'sorted' : ''}`}
                onClick={() => handleHeaderClick('sentiment')}
              >
                <div className="th-content">
                  <span>Sentiment</span>
                  {renderSortIcon('sentiment')}
                </div>
              </th>
              <th
                className={`th-restaurant ${sortField === 'restaurant' ? 'sorted' : ''}`}
                onClick={() => handleHeaderClick('restaurant')}
              >
                <div className="th-content">
                  <span>Restaurant</span>
                  {renderSortIcon('restaurant')}
                </div>
              </th>
              <th
                className={`th-city ${sortField === 'city' ? 'sorted' : ''}`}
                onClick={() => handleHeaderClick('city')}
              >
                <div className="th-content">
                  <span>City</span>
                  {renderSortIcon('city')}
                </div>
              </th>
              <th
                className={`th-year ${sortField === 'year' ? 'sorted' : ''}`}
                onClick={() => handleHeaderClick('year')}
              >
                <div className="th-content">
                  <span>Year</span>
                  {renderSortIcon('year')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedComments.length > 0 ? (
              paginatedComments.map((m, idx) => {
                const restName = m.restaurant?.name || 'Unknown Restaurant';
                const cityName = m.restaurant?.city?.name || '—';
                const yearVal = m.year || (m.date ? new Date(m.date).getFullYear() : '—');
                const sentimentTag = m.sentiment ? m.sentiment.trim() : null;
                const ratingInfo = getRatingVisualInfo(m.rating, m.ratingId);

                return (
                  <tr key={m.id || `comment-${idx}`} className="comments-row">
                    <td className="td-comment" title={m.comment}>
                      <button
                        type="button"
                        className="comment-text-link"
                        onClick={() => onSelectMeal && onSelectMeal(m.id)}
                        title={`Click to view meal overview: "${m.comment}"`}
                      >
                        {m.comment}
                      </button>
                    </td>
                    <td className="td-rating">
                      <div
                        className="rating-visual-meter"
                        title={`Rating: ${ratingInfo.label} (${ratingInfo.level}/8)`}
                      >
                        <div className="rating-pips-track">
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((pip) => (
                            <span
                              key={pip}
                              className={`rating-pip ${
                                pip <= ratingInfo.level ? 'is-filled' : 'is-empty'
                              }`}
                              style={{
                                backgroundColor:
                                  pip <= ratingInfo.level ? ratingInfo.color : '#e2e8f0',
                              }}
                            />
                          ))}
                        </div>
                        <span
                          className="rating-visual-score"
                          style={{
                            color: ratingInfo.level > 0 ? ratingInfo.color : '#94a3b8',
                          }}
                        >
                          {ratingInfo.level > 0 ? ratingInfo.level : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="td-sentiment">
                      {sentimentTag ? (
                        <button
                          type="button"
                          className={`sentiment-table-tag ${
                            m.sentimentCategory
                              ? m.sentimentCategory.toLowerCase()
                              : 'neutral'
                          } ${
                            selectedWord?.toLowerCase() === sentimentTag.toLowerCase()
                              ? 'active'
                              : ''
                          }`}
                          onClick={() =>
                            onSelectWord &&
                            onSelectWord(
                              selectedWord?.toLowerCase() === sentimentTag.toLowerCase()
                                ? null
                                : sentimentTag
                            )
                          }
                          title={`Click to filter by "${sentimentTag}"`}
                        >
                          {sentimentTag}
                        </button>
                      ) : (
                        <span className="sentiment-table-empty">—</span>
                      )}
                    </td>
                    <td className="td-restaurant">
                      <span className="restaurant-name-text" title={restName}>
                        {restName}
                      </span>
                    </td>
                    <td className="td-city">
                      <span className="city-text">{cityName}</span>
                    </td>
                    <td className="td-year">
                      <span className="year-badge">{yearVal}</span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="comments-empty-cell">
                  <div className="comments-empty-state">
                    <MessageSquare size={28} className="empty-icon" />
                    <p className="empty-title">No comments found</p>
                    <p className="empty-desc">
                      Try clearing the search or choosing different sentiment categories.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalComments > 0 && (
        <div className="comments-table-footer">
          <div className="pagination-range-text">
            Showing{' '}
            <strong>
              {((validCurrentPage - 1) * pageSize + 1).toLocaleString()}
            </strong>{' '}
            to{' '}
            <strong>
              {Math.min(validCurrentPage * pageSize, totalComments).toLocaleString()}
            </strong>{' '}
            of <strong>{totalComments.toLocaleString()}</strong> comments
          </div>

          <div className="pagination-controls-group">
            <div className="page-size-selector">
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="page-size-select"
              >
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="page-nav-btns">
              <button
                type="button"
                className="page-nav-btn"
                disabled={validCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                title="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="page-status-text">
                Page {validCurrentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="page-nav-btn"
                disabled={validCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                title="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
