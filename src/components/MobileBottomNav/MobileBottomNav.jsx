import React from 'react';
import { Compass, BarChart2, MapPin, Tag, Info } from 'lucide-react';
import './MobileBottomNav.css';

export default function MobileBottomNav({ activeNav, onSelectNav, locationLabel, locationLabelPlural }) {
  const locTitle = locationLabelPlural || (locationLabel ? `${locationLabel}s` : 'Counties');

  return (
    <nav className="mobile-bottom-nav">
      <button
        type="button"
        className={`bottom-nav-item ${activeNav === 'explorer' ? 'active' : ''}`}
        onClick={() => onSelectNav('explorer')}
      >
        <div className="icon-wrapper">
          <Compass size={18} />
        </div>
        <span>Blogs</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${activeNav === 'stats' ? 'active' : ''}`}
        onClick={() => onSelectNav('stats')}
      >
        <div className="icon-wrapper">
          <BarChart2 size={18} />
        </div>
        <span>Stats</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${activeNav === 'locations' ? 'active' : ''}`}
        onClick={() => onSelectNav('locations')}
      >
        <div className="icon-wrapper">
          <MapPin size={18} />
        </div>
        <span>{locTitle}</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${activeNav === 'categories' ? 'active' : ''}`}
        onClick={() => onSelectNav('categories')}
      >
        <div className="icon-wrapper">
          <Tag size={18} />
        </div>
        <span>Categories</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${activeNav === 'about' ? 'active' : ''}`}
        onClick={() => onSelectNav('about')}
      >
        <div className="icon-wrapper">
          <Info size={18} />
        </div>
        <span>About</span>
      </button>
    </nav>
  );
}
