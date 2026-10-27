import React from 'react';
import { UtensilsCrossed } from 'lucide-react';
import './MealsHeader.css';

export default function MealsHeader({ activeNav = 'chronicle', onSelectNav }) {
  return (
    <header className="meals-header">
      <div className="header-inner">
        {/* Left: Brand Identity */}
        <div className="header-left">
          <button
            type="button"
            className="brand-link"
            onClick={() => onSelectNav && onSelectNav('chronicle')}
            title="Go to Chronicle"
          >
            <div className="brand-logo-badge">
              <UtensilsCrossed size={18} className="brand-icon" />
            </div>
            <div className="brand-text-col">
              <span className="brand-title">MEALS</span>
              <span className="brand-subtitle">1994 – 2026 Archive</span>
            </div>
          </button>
        </div>

        {/* Center: Primary Navigation */}
        <nav className="desktop-nav" aria-label="Main Navigation">
          <button
            type="button"
            className={`nav-link ${activeNav === 'chronicle' ? 'active' : ''}`}
            onClick={() => onSelectNav && onSelectNav('chronicle')}
          >
            Chronicle
          </button>
          <span className="nav-link disabled" title="Coming soon">
            Restaurants
          </span>
          <span className="nav-link disabled" title="Coming soon">
            Food
          </span>
          <span className="nav-link disabled" title="Coming soon">
            Places
          </span>
          <span className="nav-link disabled" title="Coming soon">
            Stats
          </span>
        </nav>

        {/* Right: Subtitle Tag */}
        <div className="header-right">
          <div className="archive-counter-pill">
            <span className="counter-dot" />
            <span>4,776 Meals</span>
          </div>
        </div>
      </div>
    </header>
  );
}
