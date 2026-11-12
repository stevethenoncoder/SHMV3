import React from 'react';
import shmLogoIcon from '../../assets/shm-logo-icon.png';
import shmLogoText from '../../assets/shm-logo-text.png';
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
            title="Stevie Holland Meals - Overview"
            aria-label="Stevie Holland Meals"
          >
            <img
              src={shmLogoIcon}
              alt="SHM Logo"
              className="brand-logo-icon"
            />
            <img
              src={shmLogoText}
              alt="Stevie Holland Meals"
              className="brand-logo-text"
            />
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
            className={`nav-link ${activeNav === 'people' ? 'active' : ''}`}
            onClick={() => onSelectNav && onSelectNav('people')}
          >
            People
          </button>
          <button
            type="button"
            className={`nav-link ${activeNav === 'relationships' ? 'active' : ''}`}
            onClick={() => onSelectNav && onSelectNav('relationships')}
          >
            Relationships
          </button>
          <button
            type="button"
            className={`nav-link ${activeNav === 'sentiment' ? 'active' : ''}`}
            onClick={() => onSelectNav && onSelectNav('sentiment')}
          >
            Sentiment
          </button>
          <button
            type="button"
            className={`nav-link ${activeNav === 'food' ? 'active' : ''}`}
            onClick={() => onSelectNav && onSelectNav('food')}
          >
            Food
          </button>
          <button
            type="button"
            className={`nav-link ${activeNav === 'places' ? 'active' : ''}`}
            onClick={() => onSelectNav && onSelectNav('places')}
          >
            Places
          </button>
          <button
            type="button"
            className={`nav-link ${activeNav === 'stats' ? 'active' : ''}`}
            onClick={() => onSelectNav && onSelectNav('stats')}
          >
            Stats
          </button>
          <button
            type="button"
            className={`nav-link ${activeNav === 'journey' ? 'active' : ''}`}
            onClick={() => onSelectNav && onSelectNav('journey')}
          >
            Journeys
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
