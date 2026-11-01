import React from 'react';
import { UtensilsCrossed } from 'lucide-react';
import './MealsHeader.css';

export default function MealsHeader({
  activeNav = 'overview',
  onSelectNav,
  mealCount = 4776,
  restaurantCount = 3051,
}) {
  return (
    <header className="meals-header">
      <div className="header-inner">
        {/* Left: Brand Identity */}
        <div className="header-left">
          <button
            type="button"
            className="brand-link"
            onClick={() => onSelectNav && onSelectNav('overview')}
            title="Go to Overview"
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
            className={`nav-link ${activeNav === 'overview' ? 'active' : ''}`}
            onClick={() => onSelectNav && onSelectNav('overview')}
          >
            Overview
          </button>
          <button
            type="button"
            className={`nav-link ${activeNav === 'chronicle' ? 'active' : ''}`}
            onClick={() => onSelectNav && onSelectNav('chronicle')}
          >
            Chronicle
          </button>
          <button
            type="button"
            className={`nav-link ${activeNav === 'restaurants' ? 'active' : ''}`}
            onClick={() => onSelectNav && onSelectNav('restaurants')}
          >
            Restaurants
          </button>
          <button
            type="button"
            className={`nav-link ${activeNav === 'relationships' ? 'active' : ''}`}
            onClick={() => onSelectNav && onSelectNav('relationships')}
          >
            Relationships
          </button>
          <span className="nav-link disabled" title="Coming soon">
            Food
          </span>
          <span className="nav-link disabled" title="Coming soon">
            Places
          </span>
          <button
            type="button"
            className={`nav-link ${activeNav === 'stats' ? 'active' : ''}`}
            onClick={() => onSelectNav && onSelectNav('stats')}
          >
            Stats
          </button>
        </nav>

        {/* Right: Counter Pill */}
        <div className="header-right">
          <div className="archive-counter-pill">
            <span className="counter-dot" />
            <span>
              {activeNav === 'restaurants'
                ? `${restaurantCount.toLocaleString()} Restaurants`
                : `${mealCount.toLocaleString()} Meals`}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
