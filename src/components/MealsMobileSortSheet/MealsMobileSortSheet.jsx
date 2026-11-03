import React from 'react';
import { X, Check } from 'lucide-react';
import './MealsMobileSortSheet.css';

const SORT_OPTIONS = [
  { id: 'date_desc', title: 'Date (Most recent first)', desc: 'Show latest dining records first' },
  { id: 'date_asc', title: 'Date (Earliest first)', desc: 'Show oldest dining records first' },
  { id: 'rating_desc', title: 'Rating (Highest first)', desc: 'Show highest rated meals first' },
  { id: 'rating_asc', title: 'Rating (Lowest first)', desc: 'Show lowest rated meals first' },
  { id: 'name_asc', title: 'Restaurant (A → Z)', desc: 'Alphabetical by restaurant name' },
  { id: 'spend_desc', title: 'Meal Cost (Highest first)', desc: 'Show most expensive meals first' },
  { id: 'spend_asc', title: 'Meal Cost (Lowest first)', desc: 'Show least expensive meals first' },
];

export default function MealsMobileSortSheet({ isOpen, onClose, sortOption, onSelectSort }) {
  if (!isOpen) return null;

  return (
    <div className="meals-sort-backdrop" onClick={onClose}>
      <div
        className="meals-sort-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Sort Meals"
      >
        <div className="meals-sort-handle" />

        <div className="meals-sort-header">
          <h2 className="meals-sort-title">Sort Meals</h2>
          <button
            type="button"
            className="meals-sort-close-btn"
            onClick={onClose}
            aria-label="Close sort sheet"
          >
            <X size={18} />
          </button>
        </div>

        <div className="meals-sort-body">
          <div className="meals-sort-list">
            {SORT_OPTIONS.map((opt) => {
              const isSelected = sortOption === opt.id;
              return (
                <div
                  key={opt.id}
                  className={`meals-sort-row ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    onSelectSort(opt.id);
                    onClose();
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className={`meals-sort-radio ${isSelected ? 'checked' : ''}`}>
                    {isSelected && <div className="meals-sort-radio-inner" />}
                  </div>
                  <div className="meals-sort-text">
                    <span className="meals-sort-opt-title">{opt.title}</span>
                    <span className="meals-sort-opt-desc">{opt.desc}</span>
                  </div>
                  {isSelected && <Check size={16} className="meals-sort-check" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
