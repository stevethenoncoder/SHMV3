import React from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import './Pagination.css';

export default function Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}) {
  const safeTotalPages = Math.max(1, totalPages);

  return (
    <div className="pagination-bar">
      {/* Items per page selector */}
      <div className="page-size-selector">
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="page-size-select"
        >
          <option value={9}>9 per page</option>
          <option value={18}>18 per page</option>
          <option value={27}>27 per page</option>
          <option value={36}>36 per page</option>
        </select>
        <ChevronDown size={14} className="select-arrow" />
      </div>

      {/* Page navigation */}
      <div className="page-nav">
        <button
          type="button"
          className="page-nav-btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        <span className="page-indicator">
          Page {currentPage} of {safeTotalPages}
        </span>

        <button
          type="button"
          className="page-nav-btn"
          disabled={currentPage >= safeTotalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
