import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Search } from 'lucide-react';
import './MealsMobileSingleFilterSheet.css';

export default function MealsMobileSingleFilterSheet({
  isOpen,
  onClose,
  filterKey,
  title,
  selectedValues = [],
  options = [],
  onApply,
}) {
  const [draft, setDraft] = useState(selectedValues);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync draft when opened or selectedValues change
  useEffect(() => {
    if (isOpen) {
      setDraft(Array.isArray(selectedValues) ? [...selectedValues] : []);
      setSearchQuery('');
    }
  }, [isOpen, selectedValues]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Filter options by search query if applicable
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter((opt) =>
      (opt.label || opt.value || '').toLowerCase().includes(q)
    );
  }, [options, searchQuery]);

  if (!isOpen) return null;

  const handleToggle = (value) => {
    setDraft((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleClear = () => {
    setDraft([]);
  };

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  return (
    <div
      className="single-filter-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="single-filter-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Drag Handle */}
        <div className="single-filter-drag-handle-bar">
          <div className="single-filter-drag-handle" />
        </div>

        {/* Title Header */}
        <div className="single-filter-header">
          <h3 className="single-filter-title">{title}</h3>
          <button
            type="button"
            className="single-filter-close-btn"
            onClick={onClose}
            aria-label="Close filter"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search input if there are more than 8 options */}
        {options.length > 8 && (
          <div className="single-filter-search-box">
            <Search size={15} className="single-filter-search-icon" />
            <input
              type="text"
              className="single-filter-search-input"
              placeholder={`Search ${title.replace(/^Filter by\s+/i, '')}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="single-filter-search-clear"
                onClick={() => setSearchQuery('')}
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Checkbox List */}
        <div className="single-filter-list">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => {
              const isChecked = draft.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  className={`single-filter-row ${isChecked ? 'is-checked' : ''}`}
                  onClick={() => handleToggle(opt.value)}
                  role="checkbox"
                  aria-checked={isChecked}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      handleToggle(opt.value);
                    }
                  }}
                >
                  <div className={`single-filter-checkbox ${isChecked ? 'checked' : ''}`}>
                    {isChecked && <Check size={13} strokeWidth={3} />}
                  </div>
                  <span className="single-filter-label">{opt.label}</span>
                  {typeof opt.count === 'number' && (
                    <span className="single-filter-count">{opt.count}</span>
                  )}
                </div>
              );
            })
          ) : (
            <div className="single-filter-empty">
              <span>No matches found</span>
            </div>
          )}
        </div>

        {/* Action Footer matching Screenshot */}
        <div className="single-filter-footer">
          <button
            type="button"
            className="btn-single-filter-clear"
            onClick={handleClear}
          >
            Clear
          </button>
          <button
            type="button"
            className="btn-single-filter-apply"
            onClick={handleApply}
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
}
