import React from 'react';
import './PlaceholderPage.css';

export default function PlaceholderPage({ title, description, onBackToExplorer }) {
  return (
    <div className="placeholder-page">
      <div className="placeholder-card">
        <h2>{title}</h2>
        <p className="placeholder-desc">{description}</p>
        <div className="placeholder-note">
          This route is reserved for Milestone 4 development.
        </div>
        <button type="button" className="placeholder-btn" onClick={onBackToExplorer}>
          Return to Blogs
        </button>
      </div>
    </div>
  );
}
