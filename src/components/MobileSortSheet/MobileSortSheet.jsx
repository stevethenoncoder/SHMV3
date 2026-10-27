import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import './MobileSortSheet.css';

export default function MobileSortSheet({
  isOpen,
  onClose,
  sortOption,
  onSelectSort,
  locationLabel = 'County',
}) {
  if (!isOpen) return null;

  const [selectedOpt, setSelectedOpt] = useState(sortOption);

  useEffect(() => {
    setSelectedOpt(sortOption);
  }, [sortOption]);

  const sortOptions = [
    { id: 'name_asc', title: 'Name (A → Z)', desc: 'Alphabetical by place name' },
    { id: 'name_desc', title: 'Name (Z → A)', desc: 'Reverse alphabetical by place name' },
    { id: 'date_desc', title: 'Date (most recent)', desc: 'Show newest expedition dates first' },
    { id: 'date_asc', title: 'Date (earliest)', desc: 'Show oldest expedition dates first' },
    { id: 'location_asc', title: `${locationLabel} (A → Z)`, desc: `Alphabetical by ${locationLabel.toLowerCase()}` },
    { id: 'location_desc', title: `${locationLabel} (Z → A)`, desc: `Reverse alphabetical by ${locationLabel.toLowerCase()}` },
    { id: 'category_asc', title: 'Category (A → Z)', desc: 'Alphabetical by category name' },
    { id: 'category_desc', title: 'Category (Z → A)', desc: 'Reverse alphabetical by category name' },
    { id: 'rating_desc', title: 'Rating (highest first)', desc: 'Show highest rated places first' },
    { id: 'rating_asc', title: 'Rating (lowest first)', desc: 'Show lowest rated places first' },
  ];

  const handleSelect = (id) => {
    setSelectedOpt(id);
    onSelectSort(id);
  };

  const handleApply = () => {
    onSelectSort(selectedOpt);
    onClose();
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
        {/* Handle / Header */}
        <div className="sheet-handle-bar" />
        <div className="sheet-header">
          <h2 className="sheet-title">Sort Places</h2>
          <button type="button" className="sheet-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Sort Options List */}
        <div className="sheet-body">
          <div className="sort-radio-group">
            {sortOptions.map((opt) => {
              const isSelected = selectedOpt === opt.id;

              return (
                <div
                  key={opt.id}
                  className={`sort-option-row ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(opt.id)}
                >
                  <div className={`custom-radio ${isSelected ? 'checked' : ''}`}>
                    {isSelected && <div className="radio-inner-dot" />}
                  </div>
                  <div className="sort-text-wrap">
                    <span className="sort-option-title">{opt.title}</span>
                    <span className="sort-option-desc">{opt.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="sheet-footer">
          <button type="button" className="sheet-apply-btn" onClick={handleApply}>
            Apply Sort
          </button>
        </div>
      </div>
    </div>
  );
}
