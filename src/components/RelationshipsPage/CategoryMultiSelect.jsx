import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, X, RotateCcw } from 'lucide-react';
import './RelationshipsPage.css';

export default function CategoryMultiSelect({
  side = 'left',
  category,
  onCategoryChange,
  availableCategories = [],
  options = [],
  selectedValues = [],
  onSelectionChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const popoverRef = useRef(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter((opt) => opt.name.toLowerCase().includes(q));
  }, [options, searchQuery]);

  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);

  const handleToggle = (name) => {
    if (selectedSet.has(name)) {
      onSelectionChange(selectedValues.filter((v) => v !== name));
    } else {
      onSelectionChange([...selectedValues, name]);
    }
  };

  const handleSelectAll = () => {
    const all = options.map((o) => o.name);
    onSelectionChange(all);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const handleSelectTop = (n = 6) => {
    const topN = options.slice(0, n).map((o) => o.name);
    onSelectionChange(topN);
  };

  // Button label summary
  const summaryLabel = useMemo(() => {
    if (selectedValues.length === 0) return 'None selected';
    if (selectedValues.length === options.length && options.length > 0) {
      return `All ${options.length} selected`;
    }
    if (selectedValues.length <= 2) {
      return selectedValues.join(', ');
    }
    return `${selectedValues.length} of ${options.length} selected`;
  }, [selectedValues, options.length]);

  return (
    <div className={`category-multi-select-card side-${side}`}>
      {/* 1. Category Selector Header */}
      <div className="select-card-header">
        <span className="select-side-badge">
          {side === 'left' ? 'Left Dimension' : 'Right Dimension'}
        </span>
        <div className="category-dropdown-wrap">
          <label className="select-label" htmlFor={`cat-select-${side}`}>
            Category:
          </label>
          <select
            id={`cat-select-${side}`}
            className="category-native-select"
            value={category.key}
            onChange={(e) => {
              const next = availableCategories.find((c) => c.key === e.target.value);
              if (next) onCategoryChange(next);
            }}
          >
            {availableCategories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Items Multi-select Trigger Popover */}
      <div className="items-popover-anchor" ref={popoverRef}>
        <button
          type="button"
          className={`items-trigger-btn ${isOpen ? 'active' : ''}`}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <div className="trigger-text-col">
            <span className="trigger-caption">{category.singular} Selection:</span>
            <span className="trigger-value" title={summaryLabel}>
              {summaryLabel}
            </span>
          </div>
          <ChevronDown
            size={16}
            className={`trigger-chevron ${isOpen ? 'rotate' : ''}`}
          />
        </button>

        {isOpen && (
          <div className="items-popover-dropdown" role="dialog">
            {/* Search Input */}
            <div className="popover-search-wrap">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                className="popover-search-input"
                placeholder={`Filter ${category.label.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Quick Action Presets */}
            <div className="popover-actions-bar">
              <button
                type="button"
                className="action-btn"
                onClick={() => handleSelectTop(6)}
                title="Select top 6 most frequent"
              >
                Top 6
              </button>
              <button
                type="button"
                className="action-btn"
                onClick={() => handleSelectTop(10)}
                title="Select top 10 most frequent"
              >
                Top 10
              </button>
              <button
                type="button"
                className="action-btn"
                onClick={() => handleSelectTop(20)}
                title="Select top 20 most frequent"
              >
                Top 20
              </button>
              <button
                type="button"
                className="action-btn"
                onClick={() => handleSelectTop(100)}
                title="Select top 100 most frequent"
              >
                Top 100
              </button>
              <button
                type="button"
                className="action-btn"
                onClick={handleSelectAll}
                title="Select all entries"
              >
                All ({options.length})
              </button>
              <button
                type="button"
                className="action-btn clear"
                onClick={handleClearAll}
                title="Clear all selections"
              >
                Clear
              </button>
            </div>

            {/* Checkbox Options List */}
            <div className="popover-list" role="listbox">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const isChecked = selectedSet.has(opt.name);
                  return (
                    <label
                      key={opt.name}
                      className={`popover-item ${isChecked ? 'is-selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        className="item-checkbox"
                        checked={isChecked}
                        onChange={() => handleToggle(opt.name)}
                      />
                      <span className="item-name" title={opt.name}>
                        {opt.name}
                      </span>
                      <span className="item-count-badge">{opt.count}</span>
                    </label>
                  );
                })
              ) : (
                <div className="popover-empty">No entries match your search</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
